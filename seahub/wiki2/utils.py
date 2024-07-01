# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import re
import os
import stat
import logging
import json
import requests
import posixpath
import random

from seaserv import seafile_api
from seahub.constants import PERMISSION_READ_WRITE
from seahub.utils import gen_inner_file_get_url, gen_file_upload_url
from seahub.group.utils import is_group_admin, is_group_member

logger = logging.getLogger(__name__)

WIKI_PAGES_DIR = '/wiki-pages'
WIKI_CONFIG_PATH = '_Internal/Wiki'
WIKI_CONFIG_FILE_NAME = 'index.json'


def is_valid_wiki_name(name):
    name = name.strip()
    if len(name) > 255 or len(name) < 1:
        return False
    return True if re.match('^[\w\s-]+$', name, re.U) else False


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


def get_wiki_config(repo_id, username):
    config_path = posixpath.join(WIKI_CONFIG_PATH, WIKI_CONFIG_FILE_NAME)
    file_id = seafile_api.get_file_id_by_path(repo_id, config_path)
    if not file_id:
        return {}
    token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username, use_onetime=True)
    url = gen_inner_file_get_url(token, WIKI_CONFIG_FILE_NAME)
    resp = requests.get(url)
    wiki_config = json.loads(resp.content)
    return wiki_config


def is_group_wiki(wiki):
    return not ('@' in wiki.owner)


def check_wiki_admin_permission(wiki, username):
    if is_group_wiki(wiki):
        group_id = wiki.owner
        return is_group_admin(group_id, username)
    else:
        if username == wiki.owner:
            return True
    return False


def check_wiki_permission(wiki, username):
    if is_group_wiki(wiki):
        group_id = wiki.owner
        return is_group_member(group_id, username)
    else:
        if username == wiki.owner:
            return True
    return False


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


def select_page_nav():
    for key, value in nested_dict.items():
        if key == target_key:
            return True
        elif isinstance(value, dict):
            if key_exists_in_nested_dict(value, target_key):
                return True
    return False

def gen_new_page_nav_by_id(navigation, page_id, current_id):
    new_nav = {
        'id': page_id,
        'type': 'page',
    }
    if current_id:
        for nav in navigation:
            if nav.get('type') == 'page' and nav.get('id') == current_id:
                sub_nav = nav.get('children', [])
                sub_nav.append(new_nav)
                nav['children'] = sub_nav
                return
            else:
                gen_new_page_nav_by_id(nav.get('children', []), page_id, current_id)
    else:
        navigation.append(new_nav)


def get_current_level_page_ids(navigation, page_id, ids=[]):
    for item in navigation:
        if item.get('id') == page_id:
            ids.extend([child.get('id') for child in navigation if child.get('type') == 'page'])
            return
        else:
            children = item.get('children') or []
            get_current_level_page_ids(children, page_id, ids)




def add_page(navigation, page_id, parent_id=None):
    if not parent_id:
        navigation.append({'id': page_id, 'type': 'page'})
        if len(navigation) > 1:
            navigation[-2]['children'] = []
            navigation[-2]['_path'] = ""
        else:
            navigation[0]['children'] = []
            navigation[0]['_path'] = ""
    else:
        _add_page_recursion(page_id, navigation, parent_id)

    return navigation


def _add_page_recursion(page_id, items, parent_id):
    for item in items:
        if item['id'] == parent_id:
            item['children'].append({'id': page_id, 'type': 'PAGE'})
            return

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

    upload_link = gen_file_upload_url(token, 'upload-api')
    upload_link = upload_link + '?replace=1'

    files = {
        'file': (WIKI_CONFIG_FILE_NAME, wiki_config)
    }
    data = {'parent_dir': WIKI_CONFIG_PATH, 'relative_path': '', 'replace': 1}
    resp = requests.post(upload_link, files=files, data=data)
    if not resp.ok:
        raise Exception(resp.text)