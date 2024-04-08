# -*- coding: utf-8 -*-
import os
import configparser


def get_seafile_db_name():
    seafile_conf_dir = os.environ.get('SEAFILE_CENTRAL_CONF_DIR') or os.environ.get('SEAFILE_CONF_DIR')
    if not seafile_conf_dir:
        error_msg = 'Environment variable seafile_conf_dir is not define.'
        return None, error_msg

    seafile_conf_path = os.path.join(seafile_conf_dir, 'seafile.conf')
    config = configparser.ConfigParser()
    config.read(seafile_conf_path)

    if not config.has_section('database'):
        error_msg = 'Do not found database configuration items.'
        return None, error_msg

    db_type = config.get('database', 'type')
    if db_type != 'mysql':
        error_msg = 'Unknown database backend: %s' % db_type
        return None, error_msg

    db_name = config.get('database', 'db_name', fallback='seafile')

    return db_name, None
