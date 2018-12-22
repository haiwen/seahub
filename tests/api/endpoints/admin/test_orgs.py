import json

from seaserv import ccnet_api
from django.core.urlresolvers import reverse
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring

from seaserv import seafserv_threaded_rpc

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

def remove_org(org_id):
    org_id = int(org_id)
    org = ccnet_api.get_org_by_id(org_id)
    if org:
        users =ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
        for u in users:
            ccnet_api.remove_org_user(org_id, u.email)

        groups = ccnet_api.get_org_groups(org.org_id, -1, -1)
        for g in groups:
            ccnet_api.remove_org_group(org_id, g.gid)

        # remove org repos
        seafserv_threaded_rpc.remove_org_repo_by_org_id(org_id)

        # remove org
        ccnet_api.remove_org(org_id)

class OrgsTest(BaseTestCase):

    def setUp(self):

        self.user_name = self.user.username
        self.admin_name = self.admin.username

        if LOCAL_PRO_DEV_ENV:
            self.org_name = randstring(6)
            self.org_url_prefix = randstring(6)
            tmp_user = self.create_user(email='%s@%s.com' % (randstring(6), randstring(6)))
            self.org_creator = tmp_user.username
            self.org_id = ccnet_api.create_org(self.org_name,
                    self.org_url_prefix, self.org_creator)
            self.orgs_url = reverse('api-v2.1-admin-organizations')

    def tearDown(self):
        self.remove_group()
        self.remove_repo()

        if LOCAL_PRO_DEV_ENV:
            remove_org(self.org_id)
            self.remove_user(self.org_creator)

    def test_can_get_orgs(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)
        resp = self.client.get(self.orgs_url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        users = json_resp['organizations']
        assert len(users) > 0
        assert users[0].has_key('org_id')
        assert users[0].has_key('org_name')
        assert users[0].has_key('ctime')
        assert users[0].has_key('org_url_prefix')
        assert users[0].has_key('creator_email')
        assert users[0].has_key('creator_name')
        assert users[0].has_key('creator_contact_email')
        assert users[0].has_key('quota')

    def test_can_not_get_orgs_if_not_admin(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)
        resp = self.client.get(self.orgs_url)
        self.assertEqual(403, resp.status_code)
