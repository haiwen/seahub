# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import logging
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.utils import is_pro_version

# Get an instance of a logger
logger = logging.getLogger(__name__)

ONLINE_OFFICE_LOCK_OWNER = 'OnlineOffice'

def check_file_lock(repo_id, file_path, username):
    """ Check if file is locked to current user

    According to returned value of seafile_api.check_file_lock:
    0: not locked
    1: locked by other
    2: locked by me
    -1: error

    Return (is_locked, locked_by_me)
    """

    if not is_pro_version():
        return (False, False)

    return_value = seafile_api.check_file_lock(repo_id,
            file_path.lstrip('/'), username)

    if return_value == 0:
        return (False, False)
    elif return_value == 1:
        return (True, False)
    elif return_value == 2:
        return (True, True)
    else:
        raise SearpcError('check file lock error')

def if_locked_by_online_office(repo_id, path):

    locked_by_online_office = False
    if is_pro_version():
        lock_info = seafile_api.get_lock_info(repo_id, path)
        if lock_info and lock_info.user == ONLINE_OFFICE_LOCK_OWNER:
            locked_by_online_office = True

    return locked_by_online_office

