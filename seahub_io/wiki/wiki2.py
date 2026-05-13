import os

import json
import requests
import logging
from pathlib import Path

from sqlalchemy.sql import text
from seahub_io.wiki.utils import gen_file_get_url, get_wiki_config, gen_file_upload_url, \
    convert_file, gen_new_page_nav_by_id, delete_wiki_page_dir
from seaserv import seafile_api
from seahub_io.server.utils import save_wiki_config, md5_repo_id_parent_path
from seahub_io.utils.constants import WIKI_PAGES_DIR

logger = logging.getLogger(__name__)


def import_wiki_page(session, repo_id, local_file_path, username, page_id, page_name, sdoc_uuid_str, from_page_id):
    extension = Path(local_file_path).suffix
    parent_dir = os.path.join(WIKI_PAGES_DIR, sdoc_uuid_str)
    filename = os.path.basename(local_file_path)
    file_path = os.path.join(parent_dir, filename)
    
    path_md5 = md5_repo_id_parent_path(repo_id, parent_dir)
    try:
        sdoc_filename = f'{filename.split(extension)[0]}.sdoc'
        sql = text('''
            INSERT INTO tags_fileuuidmap (
                `uuid`, `repo_id`, `parent_path`, `filename`, `repo_id_parent_path_md5`, `is_dir`
            ) VALUES (
                :uuid, :repo_id, :parent_path, :filename, :md5, :is_dir
            )
        ''')

        session.execute(sql, {
            'uuid': sdoc_uuid_str.replace('-', ''),
            'repo_id': repo_id,
            'parent_path': parent_dir,
            'filename': sdoc_filename,
            'md5': path_md5,
            'is_dir': False
        })
        session.commit()
    except Exception as e:
        raise e

    dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
    if not dir_id:
        seafile_api.mkdir_with_parents(repo_id, '/', parent_dir.strip('/'), username)

    obj_id = json.dumps({'parent_dir': parent_dir})
    try:
        token = seafile_api.get_fileserver_access_token(repo_id,
                obj_id, 'upload', username, use_onetime=False)
    except Exception as e:
        raise e
    
    if not token:
        error_msg = 'Internal Server Error'
        raise Exception(error_msg)
    
    upload_link = gen_file_upload_url(token, 'upload-api')
    upload_link += '?ret-json=1'
    if extension == '.md' or extension == '.docx':
        src_type = 'docx' if extension == '.docx' else 'markdown'
        files = {'file': open(local_file_path, 'rb')}
        data = {'parent_dir': parent_dir, 'replace': 1}
        resp = requests.post(upload_link, files=files, data=data)
        if not resp.ok:
            raise BaseException('Save file: %s failed: %s' % (filename, resp.text))
        file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        download_token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username)
        download_url = gen_file_get_url(download_token, filename)

        resp = convert_file(file_path, username, sdoc_uuid_str, download_url, upload_link, src_type, 'sdoc')
        status_code = resp.status_code
        if status_code != 200:
            delete_wiki_page_dir(repo_id, parent_dir, username)
            raise BaseException('File conversion failed')

    wiki_config = get_wiki_config(repo_id, username)
    new_page = {
        'id': page_id,
        'name': page_name,
        'path': os.path.join(parent_dir, sdoc_filename),
        'icon': '',
        'docUuid': sdoc_uuid_str,
        'locked': False
    }
    navigation = wiki_config.get('navigation', [])
    pages = wiki_config.get('pages', [])
    pages.append(new_page)
    if len(wiki_config) == 0:
        wiki_config['version'] = 1
    
    new_nav = {
        'id': page_id,
        'type': 'page',
    }
    if not from_page_id:
        navigation.append(new_nav)
    else:
        is_find = [False]
        gen_new_page_nav_by_id(navigation, page_id, from_page_id, 'inner', is_find)
        if not is_find[0]:
            error_msg = 'Current page does not exist'
            delete_wiki_page_dir(repo_id, parent_dir, username)
            raise Exception(error_msg)
    wiki_config['navigation'] = navigation
    wiki_config['pages'] = pages
    wiki_config = json.dumps(wiki_config)
    save_wiki_config(repo_id, username, wiki_config)

    try:
        # remove tmp md/docx
        if extension in ['.md', '.docx']:
            seafile_api.del_file(repo_id, parent_dir,
                        json.dumps([filename]), username)
        if os.path.exists(local_file_path):
            os.remove(local_file_path)
    except Exception as e:
        logger.warning(e)
