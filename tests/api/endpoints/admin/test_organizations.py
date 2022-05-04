import json
from mock import patch
import os
import pytest

from seaserv import ccnet_api
from django.urls import reverse
from django.test import override_settings

from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring

from seaserv import seafserv_threaded_rpc

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

TRAVIS = 'TRAVIS' in os.environ

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

class AdminOrganizationsTest(BaseTestCase):

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
        assert 'org_id' in users[0]
        assert 'org_name' in users[0]
        assert 'ctime' in users[0]
        assert 'org_url_prefix' in users[0]
        assert 'creator_email' in users[0]
        assert 'creator_name' in users[0]
        assert 'creator_contact_email' in users[0]
        assert 'quota' in users[0]

    def test_can_get_orgs(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin_no_other_permission)
        resp = self.client.get(self.orgs_url)
        self.assertEqual(403, resp.status_code)

    def test_can_not_get_orgs_if_not_admin(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)
        resp = self.client.get(self.orgs_url)
        self.assertEqual(403, resp.status_code)

    def test_can_create_org(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)

        org_name = randstring(6)
        owner_email = '%s@%s.com' % (randstring(6), randstring(6))
        password = randstring(6)
        data = {'org_name': org_name, 'owner_email': owner_email, 'password': password}

        resp = self.client.post(self.orgs_url, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert org_name == json_resp['org_name']
        assert owner_email == json_resp['creator_email']


@pytest.mark.skipif(TRAVIS, reason="pro only")
class AdminOrganizationTest(BaseTestCase):
    def setUp(self):
        org_name = randstring(6)
        org_url_prefix = randstring(6)
        tmp_user = self.create_user(email='%s@%s.com' % (randstring(6), randstring(6)))
        org_creator = tmp_user.username
        org_id = ccnet_api.create_org(
            org_name, org_url_prefix, org_creator)

        self.org = ccnet_api.get_org_by_id(org_id)
        self.url = reverse('api-v2.1-admin-organization', args=[self.org.org_id])
        self.login_as(self.admin)

    def tearDown(self, ):
        users = ccnet_api.get_org_emailusers(self.org.url_prefix, -1, -1)
        for u in users:
            ccnet_api.remove_org_user(self.org.org_id, u.email)

        ccnet_api.remove_org(self.org.org_id)

    def test_can_get(self, ):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['org_id'] == self.org.org_id
        assert json_resp['role'] == 'default'

    @patch('seahub.api2.endpoints.admin.organizations.get_available_roles')
    @patch('seahub.organizations.models.get_available_roles')
    def test_can_update_role(self, mock_1, mock_2):
        mock_1.return_value = ['default', 'custom']
        mock_2.return_value = ['default', 'custom']

        resp = self.client.put(self.url, 'role=custom',
                               'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['org_id'] == self.org.org_id
        assert json_resp['role'] == 'custom'
