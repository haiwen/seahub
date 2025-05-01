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

class WikiInfo(object):
    def __init__(self, **kwargs):
        self.repo_id = kwargs.get('repo_id')
        self.wiki_name = kwargs.get('wiki_name')
        self.owner_id = kwargs.get('owner_id')
        self.encrypted = kwargs.get('is_encrypted')
        self.size = kwargs.get('size')
        self.status = kwargs.get('status')
        self.file_count = kwargs.get('file_count')
        self.last_modified = kwargs.get('last_modified')



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
        def del_repo_trash(cursor, repo_ids):
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

    def set_repo_type(self, repo_id, repo_type):
        sql = f"""
            UPDATE `{self.db_name}`. `RepoInfo`
            SET `type`= '%s'
            WHERE  `repo_id`='%s'
        """ % (repo_type, repo_id)

        with connection.cursor() as cursor:
            cursor.execute(sql)

    def get_repo_ids_in_repo(self, repo_id):
        repo_ids_sql = f"""
                SELECT repo_id from `{self.db_name}`.`VirtualRepo` where origin_repo="{repo_id}"
                """
        repo_ids = [repo_id, ]
        with connection.cursor() as cursor:
            try:
                cursor.execute(repo_ids_sql)
                for item in cursor.fetchall():
                    repo_id = item[0]
                    repo_ids.append(repo_id)
            except:
                return repo_ids

        return repo_ids

    def set_repo_owner(self, repo_id, new_owner, org_id=None):
        # transfert repo to user
        repo_ids = self.get_repo_ids_in_repo(repo_id)
        repo_ids_str = ','.join(["'%s'" % str(rid) for rid in repo_ids])
        if org_id:
            sql = f"""
             UPDATE `{self.db_name}`.`OrgRepo` SET user="{new_owner}" WHERE org_id ={org_id} AND repo_id IN ({repo_ids_str})
             """
        else:
            sql = f"""
             UPDATE `{self.db_name}`.`RepoOwner` SET owner_id="{new_owner}" WHERE repo_id IN ({repo_ids_str})
             """
        with connection.cursor() as cursor:
            cursor.execute(sql)

    def set_repo_group_owner(self, repo_id, group_id, current_group_id=None, org_id=None):
        # transfer repo to department
        group_username = "%s@seafile_group" % group_id
        current_group_username = None
        if current_group_id:
            current_group_username = "%s@seafile_group" % current_group_id
        if org_id:
            sql1 = f"""
            DELETE From `{self.db_name}`.`OrgGroupRepo` where owner="{current_group_username}" AND repo_id="{repo_id}" AND org_id="{org_id}" AND group_id="{current_group_id}"
            """
            sql = f"""
            INSERT INTO `{self.db_name}`.`OrgGroupRepo` (org_id, repo_id, group_id, owner, permission) VALUES ({org_id}, "{repo_id}", {group_id}, "{group_username}", "rw")
            ON DUPLICATE KEY UPDATE owner="{group_username}"
            """
        else:
            sql1 = f"""
            DELETE From `{self.db_name}`.`RepoGroup` where user_name="{current_group_username}" AND repo_id="{repo_id}" AND group_id="{current_group_id}"
                        """
            sql = f"""
            INSERT INTO `{self.db_name}`.`RepoGroup` (repo_id, group_id, user_name, permission) VALUES ("{repo_id}", {group_id}, "{group_username}", "rw")
            ON DUPLICATE KEY UPDATE user_name="{group_username}"
            """
        with connection.cursor() as cursor:
            if current_group_id:
                cursor.execute(sql1)
            cursor.execute(sql)
        self.set_repo_owner(repo_id, group_username, org_id)

    def update_repo_user_shares(self, repo_id, new_owner, org_id=None):
        repo_ids = self.get_repo_ids_in_repo(repo_id)
        repo_ids_str = ','.join(["'%s'" % str(rid) for rid in repo_ids])
        if org_id:
            sql = f"""
              UPDATE `{self.db_name}`.`OrgSharedRepo` SET from_email="{new_owner}" WHERE org_id={org_id} AND repo_id IN ({repo_ids_str})
              """
        else:
            sql = f"""
              UPDATE `{self.db_name}`.`SharedRepo` SET from_email="{new_owner}" WHERE repo_id IN ({repo_ids_str})
              """
        with connection.cursor() as cursor:
            cursor.execute(sql)


    def update_repo_group_shares(self, repo_id, new_owner, org_id=None):
        repo_ids = self.get_repo_ids_in_repo(repo_id)
        repo_ids_str = ','.join(["'%s'" % str(rid) for rid in repo_ids])
        if org_id:
            sql = f"""
              UPDATE `{self.db_name}`.`OrgGroupRepo` SET owner="{new_owner}" WHERE org_id={org_id} AND repo_id IN ({repo_ids_str})
              """
        else:
            sql = f"""
              UPDATE `{self.db_name}`.`RepoGroup` SET user_name="{new_owner}" WHERE repo_id IN ({repo_ids_str})
              """
        with connection.cursor() as cursor:
            cursor.execute(sql)


    def delete_repo_user_token(self, repo_id, owner):
        sql = f"""
          DELETE FROM `{self.db_name}`.`RepoUserToken` where repo_id="{repo_id}" AND email="{owner}"
          """
        with connection.cursor() as cursor:
            cursor.execute(sql)

    def get_all_wikis(self, start, limit, order_by):
        order_by_size_sql = f"""
            SELECT r.repo_id, i.name, o.owner_id, i.is_encrypted, s.size, i.status, c.file_count, i.update_time
            FROM
                 `{self.db_name}`.`Repo` r
            LEFT JOIN `{self.db_name}`.`RepoInfo` i ON r.repo_id = i.repo_id
            LEFT JOIN `{self.db_name}`.`RepoOwner` o ON i.repo_id = o.repo_id
            LEFT JOIN `{self.db_name}`.`RepoSize` s ON s.repo_id = r.repo_id
            LEFT JOIN `{self.db_name}`.`RepoFileCount` c ON r.repo_id = c.repo_id
            WHERE
                i.type = 'wiki'
            ORDER BY
                s.size DESC
            LIMIT {limit} OFFSET {start}
            """
        order_by_filecount_sql = f"""
            SELECT r.repo_id, i.name, o.owner_id, i.is_encrypted, s.size, i.status, c.file_count, i.update_time
            FROM
                 `{self.db_name}`.`Repo` r
            LEFT JOIN `{self.db_name}`.`RepoInfo` i ON r.repo_id = i.repo_id
            LEFT JOIN `{self.db_name}`.`RepoOwner` o ON i.repo_id = o.repo_id
            LEFT JOIN `{self.db_name}`.`RepoSize` s ON s.repo_id = r.repo_id
            LEFT JOIN `{self.db_name}`.`RepoFileCount` c ON r.repo_id = c.repo_id
            WHERE
                i.type = 'wiki'
            ORDER BY
                c.file_count DESC
            LIMIT {limit} OFFSET {start}
            """
        sql = f"""
            SELECT r.repo_id, i.name, o.owner_id, i.is_encrypted, s.size, i.status, c.file_count, i.update_time
            FROM
                 `{self.db_name}`.`Repo` r
            LEFT JOIN `{self.db_name}`.`RepoInfo` i ON r.repo_id = i.repo_id
            LEFT JOIN `{self.db_name}`.`RepoOwner` o ON r.repo_id = o.repo_id
            LEFT JOIN `{self.db_name}`.`RepoSize` s ON r.repo_id = s.repo_id
            LEFT JOIN `{self.db_name}`.`RepoFileCount` c ON r.repo_id = c.repo_id
            WHERE
                i.type = 'wiki'
            LIMIT {limit} OFFSET {start}
        """

        with connection.cursor() as cursor:
            wikis = []
            if order_by == 'size':
                cursor.execute(order_by_size_sql)

            elif order_by == 'file_count':
                cursor.execute(order_by_filecount_sql)
            else:
                cursor.execute(sql)
            for item in cursor.fetchall():
                repo_id = item[0]
                wiki_name = item[1]
                owner_id = item[2]
                is_encrypted = item[3]
                size = item[4]
                status = item[5]
                file_count = item[6]
                last_modified = item[7]
                params = {
                    'repo_id': repo_id,
                    'wiki_name': wiki_name,
                    'owner_id': owner_id,
                    'is_encrypted': is_encrypted,
                    'size': size,
                    'status': status,
                    'file_count': file_count,
                    'last_modified': last_modified
                }
                wiki_info = WikiInfo(**params)
                wikis.append(wiki_info)
            return wikis

    def get_virtual_repo_id(self, original_repo_id, path):
        from seahub.utils import normalize_file_path

        path = normalize_file_path(path)
        sql = f"""
        select repo_id from `{self.db_name}`.`VirtualRepo` where origin_repo="{original_repo_id}" AND path="{path}"
        """
        with connection.cursor() as cursor:
            cursor.execute(sql)
            res = cursor.fetchone()

        return res and res[0] or None


    def get_share_to_user_invisible_repos_info(self, username):

        repo_ids_sql = f"""
            SELECT repo_id, `path`
            FROM `{self.db_name}`.`FolderUserPerm`
            WHERE user = %s  AND permission='invisible';
        """

        repo_id_to_invisible_paths = {}
        with connection.cursor() as cursor:
            cursor.execute(repo_ids_sql, [username])
            for repo in cursor.fetchall():
                repo_id = repo[0]
                invisible_path = repo[1]
                invisible_paths_set = repo_id_to_invisible_paths.get(repo_id)
                if invisible_paths_set:
                    invisible_paths_set.add(invisible_path)
                else:
                    repo_id_to_invisible_paths[repo_id] = {invisible_path}

            return repo_id_to_invisible_paths

    def get_share_to_group_invisible_repos_info_by_group_ids(self, group_ids):
        placeholders = ','.join(['%s'] * len(group_ids))
        repo_ids_sql = f"""
            SELECT repo_id, `path`
            FROM `{self.db_name}`.`FolderGroupPerm`
            WHERE group_id in ({placeholders}) AND permission='invisible';
        """
        repo_id_to_invisible_paths = {}
        with connection.cursor() as cursor:
            cursor.execute(repo_ids_sql, tuple(group_ids))
            for repo in cursor.fetchall():
                repo_id = repo[0]
                invisible_path = repo[1]
                invisible_paths_set = repo_id_to_invisible_paths.get(repo_id)
                if invisible_paths_set:
                    invisible_paths_set.add(invisible_path)
                else:
                    repo_id_to_invisible_paths[repo_id] = {invisible_path}

            return repo_id_to_invisible_paths
