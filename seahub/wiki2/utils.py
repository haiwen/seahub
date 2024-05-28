# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import re
import os
import stat
import logging
import json
import requests
import posixpath

from seaserv import seafile_api
from seahub.constants import PERMISSION_READ_WRITE
from seahub.utils import gen_inner_file_get_url
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
