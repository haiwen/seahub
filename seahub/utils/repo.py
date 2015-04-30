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
