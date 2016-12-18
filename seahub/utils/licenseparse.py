# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
from django.conf import settings
from seahub.utils import is_pro_version

from seaserv import ccnet_api

logger = logging.getLogger(__name__)

def get_license_path():
        return os.path.join(settings.PROJECT_ROOT, '../../seafile-license.txt')

def parse_license():
    """Parse license file and return dict.

    Arguments:
    - `license_path`:

    Returns:
    e.g.

    {'Hash': 'fdasfjl',
    'Name': 'seafile official',
    'Licencetype': 'User',
    'LicenceKEY': '123',
    'Expiration': '2016-3-2',
    'MaxUsers': '1000000',
    'ProductID': 'Seafile server for Windows'
    }

    """
    ret = {}
    lines = []
    license_path = get_license_path()
    try:
        with open(license_path) as f:
            lines = f.readlines()
    except Exception as e:
        logger.warn(e)
        return {}

    for line in lines:
        if len(line.split('=')) == 2:
            k, v = line.split('=')
            ret[k.strip()] = v.strip().strip('"')

    return ret

def user_number_over_limit(new_users = 0):
    if is_pro_version():
        try:
            # get license user limit
            license_dict = parse_license()
            max_users = int(license_dict.get('MaxUsers', 3))

            # get active user number
            active_db_users = ccnet_api.count_emailusers('DB')
            active_ldap_users = ccnet_api.count_emailusers('LDAP')
            active_users = active_db_users + active_ldap_users if \
                    active_ldap_users > 0  else active_db_users

            return active_users + new_users >= max_users
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(e)
            return False
    else:
        return False

