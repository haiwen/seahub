# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import logging
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.utils import is_pro_version
from seahub.settings import ENABLE_FOLDER_PERM

# Get an instance of a logger
logger = logging.getLogger(__name__)

def check_file_lock(repo_id, file_path, username):
    """ Check if file is locked to current user

    According to returned value of seafile_api.check_file_lock:
    0: not locked
    1: locked by other
    2: locked by me
    -1: error

    Return (is_locked, locked_by_me)
    """

    if not is_pro_version() or not ENABLE_FOLDER_PERM:
        return (False, False)

    return_value = seafile_api.check_file_lock(repo_id,
            file_path.lstrip('/'), username)

    if return_value == 0:
        return (False, False)
    elif return_value == 1:
        return (True , False)
    elif return_value == 2:
        return (True, True)
    else:
        raise SearpcError('check file lock error')
