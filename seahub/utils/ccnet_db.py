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


class CcnetUsers(object):

    def __init__(self, **kwargs):
        self.user_id = kwargs.get('user_id')
        self.email = kwargs.get('email')
        self.is_staff = kwargs.get('is_staff')
        self.is_active = kwargs.get('is_active')
        self.ctime = kwargs.get('ctime')
        self.role = kwargs.get('role')
        self.passwd = kwargs.get('passwd')


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
                timestamp = item[3]
                parent_group_id = item[5]
                params = {
                    'group_id': group_id,
                    'group_name': group_name,
                    'creator_name': creator_name,
                    'timestamp': timestamp,
                    'parent_group_id': parent_group_id
                }
                group_obj = CcnetGroup(**params)
                groups.append(group_obj)
        return groups

    def list_eligible_users(self, start, limit, is_active=None, role=None):

        def status(is_active):
            return 'AND t1.is_active=%s ' % is_active

        def is_role(role):
            if role == 'default':
                return 'AND (t2.role is null or t2.role = "default")'
            else:
                return 'AND t2.role = "%s"' % role
            
        search_clause = ''
        if is_active:
            search_clause += status(is_active)
        if role:
            search_clause += is_role(role)
            
        count_sql = f"""
        SELECT count(1)
        FROM
            `{self.db_name}`.`EmailUser` t1
        LEFT JOIN
            `{self.db_name}`.`UserRole` t2
        ON
            t1.email = t2.email
        WHERE
            t1.email NOT LIKE '%%@seafile_group' %s
        ORDER BY t1.id
        """ % search_clause

        sql = f"""
        SELECT t1.id, t1.email, t1.is_staff, t1.is_active, t1.ctime, t2.role, t1.passwd
        FROM
            `{self.db_name}`.`EmailUser` t1
        LEFT JOIN
            `{self.db_name}`.`UserRole` t2
        ON
            t1.email = t2.email
        WHERE
            t1.email NOT LIKE '%%@seafile_group' %s
        ORDER BY t1.id
        LIMIT {limit} OFFSET {start}
        """ % search_clause
        
        users = []
        total = 0
        with connection.cursor() as cursor:
            cursor.execute(count_sql)
            cursor.execute(count_sql)
            total_count = int(cursor.fetchone()[0])
            
            cursor.execute(sql)
            for item in cursor.fetchall():
                user_id = item[0]
                email = item[1]
                is_staff = item[2]
                is_active = item[3]
                ctime = item[4]
                role = item[5]
                passwd = item[6]
                params = {
                    'user_id': user_id,
                    'email': email,
                    'is_staff': is_staff,
                    'is_active': is_active,
                    'ctime': ctime,
                    'role': role,
                    'passwd': passwd
                }
                users_obj = CcnetUsers(**params)
                users.append(users_obj)

        return users, total_count

    def get_group_ids_admins_map(self, group_ids):
        group_admins = {}
        group_ids_str = ','.join(str(id) for id in group_ids)
        sql = f"""
        SELECT user_name, group_id
        FROM 
            `{self.db_name}`.`GroupUser`
        WHERE 
            group_id IN ({group_ids_str}) AND is_staff = 1
        """
        with connection.cursor() as cursor:
            cursor.execute(sql)
            result = cursor.fetchall()
        for user, group_id in result:
            if group_id in group_admins:
                group_admins[group_id].append(user)
            else:
                group_admins[group_id] = [user]
        return group_admins

    def change_groups_into_departments(self, group_id):
        sql = f"""
        UPDATE `{self.db_name}`.`Group` g
        SET
            g.creator_name = 'system admin',
            g.parent_group_id = -1
        WHERE
            g.group_id = {group_id}
        """
        structure_sql = f"""
        INSERT INTO `{self.db_name}`.`GroupStructure` (group_id, path)
        VALUES ('{group_id}', '{group_id}')
        """

        with connection.cursor() as cursor:
            cursor.execute(sql)
            cursor.execute(structure_sql)

    def get_active_users_by_user_list(self, user_list):
        if not user_list:
            return []
        user_list_str = ','.join(["'%s'" % str(user) for user in user_list])
        active_users = []
        sql = f"""
        SELECT `email`
        FROM `{self.db_name}`.`EmailUser`
        WHERE
            email IN ({user_list_str}) AND is_active = 1 AND  email NOT LIKE '%%@seafile_group'
        """
        with connection.cursor() as cursor:
            cursor.execute(sql)
            for user in cursor.fetchall():
                active_users.append(user[0])
        return active_users
