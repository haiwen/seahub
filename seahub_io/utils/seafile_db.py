import logging
from seaserv import seafile_api
from sqlalchemy import text

from seahub_io.db import init_db_session_class

logger = logging.getLogger('seahub_io')


class SeafileDB(object):
    def __init__(self):
        self.session = init_db_session_class(db='seafile')()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            self.session.close()

    def repo_info(self, item):
        info = {
            'repo_name': item[1],
            'owner': item[2]
        }
        return info

    def get_repo_info_by_ids(self, repo_ids):
        if not repo_ids:
            return {}

        repo_ids = [str(repo_id) for repo_id in repo_ids]

        if len(repo_ids) == 1:
            sql1 = """
            SELECT r.repo_id, name, owner_id
            FROM RepoInfo r
            LEFT JOIN RepoOwner o
            ON o.repo_id = r.repo_id
            WHERE r.repo_id = :repo_id
            """
            sql2 = """
            SELECT r.repo_id, name, user
            FROM RepoInfo r
            LEFT JOIN OrgRepo o
            ON o.repo_id = r.repo_id
            WHERE r.repo_id = :repo_id
            """
            params = {'repo_id': repo_ids[0]}
        else:
            sql1 = """
            SELECT r.repo_id, name, owner_id
            FROM RepoInfo r
            LEFT JOIN RepoOwner o
            ON o.repo_id = r.repo_id
            WHERE r.repo_id IN :repo_ids
            """
            sql2 = """
            SELECT r.repo_id, name, user
            FROM RepoInfo r
            LEFT JOIN OrgRepo o
            ON o.repo_id = r.repo_id
            WHERE r.repo_id IN :repo_ids
            """
            params = {'repo_ids': tuple(repo_ids)}

        result1 = self.session.execute(text(sql1), params)
        rows1 = result1.fetchall()
        result2 = self.session.execute(text(sql2), params)
        rows2 = result2.fetchall()

        rows = rows1 + rows2
        repos_map = {}
        for row in rows:
            if row[0] not in repos_map or repos_map[row[0]]['owner'] is None:
                repos_map[row[0]] = self.repo_info(row)

        return repos_map

    def reset_download_rate_limit(self):
        self.session.execute(text("TRUNCATE TABLE UserDownloadRateLimit"))
        self.session.execute(text("TRUNCATE TABLE OrgDownloadRateLimit"))

    def reset_upload_rate_limit(self):
        self.session.execute(text("TRUNCATE TABLE UserUploadRateLimit"))
        self.session.execute(text("TRUNCATE TABLE OrgUploadRateLimit"))

    def get_repo_owner(self, repo_id):
        sql = "SELECT owner_id FROM RepoOwner WHERE repo_id = :repo_id"
        result = self.session.execute(text(sql), {'repo_id': repo_id})
        rows = result.fetchone()
        if not rows:
            return None
        return rows[0]

    def get_org_repo_owner(self, repo_id):
        sql = "SELECT user FROM OrgRepo WHERE repo_id = :repo_id"
        result = self.session.execute(text(sql), {'repo_id': repo_id})
        rows = result.fetchone()
        if not rows:
            return None
        return rows[0]

    def get_user_self_usage(self, email):
        sql = """
                SELECT SUM(size)
                FROM RepoOwner o
                LEFT JOIN VirtualRepo v ON o.repo_id = v.repo_id
                JOIN RepoSize rs ON o.repo_id = rs.repo_id
                WHERE owner_id = :email
                AND v.repo_id IS NULL
                """
        result = self.session.execute(text(sql), {'email': email})
        rows = result.fetchone()
        if not rows:
            return None
        return rows[0]

    def get_org_user_quota_usage(self, org_id, email):
        sql = """
                SELECT SUM(size)
                FROM OrgRepo o
                LEFT JOIN VirtualRepo v ON o.repo_id = v.repo_id
                JOIN RepoSize rs ON o.repo_id = rs.repo_id
                WHERE org_id = :org_id
                AND user = :email
                AND v.repo_id IS NULL
                """
        result = self.session.execute(text(sql), {'org_id': org_id, 'email': email})
        rows = result.fetchone()
        if not rows:
            return None

        return rows[0]

    def get_org_id_by_repo_id(self, repo_id):
        sql = "SELECT org_id FROM OrgRepo WHERE repo_id = :repo_id"
        result = self.session.execute(text(sql), {'repo_id': repo_id})
        rows = result.fetchone()
        if not rows:
            return -1
        return rows[0]

    def get_org_quota_usage(self, org_id):
        sql = """
                SELECT SUM(size)
                FROM OrgRepo o
                LEFT JOIN VirtualRepo v ON o.repo_id = v.repo_id
                JOIN RepoSize rs ON o.repo_id = rs.repo_id
                WHERE org_id = :org_id
                AND v.repo_id IS NULL
                """
        result = self.session.execute(text(sql), {'org_id': org_id})
        rows = result.fetchone()
        if not rows:
            return None
        return rows[0]

    def get_user_quota(self, email):
        '''
        Geting user / org_user / org quota is related not only to the records in the database，
        but also to the configurations in seafile.conf.

        To simplify the logic here, the seafile_api is used to directly obtain the quota
        instead of directly searching in the database.

        '''

        return seafile_api.get_user_quota(email)


    def get_org_user_quota(self, org_id, email):

        return seafile_api.get_org_user_quota(org_id, email)


    def get_org_quota(self, org_id):

        return seafile_api.get_org_quota(org_id)
