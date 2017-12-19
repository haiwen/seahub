# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import logging
from django.utils.translation import ugettext as _

import seaserv
from seaserv import seafile_api

from seahub.utils import EMPTY_SHA1, is_org_context
from seahub.base.accounts import User

logger = logging.getLogger(__name__)

def list_dir_by_path(cmmt, path):
    if cmmt.root_id == EMPTY_SHA1:
        return []
    else:
        dirs = seafile_api.list_dir_by_commit_and_path(cmmt.repo_id, cmmt.id, path)
        return dirs if dirs else []

def get_sub_repo_abbrev_origin_path(repo_name, origin_path):
    """Return abbrev path for sub repo based on `repo_name` and `origin_path`.

    Arguments:
    - `repo_id`:
    - `origin_path`:
    """
    if len(origin_path) > 20:
        abbrev_path = origin_path[-20:]
        return repo_name + '/...' + abbrev_path
    else:
        return repo_name + origin_path

def get_repo_owner(request, repo_id):
    if is_org_context(request):
        return seafile_api.get_org_repo_owner(repo_id)
    else:
        return seafile_api.get_repo_owner(repo_id)

def get_repo_shared_users(repo_id, repo_owner, include_groups=True):
    """Return a list contains users and group users. Repo owner is ommited.
    """
    ret = []
    users = seafile_api.list_repo_shared_to(repo_owner, repo_id)
    ret += [x.user for x in users]
    if include_groups:
        for e in seafile_api.list_repo_shared_group_by_user(repo_owner, repo_id):
            g_members = seaserv.get_group_members(e.group_id)
            ret += [x.user_name for x in g_members if x.user_name != repo_owner]

    return list(set(ret))

def create_repo_with_storage_backend(request):
    username = request.user.username
    repo_name = request.data.get("name")
    passwd = request.data.get("passwd", None) or None

    storage_id = request.data.get("storage_id", None) or None
    storage_classes = seafile_api.get_all_storage_classes()
    storage_ids = request.user.permissions.storage_ids()

    if storage_id not in \
            [s.storage_id for s in storage_classes if s.storage_id in storage_ids ]:
        storage_id = storage_ids[0]

    repo_id = seafile_api.create_repo(repo_name,
            '', username, passwd, storage_id)

    return repo_id
