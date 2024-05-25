# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import re
import os
import stat
import logging

from seaserv import seafile_api
from seahub.constants import PERMISSION_READ_WRITE

logger = logging.getLogger(__name__)


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


def get_page_dir_paths_in_folder(folder, id_to_page, page_dir_paths):
    children = folder.get('children', [])
    for child in children:
        child_type = child.get('type')
        if child_type == 'page':
            page_id = child.get('id')
            page = id_to_page.get(page_id, {})
            page_path = page.get('path')
            parent_dir = os.path.dirname(page_path)
            sdoc_dir_name = os.path.basename(parent_dir)
            page_dir_paths.append(sdoc_dir_name)
        elif child_type == 'folder':
            folder = child
            get_page_dir_paths_in_folder(folder, id_to_page, page_dir_paths)
    return page_dir_paths
