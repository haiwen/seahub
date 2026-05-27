import os
import shutil

import json
import logging
import requests
import uuid
from zipfile import ZipFile
from io import BytesIO
from pathlib import Path
from bs4 import BeautifulSoup

from sqlalchemy.sql import text
from seaserv import seafile_api
from seahub_io.server.utils import save_wiki_config, gen_new_page_nav_by_id, gen_unique_id, \
    md5_repo_id_parent_path
from seahub_io.wiki.utils import gen_file_get_url, gen_inner_file_get_url, get_wiki_config, gen_file_upload_url, \
    get_all_wiki_ids, convert_confluence_to_wiki
from seahub_io.utils.constants import PREVIEW_FILEEXT, WIKI_PAGES_DIR


logger = logging.getLogger('seahub_io')


def import_confluence_to_wiki_main(session, repo_id, space_key, file_path, username, seafile_server_url):
    try:
        # extract html zip
        extract_dir = '/tmp/wiki'
        if not os.path.exists(extract_dir):
            os.mkdir(extract_dir)
        space_dir, zip_file_path = extract_html_zip(file_path, extract_dir, space_key)
        download_url, upload_url = upload_zip_file(repo_id, zip_file_path, username)
    except Exception as e:
        raise e

    try:
        filename = os.path.basename(file_path)
        result = json.loads(convert_confluence_to_wiki(filename, download_url, upload_url, username, seafile_server_url))
        if result.get('error_msg'):
            return False
        cf_id_to_cf_title_map = result.get('cf_id_to_cf_title_map')
    except Exception as e:
        raise e
    
    try:
        sdoc_output_dir = download_sdoc_files(repo_id, space_dir, username)
        if sdoc_output_dir:
            sdoc_files = list(Path(sdoc_output_dir).glob('*.sdoc'))
            process_zip_file(session, repo_id, space_dir, sdoc_files, cf_id_to_cf_title_map, username)
            # delete server tmp dir
            seafile_api.del_file(repo_id, '/',
                                json.dumps(['tmp']), username)
            # clean repo trash
            seafile_api.clean_up_repo_history(repo_id, 0)
    except Exception as e:
        raise e
    


def upload_zip_file(repo_id, zip_file_path, username):
        server_wiki_tmp_dir = 'tmp/'
        seafile_api.mkdir_with_parents(repo_id, '/', server_wiki_tmp_dir, username)
        obj_id = json.dumps({'parent_dir': server_wiki_tmp_dir})
        token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'upload', username, use_onetime=False)
        
        if not token:
            error_msg = 'Internal Server Error'
            raise Exception(error_msg)

        upload_link = gen_file_upload_url(token, 'upload-api')
        upload_link += '?ret-json=1'
        zip_file_name = os.path.basename(zip_file_path)
        new_file_path = os.path.normpath(os.path.join(server_wiki_tmp_dir, zip_file_name))
        data = {'parent_dir': server_wiki_tmp_dir}
        files = {'file': open(zip_file_path, 'rb')}
        resp = requests.post(upload_link, files=files, data=data)
        if not resp.ok:
            logger.error(resp.text)
            raise Exception(resp.text)

        file_id = seafile_api.get_file_id_by_path(repo_id, new_file_path)
        download_token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username)
        download_url = gen_file_get_url(download_token, zip_file_name)
        return download_url, upload_link

def extract_html_zip(zip_file_path, extract_dir, space_key):
    space_dir = os.path.normpath(os.path.join(extract_dir, space_key))
    zip_file_name = os.path.basename(zip_file_path)
    try:
        with ZipFile(zip_file_path, 'r') as zip_ref:
            all_entries = zip_ref.infolist()
            zip_ref.extractall(extract_dir)
            if all_entries:
                first_entry = all_entries[1].filename
                top_dir = first_entry.split('/')[0] if '/' in first_entry else None
                if top_dir and top_dir != space_key:
                    old_path = os.path.normpath(os.path.join(extract_dir, top_dir))
                    if not old_path.startswith(extract_dir):
                        raise ValueError("Extraction path is outside the allowed directory")
                    if os.path.exists(space_dir):
                        shutil.rmtree(space_dir)
                    if os.path.exists(old_path):
                        os.rename(old_path, space_dir)
    except Exception as e:
        logger.error(f"extract {zip_file_path} error: {e}")
        return False
    
    try:
        zip_file_path = os.path.normpath(os.path.join(space_dir, zip_file_name))
        if not zip_file_path.startswith(os.path.abspath(space_dir)):
            raise ValueError("File path is outside the allowed directory")
        with ZipFile(zip_file_path, 'w') as zip_ref:
            for root, _, files in os.walk(space_dir):
                for file in files:
                    if file.endswith(".html"):
                        file_path = os.path.join(root, file)
                        zip_ref.write(file_path, os.path.relpath(file_path, space_dir))
    except Exception as e:
        logger.error(e)
        raise Exception(e)
    return space_dir, zip_file_path


