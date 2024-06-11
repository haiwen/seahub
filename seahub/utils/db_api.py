import os
import configparser
from django.db import connection


class RepoTrash(object):

    def __init__(self, **kwargs):
        self.repo_id = kwargs.get('repo_id')
        self.repo_name = kwargs.get('repo_name')
        self.head_id = kwargs.get('head_id')
        self.owner_id = kwargs.get('owner_id')
        self.size = kwargs.get('size')
        self.del_time = kwargs.get('del_time')


class SeafileDB:

    def __init__(self):

        self.db_name = self._get_seafile_db_name()

    def _get_seafile_db_name(self):

        conf_dir = os.environ.get('SEAFILE_CENTRAL_CONF_DIR') or \
                os.environ.get('SEAFILE_CONF_DIR')

        if not conf_dir:
            return ""

        config = configparser.ConfigParser()
        seafile_conf_path = os.path.join(conf_dir, 'seafile.conf')
        config.read(seafile_conf_path)

        if not config.has_section('database'):
            return ''

        if 'sqlite' in config.get('database', 'type'):
            return ''

        db_name = config.get('database', 'db_name')
        if not db_name:
            raise Exception("Database name not configured.")

        return db_name

    def get_repo_user_share_list(self, repo_id, org_id=''):

        # get repos shared to user

        if not org_id:
            sql = f"""
            SELECT
                s.repo_id, s.from_email, s.to_email, s.permission
            FROM
                `{self.db_name}`.`SharedRepo` s
            WHERE
                repo_id = '{repo_id}';
            """
        else:
            sql = f"""
            SELECT
                s.repo_id, s.from_email, s.to_email, s.permission
            FROM
                `{self.db_name}`.`OrgSharedRepo` s
            WHERE
                repo_id = '{repo_id}';
            """

        share_info_list = []
        with connection.cursor() as cursor:

            cursor.execute(sql)
            for item in cursor.fetchall():

                info = {}
                info['share_type'] = 'user'
                info['repo_id'] = item[0]
                info['path'] = '/'
                info['share_from'] = item[1]
                info['share_to'] = item[2]
                info['permission'] = item[3]

                share_info_list.append(info)

        return share_info_list

    def get_repo_group_share_list(self, repo_id, org_id=''):

        # get repos shared to group

        if not org_id:
            sql = f"""
            SELECT
                s.repo_id, s.user_name, s.group_id, s.permission
            FROM
                `{self.db_name}`.`RepoGroup` s
            WHERE
                repo_id = '{repo_id}';
            """
        else:
            sql = f"""
            SELECT
                s.repo_id, s.owner, s.group_id, s.permission
            FROM
                `{self.db_name}`.`OrgGroupRepo` s
            WHERE
                repo_id = '{repo_id}';
            """

        share_info_list = []
        with connection.cursor() as cursor:

            cursor.execute(sql)
            for item in cursor.fetchall():

                info = {}
                info['share_type'] = 'group'
                info['repo_id'] = item[0]
                info['path'] = '/'
                info['share_from'] = item[1]
                info['share_to'] = item[2]
                info['permission'] = item[3]

                share_info_list.append(info)

        return share_info_list

    def get_folder_user_share_list(self, repo_id, org_id=''):

        # get folders shared to user
        if not org_id:
            sql = f"""
            SELECT
                v.origin_repo, v.path, s.from_email, s.to_email, s.permission
            FROM
                `{self.db_name}`.`SharedRepo` s join `{self.db_name}`.`VirtualRepo` v
            ON
                s.repo_id=v.repo_id
            WHERE
                v.origin_repo = '{repo_id}';
            """
        else:
            sql = f"""
            SELECT
                v.origin_repo, v.path, s.from_email, s.to_email, s.permission
            FROM
                `{self.db_name}`.`OrgSharedRepo` s join `{self.db_name}`.`VirtualRepo` v
            ON
                s.repo_id=v.repo_id
            WHERE
                v.origin_repo = '{repo_id}';
            """

        share_info_list = []
        with connection.cursor() as cursor:

            cursor.execute(sql)
            for item in cursor.fetchall():

                info = {}
                info['share_type'] = 'user'
                info['repo_id'] = item[0]
                info['path'] = item[1]
                info['share_from'] = item[2]
                info['share_to'] = item[3]
                info['permission'] = item[4]

                share_info_list.append(info)

        return share_info_list

    def get_folder_group_share_list(self, repo_id, org_id=''):

        # get folders shared to group

        if not org_id:
            sql = f"""
            SELECT
                v.origin_repo, v.path, r.user_name, r.group_id, r.permission
            FROM
                `{self.db_name}`.`RepoGroup` r join `{self.db_name}`.`VirtualRepo` v
            ON
                r.repo_id=v.repo_id
            WHERE
                v.origin_repo = '{repo_id}';
            """
        else:
            sql = f"""
            SELECT
                v.origin_repo, v.path, r.owner, r.group_id, r.permission
            FROM
                `{self.db_name}`.`OrgGroupRepo` r join `{self.db_name}`.`VirtualRepo` v
            ON
                r.repo_id=v.repo_id
            WHERE
                v.origin_repo = '{repo_id}';
            """

        share_info_list = []
        with connection.cursor() as cursor:

            cursor.execute(sql)
            for item in cursor.fetchall():

                info = {}
                info['share_type'] = 'group'
                info['repo_id'] = item[0]
                info['path'] = item[1]
                info['share_from'] = item[2]
                info['share_to'] = item[3]
                info['permission'] = item[4]

                share_info_list.append(info)

        return share_info_list

    def get_devices_error(self, start, limit):

        if start == -1 and limit == -1:
            sql = f"""
            SELECT
                u.repo_id, o.owner_id, u.email, e.token, 
                p.peer_id, p.peer_ip, p.peer_name, p.sync_time, p.client_ver, e.error_time, e.error_con, i.name
            FROM
                `{self.db_name}`.`RepoSyncError` e 
            LEFT JOIN `{self.db_name}`.`RepoUserToken` u ON e.token = u.token 
            LEFT JOIN `{self.db_name}`.`RepoInfo` i ON u.repo_id = i.repo_id 
            LEFT JOIN `{self.db_name}`.`RepoTokenPeerInfo` p ON e.token = p.token
            CROSS JOIN `{self.db_name}`.`RepoOwner` o
            WHERE
                u.repo_id = o.repo_id
            ORDER BY
                e.error_time DESC
            """
        else:
            sql =f"""
            SELECT
                u.repo_id, o.owner_id, u.email, e.token, 
                p.peer_id, p.peer_ip, p.peer_name, p.sync_time, p.client_ver, e.error_time, e.error_con, i.name
            FROM
                `{self.db_name}`.`RepoSyncError` e 
            LEFT JOIN `{self.db_name}`.`RepoUserToken` u ON e.token = u.token 
            LEFT JOIN `{self.db_name}`.`RepoInfo` i ON u.repo_id = i.repo_id 
            LEFT JOIN `{self.db_name}`.`RepoTokenPeerInfo` p ON e.token = p.token
            CROSS JOIN `{self.db_name}`.`RepoOwner` o
            WHERE
                u.repo_id = o.repo_id
            ORDER BY
                e.error_time DESC
            LIMIT {limit} OFFSET {start}
            """

        device_errors = []
        with connection.cursor() as cursor:
            cursor.execute(sql)
            for item in cursor.fetchall():
                info = {}
                info['repo_id'] = item[0]
                info['email'] = item[2]
                info['peer_id'] = item[4]
                info['peer_ip'] = item[5]
                info['device_name'] = item[6]
                info['client_version'] = item[8]
                info['error_time'] = item[9]
                info['error_con'] = item[10]
                info['repo_name'] = item[11]

                device_errors.append(info)

        return device_errors

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
                trash_repo_obj = RepoTrash(**params)
                trash_repo_list.append(trash_repo_obj)
            cursor.close()
        return trash_repo_list

    def empty_org_repo_trash(self, org_id):
        """
        empty org repo trash
        """
        def del_repo_trash(cursor,repo_ids):
            del_file_count_sql = """
            DELETE FROM
                `%s`.`RepoFileCount`
            WHERE  
                repo_id in %%s;
            """ % self.db_name
            cursor.execute(del_file_count_sql, (repo_ids, ))
            
            del_repo_info_sql = """
            DELETE FROM
                `%s`.`RepoInfo`
            WHERE
                repo_id in %%s;
            """ % self.db_name
            cursor.execute(del_repo_info_sql, (repo_ids, ))
            
            del_trash_sql = """
            DELETE FROM
                `%s`.`RepoTrash`
            WHERE
                repo_id in %%s;
            """ % self.db_name
            cursor.execute(del_trash_sql, (repo_ids,))
            

        sql_list_repo_id = f"""
        SELECT 
            t.repo_id
        FROM
            `{self.db_name}`.`RepoTrash` t
        WHERE  
            org_id={org_id};
        """
        with connection.cursor() as cursor:
            cursor.execute(sql_list_repo_id)
            repo_ids = []
            for item in cursor.fetchall():
                repo_id = item[0]
                repo_ids.append(repo_id)
            del_repo_trash(cursor, repo_ids)
            cursor.close()
    
    def add_repos_to_org_user(self, org_id, username, repo_ids):
        for repo_id in repo_ids:
            sql = f"""
            INSERT INTO `{self.db_name}`.`OrgRepo` (org_id, repo_id, user)
            VALUES ({org_id}, "{repo_id}", "{username}");
            """
            with connection.cursor() as cursor:
                cursor.execute(sql)
