# -*- coding: utf-8 -*-
import stat

import seaserv
from seahub.utils import EMPTY_SHA1
from seahub.utils.repo import list_dir_by_path
from seahub.utils.slugify import slugify

SLUG_OK = "!@#$%^&()_+-,.;'"
def normalize_page_name(page_name):
    # Remove special characters. Lower page name and replace spaces with '-'.
    return slugify(page_name, ok=SLUG_OK)

def clean_page_name(page_name):
    # Remove special characters. Do not lower page name and spaces are allowed.
    return slugify(page_name, ok=SLUG_OK, lower=False, spaces=True)

def get_wiki_dirent(repo_id, page_name):
    file_name = page_name + ".md"
    repo = seaserv.get_repo(repo_id)
    if not repo:
        return None
    cmmt = seaserv.get_commits(repo.id, 0, 1)[0]
    if cmmt is None:
        return None
    dirs = list_dir_by_path(cmmt, "/")
    if not dirs:
        return None
    else:
        for e in dirs:
            if stat.S_ISDIR(e.mode):
                continue    # skip directories
            if normalize_page_name(file_name) == normalize_page_name(e.obj_name):
                return e
    return None
    


