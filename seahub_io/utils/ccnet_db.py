import logging
from seahub_io.db import init_db_session_class
from sqlalchemy import text

logger = logging.getLogger('seahub_io')


class CcnetDB(object):
    def __init__(self):
        self.session = init_db_session_class(db = 'ccnet')()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            self.session.close()

    def get_group_info(self, group):
        info = {
            'group_id': group[0],
            'group_name': group[1],
            'creator_name': group[2],
            'timestamp': group[3],
            'type': group[4],
            'parent_group_id': group[5]
        }
        return info

    def get_groups_by_ids(self, group_ids):

        if not group_ids:
            return {}

        group_ids = [str(id) for id in group_ids]
        if len(group_ids) == 1:
            sql = "SELECT * FROM `Group` WHERE group_id = :group_id"
            params = {'group_id': group_ids[0]}
        else:
            sql = "SELECT * FROM `Group` WHERE group_id IN :group_ids"
            params = {'group_ids': tuple(group_ids)}

        result = self.session.execute(text(sql), params)
        groups_map = {}
        for item in result.fetchall():
            groups_map[item[0]] = self.get_group_info(item)
        return groups_map

    def get_org_user_count(self, org_id):
        sql = "SELECT COUNT(1) FROM OrgUser WHERE org_id = :org_id"
        result = self.session.execute(text(sql), {'org_id': org_id})
        return result.fetchone()[0]

    def get_user_role(self, email):
        sql = "SELECT role FROM UserRole WHERE email = :email"
        result = self.session.execute(text(sql), {'email': email})
        row = result.fetchone()
        return row[0] if row else 'default'
