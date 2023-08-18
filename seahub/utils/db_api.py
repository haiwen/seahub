import os
import configparser
from django.db import connection


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
                {self.db_name}.SharedRepo s
            WHERE
                repo_id = '{repo_id}';
            """
        else:
            sql = f"""
            SELECT
                s.repo_id, s.from_email, s.to_email, s.permission
            FROM
                {self.db_name}.OrgSharedRepo s
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
                {self.db_name}.RepoGroup s
            WHERE
                repo_id = '{repo_id}';
            """
        else:
            sql = f"""
            SELECT
                s.repo_id, s.owner, s.group_id, s.permission
            FROM
                {self.db_name}.OrgGroupRepo s
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
                {self.db_name}.SharedRepo s join {self.db_name}.VirtualRepo v
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
                {self.db_name}.OrgSharedRepo s join {self.db_name}.VirtualRepo v
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
                {self.db_name}.RepoGroup r join {self.db_name}.VirtualRepo v
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
                {self.db_name}.OrgGroupRepo r join {self.db_name}.VirtualRepo v
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
