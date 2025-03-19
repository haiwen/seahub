# -*- coding: utf-8 -*-
import os
from django.db import connection


def get_ccnet_db_name():
    return os.environ.get('SEAFILE_MYSQL_DB_CCNET_DB_NAME', '') or 'ccnet_db'


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


class CcnetUserRole(object):

    def __init__(self, **kwargs):
        self.role = kwargs.get('role')
        self.is_manual_set = kwargs.get('is_manual_set')


class CcnetDB:

    def __init__(self):

        self.db_name = get_ccnet_db_name()

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
          org_id=%s AND parent_group_id<>0;
        """
        groups = []
        with connection.cursor() as cursor:
            cursor.execute(sql, [org_id])
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

    def list_eligible_users(self, start, limit,
                            is_active=None, role=None, q=None):

        conditions = []
        params = []

        if is_active is not None:
            conditions.append("t1.is_active = %s")
            params.append(is_active)

        if role:
            if role == 'default':
                conditions.append("(t2.role IS NULL OR t2.role = 'default')")
            else:
                conditions.append("t2.role = %s")
                params.append(role)

        if q:
            conditions.append("t1.email LIKE %s")
            params.append(f"%{q}%")

        base_condition = "t1.email NOT LIKE '%%@seafile_group'"
        where_clause = f"WHERE {base_condition}"
        if conditions:
            where_clause += " AND " + " AND ".join(conditions)

        count_sql = f"""
            SELECT COUNT(1)
            FROM `{self.db_name}`.`EmailUser` t1
            LEFT JOIN `{self.db_name}`.`UserRole` t2 ON t1.email = t2.email
            {where_clause}
            ORDER BY t1.id
        """

        sql = f"""
            SELECT t1.id, t1.email, t1.is_staff, t1.is_active, t1.ctime, t2.role, t1.passwd
            FROM `{self.db_name}`.`EmailUser` t1
            LEFT JOIN `{self.db_name}`.`UserRole` t2 ON t1.email = t2.email
            {where_clause}
            ORDER BY t1.id
            LIMIT %s OFFSET %s;
        """

        users = []
        with connection.cursor() as cursor:
            cursor.execute(count_sql, params)
            total_count = int(cursor.fetchone()[0])

            cursor.execute(sql, params + [limit, start])
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
            group_id IN (%s) AND is_staff = 1
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, [group_ids_str])
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
            g.group_id = %s
        """
        structure_sql = f"""
        INSERT INTO `{self.db_name}`.`GroupStructure` (group_id, path)
        VALUES (%s, %s)
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [group_id])
            cursor.execute(structure_sql, [group_id, group_id])

    def get_active_users_by_user_list(self, user_list):
        if not user_list:
            return []
        user_list_str = ','.join(["'%s'" % str(user) for user in user_list])
        active_users = []
        sql = f"""
        SELECT `email`
        FROM `{self.db_name}`.`EmailUser`
        WHERE
            email IN (%s)
        AND is_active = 1
        AND email NOT LIKE '%%@seafile_group'
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, [user_list_str])
            for user in cursor.fetchall():
                active_users.append(user[0])

        return active_users

    def get_org_user_count(self, org_id):
        sql = f"""
        SELECT COUNT(1)
        FROM `{self.db_name}`.`OrgUser`
        WHERE org_id=%s
        """
        user_count = 0
        with connection.cursor() as cursor:
            cursor.execute(sql, [org_id])
            user_count = cursor.fetchone()[0]
        return user_count

    def get_user_role_from_db(self, email):

        sql = f"""
        SELECT `role`, `is_manual_set`
        FROM `{self.db_name}`.`UserRole`
        WHERE email = %s;
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, [email])
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
