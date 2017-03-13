import json
from mock import patch

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

class OrgUsersTest(BaseTestCase):

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
            self.org_users_url = reverse('api-v2.1-admin-org-users',
                    args=[self.org_id])

    def tearDown(self):
        self.remove_group()
        self.remove_repo()

        if LOCAL_PRO_DEV_ENV:
            remove_org(self.org_id)
            self.remove_user(self.org_creator)

    def test_can_create(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)

        email = '%s@%s.com' % (randstring(6), randstring(6))
        data = {'email': email, 'password': randstring(6)}
        resp = self.client.post(self.org_users_url, data)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert json_resp['email'] == email

    def test_can_not_create_if_not_admin(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        email = '%s@%s.com' % (randstring(6), randstring(6))
        data = {'email': email, 'password': randstring(6)}
        resp = self.client.post(self.org_users_url, data)
        self.assertEqual(403, resp.status_code)

    def test_create_with_invalid_org_id(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)

        invalid_org_users_url = reverse('api-v2.1-admin-org-users', args=[0])

        email = '%s@%s.com' % (randstring(6), randstring(6))
        data = {'email': email, 'password': randstring(6)}
        resp = self.client.post(invalid_org_users_url, data)
        self.assertEqual(400, resp.status_code)

    def test_create_with_existed_user(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)

        data = {'email': self.admin_name, 'password': randstring(6)}
        resp = self.client.post(self.org_users_url, data)
        self.assertEqual(400, resp.status_code)

    @patch('seahub.api2.endpoints.admin.org_users.user_number_over_limit')
    def test_create_with_user_number_over_limit(self, mock_user_number_over_limit):

        if not LOCAL_PRO_DEV_ENV:
            return

        mock_user_number_over_limit.return_value = True

        self.login_as(self.admin)

        email = '%s@%s.com' % (randstring(6), randstring(6))
        data = {'email': email, 'password': randstring(6)}
        resp = self.client.post(self.org_users_url, data)
        self.assertEqual(403, resp.status_code)

class OrgUserTest(BaseTestCase):

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
            self.org_users_url = reverse('api-v2.1-admin-org-users',
                    args=[self.org_id])

    def tearDown(self):
        self.remove_group()
        self.remove_repo()

        if LOCAL_PRO_DEV_ENV:
            remove_org(self.org_id)
            self.remove_user(self.org_creator)

    def test_can_delete(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        email = '%s@%s.com' % (randstring(6), randstring(6))
        self.create_user(email=email)
        ccnet_api.add_org_user(self.org_id, email, 0)
        assert ccnet_api.org_user_exists(self.org_id, email) == 1

        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-org-user', args=[self.org_id, email])
        resp = self.client.delete(url)

        self.assertEqual(200, resp.status_code)
        assert ccnet_api.org_user_exists(self.org_id, email) == 0

    def test_can_not_delete_if_not_admin(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        email = '%s@%s.com' % (randstring(6), randstring(6))
        self.create_user(email=email)
        ccnet_api.add_org_user(self.org_id, email, 0)
        assert ccnet_api.org_user_exists(self.org_id, email) == 1

        self.login_as(self.user)
        url = reverse('api-v2.1-admin-org-user', args=[self.org_id, email])
        resp = self.client.delete(url)

        self.assertEqual(403, resp.status_code)

    def test_delete_org_creator(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-org-user', args=[self.org_id,
            self.org_creator])
        resp = self.client.delete(url)

        self.assertEqual(403, resp.status_code)

    def test_delete_invalid_user(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        not_existed_user = '%s@%s.com' % (randstring(6), randstring(6))

        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-org-user', args=[self.org_id,
            not_existed_user])
        resp = self.client.delete(url)

        self.assertEqual(404, resp.status_code)

    def test_can_update(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        email = '%s@%s.com' % (randstring(6), randstring(6))
        tmp_user = self.create_user(email=email)
        ccnet_api.add_org_user(self.org_id, email, 0)
        assert ccnet_api.org_user_exists(self.org_id, email) == 1
        assert tmp_user.is_active

        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-org-user', args=[self.org_id, email])
        status = 'false'
        data = 'active=%s' % status
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['active'] is False

    def test_update_with_invalid_args(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        email = '%s@%s.com' % (randstring(6), randstring(6))
        tmp_user = self.create_user(email=email)
        ccnet_api.add_org_user(self.org_id, email, 0)
        assert ccnet_api.org_user_exists(self.org_id, email) == 1
        assert tmp_user.is_active

        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-org-user', args=[self.org_id, email])
        status = 'fals'
        data = 'active=%s' % status
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)
