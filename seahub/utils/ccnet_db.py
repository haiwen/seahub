# -*- coding: utf-8 -*-
import os
from django.db import connection, transaction


def get_ccnet_db_name():
    return os.environ.get('SEAFILE_MYSQL_DB_CCNET_DB_NAME', '') or 'ccnet_db'


def get_seahub_db_name():
    return os.environ.get('SEAFILE_MYSQL_DB_SEAHUB_DB_NAME', '') or 'seahub_db'


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


class CcnetOrg(object):

    def __init__(self, **kwargs):
        self.org_id = kwargs.get('org_id')
        self.org_name = kwargs.get('org_name')
        self.ctime = kwargs.get('ctime')
        self.creator = kwargs.get('creator')
        self.url_prefix = kwargs.get('url_prefix')
        self.role = kwargs.get('role')
        self.is_active = kwargs.get('is_active')


class CcnetGroupMembers(object):
    def __init__(self, **kwargs):
        self.group_id = kwargs.get('group_id')
        self.user_name = kwargs.get('user_name')
        self.is_staff = kwargs.get('is_staff')


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

        if not group_ids:
            return {}

        placeholders = ','.join(['%s'] * len(group_ids))

        sql = f"""
        SELECT user_name, group_id
        FROM `{self.db_name}`.`GroupUser`
        WHERE group_id IN ({placeholders})
        AND is_staff = 1
        """

        group_admins = {}
        with connection.cursor() as cursor:
            cursor.execute(sql, tuple(group_ids))
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

        placeholders = ','.join(['%s'] * len(user_list))
        sql = f"""
        SELECT `email`
        FROM `{self.db_name}`.`EmailUser`
        WHERE email IN ({placeholders})
        AND is_active = 1
        AND email NOT LIKE %s
        """
        params = list(user_list) + ['%@seafile_group']

        active_users = []
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            active_users = [row[0] for row in cursor.fetchall()]
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

    def get_org_staffs(self, org_id):
        sql = f"""
        SELECT email
        FROM `{self.db_name}`.`OrgUser`
        WHERE org_id={org_id} AND is_staff=1
        """
        with connection.cursor() as cursor:
            cursor.execute(sql)
            staffs = cursor.fetchall()

        return [s[0] for s in staffs]

    def get_all_sub_groups(self, group_id):
        sql = f"""
        SELECT group_id
        FROM `{self.db_name}`.`GroupStructure`
        WHERE FIND_IN_SET(%s, REPLACE(path, ' ', '')) > 0
        """
        with connection.cursor() as cursor:
            cursor.execute(sql, [str(group_id)])
            sub_groups = cursor.fetchall()
        return [s[0] for s in sub_groups]

    def move_department(self, department_id, target_department_id):
        get_current_path_sql = f"""
        SELECT path
        FROM `{self.db_name}`.`GroupStructure`
        WHERE group_id = %s
        """

        update_group_sql = f"""
        UPDATE `{self.db_name}`.`Group`
        SET parent_group_id = %s
        WHERE group_id = %s
        """

        update_structure_sql = f"""
        UPDATE `{self.db_name}`.`GroupStructure`
        SET path = CONCAT(%s, SUBSTRING(path, CHAR_LENGTH(%s) + 1))
        WHERE path = %s
            OR path LIKE CONCAT(%s, ', %%');
        """

        with transaction.atomic():
            with connection.cursor() as cursor:
                # Get target department's path
                cursor.execute(get_current_path_sql, [target_department_id])
                target_path_result = cursor.fetchone()
                target_path = target_path_result[0] if target_path_result else str(target_department_id)

                # Get current department's path
                cursor.execute(get_current_path_sql, [department_id])
                current_path_result = cursor.fetchone()
                current_path = current_path_result[0] if current_path_result else str(department_id)

                # Update parent in Group table
                cursor.execute(update_group_sql, [target_department_id, department_id])
                # Create new path prefix
                new_path_prefix = f"{target_path}, {department_id}" if target_path else str(department_id)
                old_path_prefix = current_path

                # Update paths in GroupStructure table
                cursor.execute(
                    update_structure_sql,
                    [
                        new_path_prefix,  # New path prefix
                        old_path_prefix,  # Old path prefix to remove
                        old_path_prefix,  # Pattern to match self
                        old_path_prefix   # Pattern to match the sub
                    ]
                )

    def get_group_members(self, group_id, start, limit):
        sql = f"""
        SELECT group_id, user_name, is_staff
        FROM `{self.db_name}`.`GroupUser`
        WHERE group_id=%s ORDER BY id
        LIMIT %s OFFSET %s
        """

        count_sql = f"SELECT COUNT(1) from `{self.db_name}`.`GroupUser` WHERE group_id=%s"
        users = []
        with connection.cursor() as cursor:
            cursor.execute(count_sql, [group_id])
            total_count = int(cursor.fetchone()[0])
            cursor.execute(sql, [group_id, limit, start])

            for item in cursor.fetchall():
                group_id = item[0]
                user_name = item[1]
                is_staff = item[2]
                params = {
                    'group_id': group_id,
                    'user_name': user_name,
                    'is_staff': is_staff,

                }
                users_obj = CcnetGroupMembers(**params)
                users.append(users_obj)
        return users, total_count
    
    def count_org_active_users(self, org_id):
        sql = f"""
        SELECT COUNT(1)
        FROM `{self.db_name}`.`OrgUser` ou
        JOIN `{self.db_name}`.`EmailUser` eu ON ou.email = eu.email
        WHERE ou.org_id = %s AND eu.is_active = 1 AND eu.email NOT LIKE %s
        """
        user_count = 0
        with connection.cursor() as cursor:
            cursor.execute(sql, [org_id, '%@seafile_group'])
            row = cursor.fetchone()
            user_count = int(row[0]) if row and row[0] is not None else 0
        return user_count

    def get_orgs_by_is_active(self, is_active, page, per_page):

        offset = (page - 1) * per_page

        ccnet_db = get_ccnet_db_name()
        seahub_db = get_seahub_db_name()

        with connection.cursor() as cursor:

            if is_active in ('true', '1'):

                count_sql = f"""
                    SELECT COUNT(*)
                    FROM `{ccnet_db}`.`organization` o
                    LEFT JOIN `{seahub_db}`.`organizations_orgsettings` s
                           ON o.org_id = s.org_id
                    WHERE s.org_id IS NULL OR s.is_active = 1
                """
                cursor.execute(count_sql)
                total_count = cursor.fetchone()[0]

                list_sql = f"""
                    SELECT o.org_id, o.org_name, o.url_prefix,
                           o.creator, o.ctime, s.role, 1 AS is_active
                    FROM `{ccnet_db}`.`organization` o
                    LEFT JOIN `{seahub_db}`.`organizations_orgsettings` s
                           ON o.org_id = s.org_id
                    WHERE s.org_id IS NULL OR s.is_active = 1
                    ORDER BY o.org_id ASC
                    LIMIT {per_page} OFFSET {offset}
                """
                cursor.execute(list_sql)

            else:

                count_sql = f"""
                    SELECT COUNT(*)
                    FROM `{ccnet_db}`.`organization` o
                    LEFT JOIN `{seahub_db}`.`organizations_orgsettings` s
                           ON o.org_id = s.org_id
                    WHERE s.org_id IS NOT NULL AND s.is_active = 0
                """
                cursor.execute(count_sql)
                total_count = cursor.fetchone()[0]

                list_sql = f"""
                    SELECT o.org_id, o.org_name, o.url_prefix,
                           o.creator, o.ctime, s.role, 0 AS is_active
                    FROM `{ccnet_db}`.`organization` o
                    LEFT JOIN `{seahub_db}`.`organizations_orgsettings` s
                           ON o.org_id = s.org_id
                    WHERE s.org_id IS NOT NULL AND s.is_active = 0
                    ORDER BY o.org_id ASC
                    LIMIT {per_page} OFFSET {offset}
                """
                cursor.execute(list_sql)

            rows = cursor.fetchall()

        orgs = []
        for row in rows:
            params = {
                'org_id': row[0],
                'org_name': row[1],
                'url_prefix': row[2],
                'creator': row[3],
                'ctime': row[4],
                'role': row[5],
                'is_active': row[6],
            }
            org = CcnetOrg(**params)
            orgs.append(org)

        return total_count, orgs