def download_sdoc_files(repo_id, space_dir, username):
    server_wiki_tmp_sdoc_output_dir = 'tmp/sdoc_archive.zip'
    file_id = seafile_api.get_file_id_by_path(repo_id, server_wiki_tmp_sdoc_output_dir)
    if not file_id:
        return None
    download_token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username)
    download_url = gen_inner_file_get_url(download_token, 'sdoc_archive.zip')
        
    response = requests.get(download_url)
    if response.status_code != 200:
        logger.error(f"Failed to download zip file: HTTP {response.status_code}")
        return None

    output_dir = os.path.join(space_dir, 'sdoc-output')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with ZipFile(BytesIO(response.content), 'r') as zip_ref:
        all_entries = zip_ref.infolist()
        logger.info(f"Zip file contains {len(all_entries)} entries")
        zip_ref.extractall(output_dir)
    return output_dir

def process_zip_file(session, wiki_id, space_dir, sdoc_files, cf_id_to_cf_title_map, username):
    dir_path = Path(space_dir).resolve()
    level_html = None
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.html') and file == 'index.html':
                level_html = Path(root) / file
    
    wiki_config = get_wiki_config(wiki_id, username)
    cf_page_id_to_sf_page_id_map = {}
    cf_page_id_to_sf_obj_id_map = {}
    file_uuid_map_data = {}
    file_maps_to_create = []
    for sdoc_file in sdoc_files:
        filename = os.path.basename(sdoc_file)
        sdoc_uuid = uuid.uuid4()
        parent_dir = os.path.join(WIKI_PAGES_DIR, str(sdoc_uuid))
        file_uuid_map_data[sdoc_uuid] = (filename, sdoc_file, parent_dir)
        file_uuid_sql_data = {
            'uuid': sdoc_uuid, 
            'repo_id': wiki_id, 
            'parent_path': parent_dir, 
            'filename': filename, 
            'is_dir': False }
        file_maps_to_create.append(file_uuid_sql_data)

        path_md5 = md5_repo_id_parent_path(wiki_id, parent_dir)
        sql = text('''
            INSERT INTO tags_fileuuidmap (
                `uuid`, `repo_id`, `parent_path`, `filename`, `repo_id_parent_path_md5`, `is_dir`
            ) VALUES (
                :uuid, :repo_id, :parent_path, :filename, :md5, :is_dir
            )
        ''')

        session.execute(sql, {
            'uuid': sdoc_uuid.hex,
            'repo_id': wiki_id,
            'parent_path': parent_dir,
            'filename': filename,
            'md5': path_md5,
            'is_dir': False
        })
    session.commit()
    for sdoc_uuid, item in file_uuid_map_data.items():
        page_name_to_id_map, page_name_to_obj_id_map, wiki_config = process_page(wiki_id, item, wiki_config, sdoc_uuid, username, cf_id_to_cf_title_map)
        if page_name_to_id_map:
            cf_page_id_to_sf_page_id_map.update(page_name_to_id_map)
        if page_name_to_obj_id_map:
            cf_page_id_to_sf_obj_id_map.update(page_name_to_obj_id_map)

    # handle page level
    navigation = handle_page_level(level_html, cf_page_id_to_sf_page_id_map)
    wiki_config['navigation'] = navigation
    wiki_config = json.dumps(wiki_config)
    save_wiki_config(wiki_id, username, wiki_config)

    # handle attachment
    attachment_dir = os.path.normpath(os.path.join(space_dir, 'attachments'))
    image_dir = os.path.normpath(os.path.join(space_dir, 'images/'))
    exist_attachment_dir = os.path.exists(attachment_dir)
    exist_image_dir = os.path.exists(image_dir)
    exist_dir = []
    try:
        if exist_image_dir:
            upload_cf_images(wiki_id, image_dir, username, exist_dir)
        if exist_attachment_dir:
            upload_attachment(cf_page_id_to_sf_obj_id_map, attachment_dir, wiki_id, username, exist_dir)
        if os.path.exists(space_dir):
            shutil.rmtree(space_dir)
    except Exception as e:
        logger.error(e)

