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


class OrgRepoTrash(object):

    def __init__(self, **kwargs):
        self.repo_id = kwargs.get('repo_id')
        self.repo_name = kwargs.get('repo_name')
        self.head_id = kwargs.get('head_id')
        self.owner_id = kwargs.get('owner_id')
        self.size = kwargs.get('size')
        self.del_time = kwargs.get('del_time')


class SeafileDB:

    def __init__(self):
        self.db_name = get_seafile_db_name()[0]

    def get_org_trash_repo_list(self, org_id, start, limit):

        sql = f"""
        SELECT repo_id, repo_name, head_id, owner_id, `size`, del_time 
        FROM `{self.db_name}`.`RepoTrash`
        WHERE org_id = {org_id}
        ORDER BY del_time DESC
        LIMIT {limit} OFFSET {start}
        """
        trash_repo_list = []
        with connection.cursor() as cursor:
            cursor.execute(sql)
            for item in cursor.fetchall():
                repo_id = item[0]
                repo_name = item[1]
                head_id = item[2]
                owner_id = item[3]
                size = item[4]
                del_time = item[5]
                params = {
                    'repo_id': repo_id,
                    'repo_name': repo_name,
                    'head_id': head_id,
                    'owner_id': owner_id,
                    'size': size,
                    'del_time': del_time,
                }
                trash_repo_obj = OrgRepoTrash(**params)
                trash_repo_list.append(trash_repo_obj)
            cursor.close()
        return trash_repo_list

    def empty_org_repo_trash(self, org_id):
        """
        empty org repo trash
        """
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
