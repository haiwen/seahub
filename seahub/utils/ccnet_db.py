# -*- coding: utf-8 -*-
import os
import configparser


def get_ccnet_db_name():
    ccnet_conf_dir = os.environ.get('SEAFILE_CENTRAL_CONF_DIR') or os.environ.get('CCNET_CONF_DIR')
    if not ccnet_conf_dir:
        error_msg = 'Environment variable ccnet_conf_dir is not define.'
        return None, error_msg

    ccnet_conf_path = os.path.join(ccnet_conf_dir, 'ccnet.conf')
    config = configparser.ConfigParser()
    config.read(ccnet_conf_path)

    if config.has_section('Database'):
        db_name = config.get('Database', 'DB', fallback='ccnet')
    else:
        db_name = 'ccnet'

    if config.get('Database', 'ENGINE') != 'mysql':
        error_msg = 'Failed to init ccnet db, only mysql db supported.'
        return None, error_msg
    return db_name, None
