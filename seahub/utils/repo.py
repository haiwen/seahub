# -*- coding: utf-8 -*-
import logging
from django.utils.translation import ugettext as _

import seaserv
from seaserv import seafile_api

from seahub.utils import EMPTY_SHA1
from seahub.views import check_repo_access_permission
from seahub.base.accounts import User

logger = logging.getLogger(__name__)

def list_dir_by_path(cmmt, path):
    if cmmt.root_id == EMPTY_SHA1:
        return []
    else:
        return seafile_api.list_dir_by_commit_and_path(cmmt.repo_id, cmmt.id, path)

def check_user_folder_perm_args(from_user, repo_id, path, to_user, perm=None):
    if not seafile_api.get_repo(repo_id):
        return {'error': _(u'Library does not exist'), 'status': 400}

    if from_user != seafile_api.get_repo_owner(repo_id):
        return {'error': _('Permission denied'), 'status': 403}

    if perm is not None:
        # add or toggle folder perm
        if perm != 'r' and perm != 'rw':
            return {'error': _('Invalid folder permission, should be "rw" or "r"'), 'status': 400}

    if not path.startswith('/'):
        return {'error': _('Path should start with "/"'), 'status': 400}

    if path != '/' and path.endswith('/'):
        return {'error': _('Path should NOT ends with "/"'), 'status': 400}

    if seafile_api.get_dir_id_by_path(repo_id, path) is None:
        return {'error': _('Invalid path'), 'status': 400}

    try:
        user = User.objects.get(email = to_user)
    except User.DoesNotExist:
        user = None

    if user is None:
        return {'error': _('Invalid username, should be a user already registered'), 'status': 400}

    return {'success': True}

def check_group_folder_perm_args(from_user, repo_id, path, group_id, perm = None):
    if not seafile_api.get_repo(repo_id):
        return {'error': _(u'Library does not exist.'), 'status': 400}

    if from_user != seafile_api.get_repo_owner(repo_id):
        return {'error': _('Permission denied'), 'status': 403}

    if perm is not None:
        # add or toggle folder perm
        if perm != 'r' and perm != 'rw':
            return {'error': _('Invalid folder permission, should be "rw" or "r"'), 'status': 400}

    if not path.startswith('/'):
        return {'error': _('Path should start with "/"'), 'status': 400}

    if path != '/' and path.endswith('/'):
        return {'error': _('Path should NOT ends with "/"'), 'status': 400}

    if seafile_api.get_dir_id_by_path(repo_id, path) is None:
        return {'error': _('Invalid path'), 'status': 400}

    if not seaserv.get_group(group_id):
        return {'error': _('Invalid group'), 'status': 400}

    return {'success': True}

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
