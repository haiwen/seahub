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


import os
import configparser
from django.db import connection

class CcnetGroup(object):
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('group_id')
        self.group_name = kwargs.get('group_name')
        self.creator_name = kwargs.get('creator_name')
        self.timestamp = kwargs.get('timestamp')
        self.parent_group_id = kwargs.get('parent_group_id')

class CcnetUserRole(object):
    
    def __init__(self, **kwargs):
        self.role = kwargs.get('role')
        self.is_manual_set = kwargs.get('is_manual_set')

class CcnetDB:

    def __init__(self):

        self.db_name = get_ccnet_db_name()[0]

    
    def list_org_departments(self, org_id):
        sql = f"""
        SELECT
            g.group_id, group_name, creator_name, timestamp, type, parent_group_id
        FROM
            `{self.db_name}`.`OrgGroup` o
        LEFT JOIN
            `{self.db_name}`.`Group` g
        ON o.group_id=g.group_id
        WHERE
          org_id={org_id} AND parent_group_id<>0;
        """
        groups = []
        with connection.cursor() as cursor:
            cursor.execute(sql)
            for item in cursor.fetchall():
                group_id = item[0]
                group_name = item[1]
                creator_name = item[2]
                timestamp=item[3]
                parent_group_id = item[5]
                params = {
                    'group_id':group_id,
                    'group_name': group_name,
                    'creator_name': creator_name,
                    'timestamp': timestamp,
                    'parent_group_id': parent_group_id
                }
                group_obj = CcnetGroup(**params)
                groups.append(group_obj)
        return groups

    
    def get_user_role_from_db(self, email):

        sql = f"""
        SELECT `role`, `is_manual_set` FROM `{self.db_name}`.`UserRole` WHERE email = '{email}';
        """
        with connection.cursor() as cursor:
            cursor.execute(sql)
            row = cursor.fetchone()
            if not row:
                role = None
                is_manual_set = False
            else:
                role = row[0]
                is_manual_set = row[1]

        params = {
            'role': role,
            'is_manual_set': is_manual_set
        }
        return CcnetUserRole(**params)
