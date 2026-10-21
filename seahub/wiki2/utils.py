# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import stat
import logging
import json
import os
import requests
import posixpath
import random
import jwt
import time
import tempfile
import uuid
from urllib.parse import urljoin
from zipfile import BadZipFile

from seaserv import seafile_api
from seahub.constants import PERMISSION_READ_WRITE, PERMISSION_INVISIBLE
from seahub.utils import gen_inner_file_get_url, gen_inner_file_upload_url, get_no_duplicate_obj_name
from seahub.group.utils import is_group_admin
from seahub.settings import SECRET_KEY, SEAFEVENTS_SERVER_URL
from seahub.seadoc.settings import SDOC_IMAGES_DIR
from seahub.seadoc.utils import import_sdoc_zip
from seahub.tags.models import FileUUIDMap


logger = logging.getLogger(__name__)

WIKI_PAGES_DIR = '/wiki-pages'
WIKI_CONFIG_PATH = '_Internal/Wiki'
WIKI_CONFIG_FILE_NAME = 'index.json'


class InvalidSdocImportError(Exception):
    pass


class WikiPageNotFoundError(Exception):
    pass


def get_wiki_dirs_by_path(repo_id, path, all_dirs):
    dirs = seafile_api.list_dir_by_path(repo_id, path)

    for dirent in dirs:
        entry = {}
        if stat.S_ISDIR(dirent.mode):
            entry["type"] = 'dir'
        else:
            entry["type"] = 'file'

        entry["parent_dir"] = path
        entry["id"] = dirent.obj_id
        entry["name"] = dirent.obj_name
        entry["size"] = dirent.size
        entry["mtime"] = dirent.mtime

        all_dirs.append(entry)

    return all_dirs


def can_edit_wiki(wiki, username):
    permission = seafile_api.check_permission_by_path(wiki.repo_id, '/', username)
    return permission == PERMISSION_READ_WRITE


def get_wiki_config(repo_id, username, timeout=None):
    config_path = posixpath.join(WIKI_CONFIG_PATH, WIKI_CONFIG_FILE_NAME)
    file_id = seafile_api.get_file_id_by_path(repo_id, config_path)
    if not file_id:
        return {}
    token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username, use_onetime=True)
    url = gen_inner_file_get_url(token, WIKI_CONFIG_FILE_NAME)
    resp = requests.get(url, timeout=timeout)
    wiki_config = json.loads(resp.content)
    return wiki_config


def is_group_wiki(wiki):
    return '@seafile_group' in wiki.owner


def check_wiki_admin_permission(wiki, username):
    if is_group_wiki(wiki):
        group_id = int(wiki.owner.split('@')[0])
        return is_group_admin(group_id, username)
    else:
        if username == wiki.owner:
            return True
    return False


def check_wiki_permission(wiki, username):
    permission = seafile_api.check_permission_by_path(wiki.repo_id, '/', username)
    if permission == PERMISSION_INVISIBLE:
        return None
    return permission


def get_page_ids_in_folder(navigation, folder_id):
    for directory in navigation:
        if directory.get('type') == 'folder' and directory.get('id') == folder_id:
            children = directory.get('children', [])
            page_ids = {child.get('id') for child in children if child.get('type') == 'page'}
            return page_ids
        elif directory.get('type') == 'folder':
            navigation = directory.get('children', [])
            return get_page_ids_in_folder(navigation, folder_id)


def generator_base64_code(length=4):
    possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz0123456789'
    ids = random.sample(possible, length)
    return ''.join(ids)


def get_all_wiki_ids(navigation):
    id_set = set()

    def recurse_item(item):
        id_set.add(item.get('id'))
        children = item.get('children')
        if children:
            for child in children:
                recurse_item(child)

    for nav in navigation:
        recurse_item(nav)
    return id_set


def gen_unique_id(id_set, length=4):
    _id = generator_base64_code(length)

    while True:
        if _id not in id_set:
            return _id
        _id = generator_base64_code(length)


def duplicate_children(id_set, children, old_to_new):
    old_children = []
    for child in children:
        old_id = child.get('id')
        old_path = child.get('_path')
        old_type = child.get('type')
        sub_old_children = child.get('children', [])
        new_id = gen_unique_id(id_set)
        old_to_new[old_id] = new_id
        id_set.add(new_id)
        new_child = {
            'id': new_id,
            '_path': old_path,
            'type': old_type,
            'children': duplicate_children(id_set, sub_old_children, old_to_new),
        }

        old_children.append(new_child)
    return old_children