def handle_page_level(level_html, cf_page_id_to_sf_page_id_map):
    result = []
    try:
        with open(level_html, 'r', encoding='utf-8') as f:
            html_content = f.read()
        soup = BeautifulSoup(html_content, 'html.parser')
        ul_element = soup.find('ul')
        if not ul_element:
            logger.warning(f"not found page level: {level_html}")
            return result
        result = parse_ul_structure(ul_element, cf_page_id_to_sf_page_id_map)
    except Exception as e:
        logger.error(f"handle page level error: {e}")
    
    return result

def parse_ul_structure(ul_element, cf_page_id_to_sf_page_id_map):
    result = []
    li = ul_element.find_all('li', recursive=False)[0]
    a_tag = li.find('a')
    if not a_tag:
        return []
    href = a_tag.get('href', '')
    page_name = a_tag.get_text().strip()
    page_key = href.split('.')[0] if href else None
    page_id = cf_page_id_to_sf_page_id_map.get(page_key)
    
    if not page_id:
        page_id = cf_page_id_to_sf_page_id_map.get(page_name)
        if not page_id:
            logger.warning(f"not found page id: {page_name}, href: {href}")
    
    sub_uls = li.find_all('ul', recursive=False)
    children = []
    if sub_uls:
        for sub_ul in sub_uls:
            # recursively process sub ul
            sub_result = parse_ul_structure(sub_ul, cf_page_id_to_sf_page_id_map)
            if sub_result:
                children.extend(sub_result)
        if not page_id and children:
            result.extend(children)
            return result
    if page_id:
        page_node = {
            "id": page_id,
            "type": "page"
        }
        if sub_uls and children:
            page_node["children"] = children
        result.append(page_node)
    else:
        return []
    
    return result

def process_page(wiki_id, item, wiki_config, sdoc_uuid, username, cf_id_to_cf_title_map):
    filename = item[0]
    sdoc_file = item[1]
    parent_dir = item[2]
    cf_page_id = filename.split('.')[0]
    cf_page_title = cf_id_to_cf_title_map.get(cf_page_id)
    if not cf_page_title:
        cf_page_title = cf_page_id
    
    navigation = wiki_config.get('navigation', [])
    # side panel create page
    pages = wiki_config.get('pages', [])
    page_name = cf_page_title

    file_path = os.path.join(parent_dir, filename)

    # update wiki_config
    id_set = get_all_wiki_ids(navigation)
    new_page_id = gen_unique_id(id_set)
    gen_new_page_nav_by_id(navigation, new_page_id, None)

    try:
        seafile_api.mkdir_with_parents(wiki_id, '/', parent_dir.strip('/'), username)
    except Exception as e:
        logger.error(e)
        error_msg = 'Internal Server Error'
        raise Exception(error_msg)
    
    # upload file
    try:
        obj_id = json.dumps({'parent_dir': parent_dir})
        upload_file(wiki_id, parent_dir, sdoc_file, obj_id, username, page_name)
    except Exception as e:
        if str(e) == 'Too many files in library.':
            error_msg = "The number of files in library exceeds the limit"
            raise Exception(error_msg)
        else:
            logger.error(e)
            error_msg = 'Internal Server Error'
            raise Exception(error_msg)
    try:
        page_name_to_id_map = {
            page_name: new_page_id
        }
        # The attachment directory only contains numbers
        if '_' in cf_page_id:
            cf_page_id = cf_page_id.split('_')[-1]
        page_name_to_obj_id_map = {
            cf_page_id: str(sdoc_uuid)
        }
        new_page = {
            'id': new_page_id,
            'name': page_name,
            'path': file_path,
            'icon': '',
            'docUuid': str(sdoc_uuid),
            'locked': False
        }
        pages.append(new_page)

        if len(wiki_config) == 0:
            wiki_config['version'] = 1

        wiki_config['navigation'] = navigation
        wiki_config['pages'] = pages
        return page_name_to_id_map, page_name_to_obj_id_map, wiki_config
    except Exception as e:
        logger.error(e)
        return None, None, wiki_config


