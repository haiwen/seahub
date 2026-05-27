import logging
from sqlalchemy import text

from seahub_io.app.config import ORG_MEMBER_QUOTA_DEFAULT, ORG_MEMBER_QUOTA_ENABLED
from seahub_io.db import init_db_session_class

logger = logging.getLogger('seahub_io')


class SeahubDB(object):

    def __init__(self):
        self.session = init_db_session_class(db='seahub')()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            self.session.close()

    def get_org_monthly_traffic_limit(self, org_id):
        sql = """
                SELECT monthly_traffic_limit
                FROM organizations_orgsettings
                WHERE org_id = :org_id
                """
        result = self.session.execute(text(sql), {'org_id': org_id})
        rows = result.fetchone()
        if not rows:
            return None
        return rows[0]

    def get_org_member_quota(self, org_id):
        if not ORG_MEMBER_QUOTA_ENABLED:
            return None
        sql = """
                SELECT quota
                FROM organizations_orgmemberquota
                WHERE org_id = :org_id
                """
        result = self.session.execute(text(sql), {'org_id': org_id})
        rows = result.fetchone()
        if not rows:
            return ORG_MEMBER_QUOTA_DEFAULT
        return rows[0]

    def get_org_role(self, org_id):
        sql = """
                SELECT role
                FROM organizations_orgsettings
                WHERE org_id = :org_id
                """
        result = self.session.execute(text(sql), {'org_id': org_id})
        rows = result.fetchone()
        if not rows:
            return 'default'
        return rows[0]