def get_and_gen_page_nav_by_id(id_set, navigation, page_id, old_to_new):
    for nav in navigation:
        if nav.get('type') == 'page' and nav.get('id') == page_id:
            new_id = gen_unique_id(id_set)
            id_set.add(new_id)
            old_to_new[page_id] = new_id
            children = nav.get('children', [])
            new_nav = {
                'id': new_id,
                'type': 'page',
                '_path': nav.get('_path'),
                'children': duplicate_children(id_set, children, old_to_new),
            }
            navigation.append(new_nav)
            return
        else:
            new_navigation = nav.get('children', [])
            get_and_gen_page_nav_by_id(id_set, new_navigation, page_id, old_to_new)


def gen_new_page_nav_by_id(navigation, page_id, current_id, insert_position, is_find):
    new_nav = {
        'id': page_id,
        'type': 'page',
    }
    if current_id:
        if insert_position == 'inner':
            for nav in navigation:
                if nav.get('type') == 'page' and nav.get('id') == current_id:
                    sub_nav = nav.get('children', [])
                    sub_nav.append(new_nav)
                    nav['children'] = sub_nav
                    is_find[0] = True
                    return True
                else:
                    gen_new_page_nav_by_id(nav.get('children', []), page_id, current_id, insert_position, is_find)
        elif insert_position == 'above':
            for index, nav in enumerate(navigation):
                if nav.get('type') == 'page' and nav.get('id') == current_id:
                    navigation.insert(index, new_nav)
                    is_find[0] = True
                    return True
                else:
                    gen_new_page_nav_by_id(nav.get('children', []), page_id, current_id, insert_position, is_find)
        elif insert_position == 'below':
            for index, nav in enumerate(navigation):
                if nav.get('type') == 'page' and nav.get('id') == current_id:
                    navigation.insert(index+1, new_nav)
                    is_find[0] = True
                    return True
                else:
                    gen_new_page_nav_by_id(nav.get('children', []), page_id, current_id, insert_position, is_find)
    else:
        navigation.append(new_nav)
        is_find[0] = True
        return True


def get_current_level_page_ids(navigation, page_id, ids=[]):
    for item in navigation:
        if item.get('id') == page_id:
            ids.extend([child.get('id') for child in navigation if child.get('type') == 'page'])
            return
        else:
            children = item.get('children') or []
            get_current_level_page_ids(children, page_id, ids)


def save_wiki_config(wiki, username, wiki_config):
    repo_id = wiki.repo_id
    obj_id = json.dumps({'parent_dir': WIKI_CONFIG_PATH})

    dir_id = seafile_api.get_dir_id_by_path(repo_id, WIKI_CONFIG_PATH)
    if not dir_id:
        seafile_api.mkdir_with_parents(repo_id, '/', WIKI_CONFIG_PATH, username)

    token = seafile_api.get_fileserver_access_token(
        repo_id, obj_id, 'upload-link', username, use_onetime=False)

    if not token:
        raise Exception('upload token invalid')

    upload_link = gen_inner_file_upload_url('upload-api', token)
    upload_link = upload_link + '?replace=1'

    files = {
        'file': (WIKI_CONFIG_FILE_NAME, wiki_config)
    }
    data = {'parent_dir': WIKI_CONFIG_PATH, 'relative_path': '', 'replace': 1}
    resp = requests.post(upload_link, files=files, data=data)
    if not resp.ok:
        raise Exception(resp.text)


def clean_up_sdoc_import(repo_id, username, page_info):
    if not page_info:
        return
    for directory in [posixpath.dirname(page_info['path']),
                      posixpath.join(SDOC_IMAGES_DIR, page_info['docUuid'])]:
        try:
            if seafile_api.get_dir_id_by_path(repo_id, directory):
                seafile_api.del_file(repo_id, posixpath.dirname(directory),
                                     json.dumps([posixpath.basename(directory)]), username)
        except Exception as e:
            logger.error(e)
    try:
        FileUUIDMap.objects.filter(uuid=page_info['docUuid']).delete()
    except Exception as e:
        logger.error(e)