def upload_file(repo_id, parent_dir, sdoc_file, obj_id, username, page_name):
    try:
        token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'upload', username, use_onetime=False)
    except Exception as e:
        if str(e) == 'Too many files in library.':
            error_msg = "The number of files in library exceeds the limit"
            raise error_msg
        else:
            logger.error(e)
            error_msg = 'Internal Server Error'
            raise error_msg

    if not token:
        error_msg = 'Internal Server Error'
        raise error_msg
    
    upload_link = gen_file_upload_url(token, 'upload-api')
    upload_link += '?ret-json=1'
    filename = f'{page_name}.sdoc'
    new_file_path = os.path.join(parent_dir, filename)
    new_file_path = os.path.normpath(new_file_path)
    
    data = {'parent_dir': parent_dir}
    files = {'file': open(sdoc_file, 'rb')}
    resp = requests.post(upload_link, files=files, data=data)
    if not resp.ok:
        logger.error('save file: %s failed: %s' % (filename, resp.text))
        return False


def upload_attachment(cf_page_id_to_sf_obj_id_map, attachment_dir, wiki_id, username, exist_dir):
    # Image need to be uploaded to the appropriate sdoc directory in seafile
    attachment_dir = Path(attachment_dir).resolve()
    # Create the attachment directory in the wiki library
    wiki_attachment_dir = 'attachments'
    # Traverse all subdirectories and files in the attachment directory
    for root, _, files in os.walk(attachment_dir):
        # Get the relative path as the upload target path
        rel_path = os.path.relpath(root, attachment_dir)
        
        # Process the files in the current directory
        if files:
            # Set the target directory
            if rel_path == '.':
                target_dir = wiki_attachment_dir
            else:
                target_dir = os.path.join(wiki_attachment_dir, rel_path)
            
            # Get the obj_id of the page corresponding to the current directory
            page_name = os.path.basename(rel_path) if rel_path != '.' else None
            obj_id = cf_page_id_to_sf_obj_id_map.get(page_name)
            # Upload all files in the current directory
            for file_name in files:
                file_path = os.path.join(root, file_name)
                if not os.path.isfile(file_path):
                    continue
                file_ext = file_name.split('.')[-1]
                is_image = file_ext in PREVIEW_FILEEXT.get('IMAGE')
                if is_image and obj_id:
                    wiki_page_images_dir = 'images/sdoc/'
                    sdoc_image_dir = os.path.join(wiki_page_images_dir, obj_id)

                    if sdoc_image_dir not in exist_dir:
                        seafile_api.mkdir_with_parents(wiki_id, '/', sdoc_image_dir, username)
                        exist_dir.append(sdoc_image_dir)
                    upload_attachment_file(wiki_id, sdoc_image_dir, file_path, username)
                else:   
                    # other files
                    if target_dir not in exist_dir:
                        seafile_api.mkdir_with_parents(wiki_id, '/', target_dir, username)
                        exist_dir.append(target_dir)
                    upload_attachment_file(wiki_id, target_dir, file_path, username)

def upload_cf_images(wiki_id, image_dir, username, exist_dir):
    wiki_images_dir = 'images/'
    if os.path.exists(image_dir):
        for root, _, files in os.walk(image_dir):
            rel_path = os.path.relpath(root, image_dir)
            if rel_path == '.':
                target_dir = wiki_images_dir
            else:
                target_dir = os.path.join(wiki_images_dir, rel_path)
            if target_dir not in exist_dir:
                seafile_api.mkdir_with_parents(wiki_id, '/', target_dir, username)
                exist_dir.append(target_dir)
            for file in files:
                file_path = os.path.join(root, file)
                upload_attachment_file(wiki_id, target_dir, file_path, username)

def upload_attachment_file(repo_id, parent_dir, file_path, username):
        try:
            obj_id = json.dumps({'parent_dir': parent_dir})
            token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'upload', username, use_onetime=False)
            
            if not token:
                error_msg = 'Internal Server Error'
                logger.error(error_msg)
                return
            upload_link = gen_file_upload_url(token, 'upload-api')
            upload_link += '?ret-json=1'
            
            filename = os.path.basename(file_path)
            new_file_path = os.path.join(parent_dir, filename)
            new_file_path = os.path.normpath(new_file_path)
            
            data = {'parent_dir': parent_dir, 'target_file': new_file_path}
            files = {'file': open(file_path, 'rb')}
            
            resp = requests.post(upload_link, files=files, data=data)
            if not resp.ok:
                logger.error(f"upload file {filename} failed: {resp.text}")
        except Exception as e:
            logger.error(f"upload file {file_path} failed: {e}")
        finally:
            if 'files' in locals() and files.get('file') and not files['file'].closed:
                files['file'].close()
