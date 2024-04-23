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


import os
import configparser
from django.db import connection


# class CcnetGroup(object):
#
#     def __init__(self, **kwargs):
#         self.id = kwargs.get('group_id')
#         self.group_name = kwargs.get('group_name')
#         self.creator_name = kwargs.get('creator_name')
#         self.timestamp = kwargs.get('timestamp')
#         self.parent_group_id = kwargs.get('parent_group_id')


class SeafileDB:

    def __init__(self):
        self.db_name = get_seafile_db_name()[0]

    def empty_org_repo_trash(self, org_id):

        def del_org_repo_file_count(cursor,repo_id):
            sql = f"""
            DELETE FROM
                `{self.db_name}`.`RepoFileCount`
            WHERE  
                repo_id='{repo_id}';
            """
            cursor.execute(sql)

        sql1 = f"""
        SELECT 
            t.repo_id
        FROM
            `{self.db_name}`.`RepoTrash` t
        WHERE  
            org_id={org_id};
        """

        sql2 = f"""
        DELETE FROM
            `{self.db_name}`.`RepoTrash`
        WHERE
          org_id={org_id};
        """

        with connection.cursor() as cursor:
            cursor.execute(sql1)
            for item in cursor.fetchall():
                repo_id = item[0]
                try:
                    del_org_repo_file_count(cursor=cursor, repo_id=repo_id)
                except Exception:
                    continue
            cursor.execute(sql2)
            cursor.close()
