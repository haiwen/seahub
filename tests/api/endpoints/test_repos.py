import json
from django.core.urlresolvers import reverse
from seaserv import seafile_api
from seahub.test_utils import BaseTestCase
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email

class RepoViewTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.url = reverse('api-v2.1-repo-view', args=[self.repo.id])

    def tearDown(self):
        self.remove_repo()

    def test_can_get(self):

        self.login_as(self.user)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['repo_id'] == self.repo.id
        assert json_resp['repo_name'] == self.repo.name

        assert json_resp['owner_email'] == self.user_name
        assert json_resp['owner_name'] == email2nickname(self.user_name)
        assert json_resp['owner_contact_email'] == email2contact_email(self.user_name)

        assert json_resp['permission'] == 'rw'

        self.assertFalse(json_resp['encrypted'])
        self.assertIsNotNone(json_resp['file_count'])
        self.assertIsNotNone(json_resp['size'])

    def test_can_get_be_shared_repo_info(self):

        # create admin repo
        admin_repo_id = seafile_api.create_repo(name='test-repo', desc='',
            username=self.admin_name, passwd=None)
        admin_repo = seafile_api.get_repo(admin_repo_id)

        # share admin repo to current user
        permission = 'r'
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, permission)

        self.login_as(self.user)

        url = reverse('api-v2.1-repo-view', args=[admin_repo_id])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['repo_id'] == admin_repo.id
        assert json_resp['repo_name'] == admin_repo.name

        assert json_resp['owner_email'] == self.admin_name
        assert json_resp['owner_name'] == email2nickname(self.admin_name)
        assert json_resp['owner_contact_email'] == email2contact_email(self.admin_name)

        assert json_resp['permission'] == permission

        self.assertFalse(json_resp['encrypted'])
        self.assertIsNotNone(json_resp['file_count'])
        self.assertIsNotNone(json_resp['size'])

        self.remove_repo(admin_repo_id)

    def test_get_with_invalid_authentication(self):

        self.login_as(self.admin)

        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_get_with_invalid_permission(self):

        admin_repo_id = seafile_api.create_repo(name='test-repo', desc='',
            username=self.admin_name, passwd=None)

        self.login_as(self.user)

        url = reverse('api-v2.1-repo-view', args=[admin_repo_id])
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

        self.remove_repo(admin_repo_id)

    def test_get_with_invalid_repo(self):

        self.login_as(self.user)

        repo_id = self.repo.id
        invalid_repo_id = repo_id[0:-5] + '12345'

        url = reverse('api-v2.1-repo-view', args=[invalid_repo_id])
        resp = self.client.get(url)
        self.assertEqual(404, resp.status_code)