def import_sdoc_wiki_page(wiki, username, file, from_page_id):
    """Import a sdoczip and return its page information after saving the wiki config."""
    repo_id = wiki.repo_id
    from_page_id = from_page_id or ''
    local_file_path = None
    save_started = False
    page_info = {}
    try:
        with tempfile.NamedTemporaryFile(suffix='.sdoczip', delete=False, mode='wb') as tmp_file:
            local_file_path = tmp_file.name
            for chunk in file.chunks():
                tmp_file.write(chunk)

        wiki_config = get_wiki_config(repo_id, username)
        navigation = wiki_config.get('navigation', [])
        doc_uuid = str(uuid.uuid4())
        filename = os.path.splitext(file.name)[0] + '.sdoc'
        page_info = {
            'page_id': gen_unique_id(get_all_wiki_ids(navigation)),
            'name': os.path.splitext(file.name)[0],
            'path': posixpath.join(WIKI_PAGES_DIR, doc_uuid, filename),
            'docUuid': doc_uuid,
        }
        try:
            import_sdoc_zip(repo_id, posixpath.dirname(page_info['path']),
                            posixpath.basename(page_info['path']), page_info['docUuid'], username, local_file_path)
        except (BadZipFile, KeyError, ValueError) as e:
            raise InvalidSdocImportError('file invalid.') from e

        wiki_config = get_wiki_config(repo_id, username)
        navigation = wiki_config.get('navigation', [])
        is_find = [False]
        gen_new_page_nav_by_id(navigation, page_info['page_id'], from_page_id, 'inner', is_find)
        if not is_find[0]:
            raise WikiPageNotFoundError('Current page does not exist')
        pages = wiki_config.get('pages', [])
        # The inserted page's siblings are the pages that share its name scope.
        page_ids = []
        get_current_level_page_ids(navigation, page_info['page_id'], page_ids)
        names = [page.get('name') for page in pages if page.get('id') in page_ids]
        page_info['name'] = get_no_duplicate_obj_name(page_info['name'], names)
        page = {
            'id': page_info['page_id'], 'name': page_info['name'], 'path': page_info['path'],
            'docUuid': page_info['docUuid'], 'icon': '', 'locked': False,
        }
        pages.append(page)
        if not wiki_config:
            wiki_config['version'] = 1
        wiki_config['pages'] = pages
        wiki_config['navigation'] = navigation
        # A failed response may still mean the config was saved; keep its assets.
        save_started = True
        save_wiki_config(wiki, username, json.dumps(wiki_config))
        return page_info
    except Exception:
        if not save_started:
            clean_up_sdoc_import(repo_id, username, page_info)
        raise
    finally:
        try:
            if local_file_path and os.path.exists(local_file_path):
                os.remove(local_file_path)
        except Exception as e:
            logger.warning(e)


def delete_page(pages, id_set):
    new_pages = []
    old_pages = []
    for page in pages:
        if page['id'] in id_set:
            new_pages.append(page)
        else:
            old_pages.append(page)
    for page in pages:
        if page['id'] in id_set:
            pages.remove(page)
    return new_pages, old_pages


def pop_nav(navigation, page_id):
    for nav in navigation:
        if nav['id'] == page_id:
            navigation.remove(nav)
            return nav
        if 'children' in nav and nav['children']:
            result = pop_nav(nav['children'], page_id)
            if result:
                return result
    return None


def move_nav(navigation, target_id, moved_nav, move_position):
    def move_item(nav_list, nav_index, moved_nav, move_position):
        if move_position == 'move_below':
            nav_list.insert(nav_index + 1, moved_nav)
        elif move_position == 'move_above':
            nav_list.insert(nav_index, moved_nav)

    for nav_index, nav in enumerate(navigation):
        if nav['id'] == target_id:
            if move_position == 'move_below' or move_position == 'move_above':
                move_item(navigation, nav_index, moved_nav, move_position)
            if move_position == 'move_into':
                if 'children' in nav:
                    nav['children'].append(moved_nav)
                else:
                    nav['children'] = [moved_nav]
            return
        if 'children' in nav:
            move_nav(nav['children'], target_id, moved_nav, move_position)


def revert_nav(navigation, parent_page_id, subpages):

    # connect the subpages to the parent_page
    # if not parent_page_id marked as flag, connect the subpages to the root
    def recurse(navigation, parent_page_id, subpages):
        for nav in navigation:
            if nav['id'] == parent_page_id:
                if nav['children']:
                    nav['children'].append(subpages)
                else:
                    nav['children'] = [subpages]
                return nav
            if 'children' in nav and nav['children']:
                result = recurse(nav['children'], parent_page_id, subpages)
                if result:
                    return result
    flag = recurse(navigation, parent_page_id, subpages)
    if not flag:
        navigation.append(subpages)


def get_sub_ids_by_page_id(subpages, ids):
    for subpage in subpages:
        ids.append(subpage['id'])
        if 'children' in subpage:
            get_sub_ids_by_page_id(subpage['children'], ids)


def get_parent_id_stack(navigation, page_id):
    '''
    DFS (Depth First Search)
    '''
    id_list = []

    def return_parent_page_id(navigation, page_id, id_list):
        for nav in navigation:
            id_list.append(nav['id'])
            if nav['id'] == page_id:
                id_list.pop()
                return True
            if 'children' in nav and nav['children']:
                result = return_parent_page_id(nav['children'], page_id, id_list)
                if result:
                    return True
            id_list.pop()
    return_parent_page_id(navigation, page_id, id_list)

    return id_list


def add_convert_wiki_task(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/add-convert-wiki-task')
    resp = requests.get(url, params=params, headers=headers)
    return json.loads(resp.content)['task_id']


def import_confluence_to_wiki(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/import-confluence-to-wiki')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return json.loads(resp.content)['task_id']


def import_wiki_page(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/import-wiki-page')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return json.loads(resp.content)['task_id']
