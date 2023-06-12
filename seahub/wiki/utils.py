# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import os
import re
import stat
import urllib.request, urllib.error, urllib.parse
import logging
import posixpath

from django.urls import reverse
from urllib.parse import quote
from django.utils.encoding import smart_str

import seaserv
from seaserv import seafile_api
from pysearpc import SearpcError
from seahub.utils.slugify import slugify
from seahub.utils import gen_file_get_url, get_file_type_and_ext, \
    gen_inner_file_get_url, get_site_scheme_and_netloc
from seahub.utils.file_types import IMAGE
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from .models import WikiPageMissing, WikiDoesNotExist

logger = logging.getLogger(__name__)

__all__ = ["get_wiki_dirent", "page_name_to_file_name"]


SLUG_OK = "!@#$%^&()_+-,.;'"
def normalize_page_name(page_name):
    # Remove special characters. Lower page name and replace spaces with '-'.
    return slugify(page_name, ok=SLUG_OK)

def page_name_to_file_name(page_name):
    """Append ".md" if page name does not end with .md or .markdown.
    """
    if page_name.endswith('.md') or page_name.endswith('.markdown'):
        return page_name
    return page_name + '.md'

def get_wiki_dirent(repo_id, page_name):
    file_name = page_name_to_file_name(page_name)
    repo = seaserv.get_repo(repo_id)
    if not repo:
        raise WikiDoesNotExist
    cmmt = seaserv.get_commits(repo.id, 0, 1)[0]
    if cmmt is None:
        raise WikiPageMissing
    dirs = seafile_api.list_dir_by_commit_and_path(cmmt.repo_id, cmmt.id, "/")
    if dirs:
        for e in dirs:
            if stat.S_ISDIR(e.mode):
                continue    # skip directories
            if normalize_page_name(file_name) == normalize_page_name(e.obj_name):
                return e
    raise WikiPageMissing

def is_valid_wiki_name(name):
    name = name.strip()
    if len(name) > 255 or len(name) < 1:
        return False
    return True if re.match('^[\w\s-]+$', name, re.U) else False

def slugfy_wiki_name(name):
    return slugify(name, ok=SLUG_OK)

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
