import json
from mock import patch

from django.core.urlresolvers import reverse
# from django.test import override_settings

from seaserv import seafile_api, ccnet_api, seafserv_threaded_rpc
from tests.common.utils import randstring
from seahub.test_utils import BaseTestCase

class AlphaBoxReposTest(BaseTestCase):

    def setUp(self):

        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.url = reverse('api-v2.1-alpha-box-repos')

        self.org_name = randstring(6)
        self.url_prefix = randstring(6)
        self.org_id = ccnet_api.create_org(self.org_name,
                self.url_prefix, self.user_name)

        self.org_repo_name = randstring(6)
        self.org_repo_id = seafile_api.create_org_repo(
                self.org_repo_name, '', self.user_name, None, self.org_id)

    def tearDown(self):
        self.remove_repo(self.org_repo_id)

        all_orgs = ccnet_api.get_all_orgs(-1, -1)
        for org in all_orgs:
            org_id = org.org_id
            if org_id == 2:
                continue
            org = ccnet_api.get_org_by_id(org_id)
            users = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
            for u in users:
                ccnet_api.remove_org_user(org_id, u.email)

            groups = ccnet_api.get_org_groups(org_id, -1, -1)
            for g in groups:
                ccnet_api.remove_org_group(org_id, g.gid)

            # remove org repos
            seafserv_threaded_rpc.remove_org_repo_by_org_id(org_id)

            # remove org
            ccnet_api.remove_org(org_id)

    # write the following settings to local_settings.py
    # CLOUD_MODE = True
    # MULTI_TENANCY = True

    @patch('seahub.api2.endpoints.alpha_box_repos.is_org_context')
    def test_get_my_owned_repos(self, mock_is_org_context):

        mock_is_org_context.return_value = True

        self.login_as(self.user)
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp[0]['repo_id'] == self.org_repo_id
        assert json_resp[0]['name'] == self.org_repo_name
        assert json_resp[0]['share_link']['has_download_link'] == False
        assert json_resp[0]['share_link']['has_upload_link'] == False


class AlphaBoxRepoTest(BaseTestCase):

    def setUp(self):

        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.repos_url = reverse('api-v2.1-alpha-box-repos')

        self.org_name = randstring(6)
        self.url_prefix = randstring(6)
        self.org_id = ccnet_api.create_org(self.org_name,
                self.url_prefix, self.user_name)

        self.org_repo_name = randstring(6)
        self.org_repo_id = seafile_api.create_org_repo(
                self.org_repo_name, '', self.user_name, None, self.org_id)
        self.url = reverse('api-v2.1-alpha-box-repo', args=[self.org_repo_id])

    def tearDown(self):
        self.remove_repo(self.org_repo_id)

        all_orgs = ccnet_api.get_all_orgs(-1, -1)
        for org in all_orgs:
            org_id = org.org_id
            if org_id == 2:
                continue
            org = ccnet_api.get_org_by_id(org_id)
            users = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
            for u in users:
                ccnet_api.remove_org_user(org_id, u.email)

            groups = ccnet_api.get_org_groups(org_id, -1, -1)
            for g in groups:
                ccnet_api.remove_org_group(org_id, g.gid)

            # remove org repos
            seafserv_threaded_rpc.remove_org_repo_by_org_id(org_id)

            # remove org
            ccnet_api.remove_org(org_id)

    @patch('seahub.api2.endpoints.alpha_box_repos.is_org_context')
    def test_star_unstar_repo(self, mock_is_org_context):

        mock_is_org_context.return_value = True

        self.login_as(self.user)

        # repo not starred
        resp = self.client.get(self.repos_url)
        json_resp = json.loads(resp.content)
        assert json_resp[0]['starred'] == False

        # star a repo
        data = {"starred": 'true'}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(200, resp.status_code)

        # repo starred
        resp = self.client.get(self.repos_url)
        json_resp = json.loads(resp.content)
        assert json_resp[0]['starred'] == True

        # unstar a repo
        data = {"starred": 'false'}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(200, resp.status_code)

        # repo not starred
        resp = self.client.get(self.repos_url)
        json_resp = json.loads(resp.content)
        assert json_resp[0]['starred'] == False

    def test_can_not_star_repo_with_invalid_repo_permission(self):

        self.login_as(self.admin)

        data = {"starred": 'true'}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(403, resp.status_code)

    def test_can_not_unstar_repo_with_invalid_repo_permission(self):

        self.login_as(self.admin)

        data = {"starred": 'true'}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.alpha_box_repos.is_org_context')
    def test_update_repo_status(self, mock_is_org_context):

        mock_is_org_context.return_value = True

        self.login_as(self.user)

        # repo has no status
        resp = self.client.get(self.repos_url)
        json_resp = json.loads(resp.content)
        assert json_resp[0]['status'] == ''

        # update repo's status
        status = randstring(6)
        data = {"status": status}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(200, resp.status_code)

        # repo has status
        resp = self.client.get(self.repos_url)
        json_resp = json.loads(resp.content)
        assert json_resp[0]['status'] == status

    def test_can_not_update_repo_status_with_invalid_repo_permission(self):

        self.login_as(self.admin)

        data = {"status": randstring(6)}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(403, resp.status_code)
