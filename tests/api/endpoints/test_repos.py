import json
import random
import copy
import string
from mock import patch
from django.core.urlresolvers import reverse
from seaserv import seafile_api
from seahub.role_permissions.settings import ENABLED_ROLE_PERMISSIONS
from seahub.test_utils import BaseTestCase
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email

TEST_CAN_ADD_REPO_FALSE = copy.deepcopy(ENABLED_ROLE_PERMISSIONS)
TEST_CAN_ADD_REPO_FALSE['default']['can_add_repo'] = False

def getRandomValidRepoName():
    random_name_len = random.randrange(1, 257)
    return ''.join([random.choice(string.ascii_letters + string.digits) for n in range(random_name_len)])

def getRandomInvalidRepoName():
    random_name_len = random.randrange(1, 256)
    random_position = random.randrange(0, random_name_len)
    name = [random.choice(string.ascii_letters + string.digits) for n in range(random_name_len)]
    name[random_position] = '/'
    return ''.join(name)

def getRandomRepoPassword():
    random_name_len = random.randrange(1, 257)
    return ''.join([random.choice(string.ascii_letters + string.digits) for n in range(random_name_len)])

def getRandomStorageID():
    return random.randint(1, 10)

class ReposViewTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.url = reverse('api-v2.1-repos-view')

    def tearDown(self):
        self.remove_repo()

    def test_can_create_repo(self):
        self.login_as(self.user)
        repo_name = getRandomValidRepoName()
        data = {
            'repo_name': repo_name,
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 6
        assert json_resp['repo_name'] == repo_name

    def test_can_create_repo_in_org_context(self):
        self.login_as(self.org_user)
        repo_name = getRandomValidRepoName()
        data = {
            'repo_name': repo_name,
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 6
        assert json_resp['repo_name'] == repo_name

    def test_create_repo_with_no_permission(self):
        self.login_as(self.user)
        repo_name = getRandomValidRepoName()
        data = {
            'repo_name': repo_name,
        }
        with patch('seahub.role_permissions.utils.ENABLED_ROLE_PERMISSIONS', TEST_CAN_ADD_REPO_FALSE):
            resp = self.client.post(self.url, data)
            self.assertEqual(403, resp.status_code)

    def test_create_repo_with_invalid_name(self):
        self.login_as(self.user)
        repo_name_invalid = getRandomInvalidRepoName()
        data = {
            'repo_name': repo_name_invalid,
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

        data = {
            'repo_name': '',
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

    def test_create_repo_with_passwd(self):
        self.login_as(self.user)
        repo_name = getRandomValidRepoName()
        data = {
            'repo_name': repo_name,
            'passwd': getRandomRepoPassword()
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

    @patch('seahub.api2.endpoints.repos.ENABLE_ENCRYPTED_LIBRARY', False)
    def test_create_repo_not_enable_encrypt(self):
        self.login_as(self.user)
        repo_name = getRandomValidRepoName()
        data = {
            'repo_name': repo_name,
            'passwd': getRandomRepoPassword()
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.repos.ENABLE_STORAGE_CLASSES', True)
    def test_enable_multiple_storage_with_no_storage_id(self):
        self.login_as(self.user)
        repo_name = getRandomValidRepoName()
        data = {
            'repo_name': repo_name,
            'storage_id': getRandomStorageID()
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)



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
        assert json_resp['status'] == 'normal'

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
        assert json_resp['status'] == 'normal'

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

    def test_delete_with_normal_status(self):

        self.login_as(self.user)

        resp = self.client.delete(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp == 'success'

    def test_delete_with_read_only_status(self):
        self.login_as(self.user)

        seafile_api.set_repo_status(self.repo.id, 1)

        resp = self.client.delete(self.url)
        self.assertEqual(403, resp.status_code)
