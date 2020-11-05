import json
from django.urls import reverse
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring
from seahub.share.models import FileShare, UploadLinkShare

class AdminLibrariesTest(BaseTestCase):

    def setUp(self):
        self.libraries_url = reverse('api-v2.1-admin-libraries')

    def tearDown(self):
        self.remove_repo()

    def test_get_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.get(self.libraries_url)
        self.assertEqual(403, resp.status_code)

    def test_post_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.post(self.libraries_url)
        self.assertEqual(403, resp.status_code)

    def test_can_get(self):
        self.login_as(self.admin)
        resp = self.client.get(self.libraries_url)

        json_resp = json.loads(resp.content)
        assert len(json_resp['repos']) > 0

    def test_can_search_by_name(self):
        self.login_as(self.admin)
        repo_name =  self.repo.repo_name
        searched_args = repo_name[0:1]
        url = self.libraries_url + '?name=%s' % searched_args
        resp = self.client.get(url)

        json_resp = json.loads(resp.content)
        assert json_resp['name'] == searched_args
        assert searched_args in json_resp['repos'][0]['name']

    def test_get_with_invalid_user_permission(self):
        self.login_as(self.user)
        resp = self.client.get(self.libraries_url)
        self.assertEqual(403, resp.status_code)

    def test_can_create(self):
        self.login_as(self.admin)

        repo_name = randstring(6)
        repo_owner = self.user.username

        data = {
            'name': repo_name,
            'owner': repo_owner,
        }

        resp = self.client.post(self.libraries_url, data)

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['name'] == repo_name
        assert json_resp['owner'] == repo_owner

        self.remove_repo(json_resp['id'])

    def test_can_create_without_owner_parameter(self):
        self.login_as(self.admin)

        repo_name = randstring(6)

        data = {
            'name': repo_name,
        }

        resp = self.client.post(self.libraries_url, data)

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['name'] == repo_name
        assert json_resp['owner'] == self.admin.username

        self.remove_repo(json_resp['id'])

    def test_create_with_invalid_user_permission(self):
        self.login_as(self.user)

        repo_name = randstring(6)
        repo_owner = self.user.username

        data = {
            'name': repo_name,
            'owner': repo_owner,
        }

        resp = self.client.post(self.libraries_url, data)
        self.assertEqual(403, resp.status_code)

    def test_create_with_invalid_name_parameter(self):
        self.login_as(self.admin)

        repo_name = randstring(6)
        repo_owner = self.user.username

        data = {
            'invalid_name': repo_name,
            'owner': repo_owner,
        }

        resp = self.client.post(self.libraries_url, data)
        self.assertEqual(400, resp.status_code)

    def test_create_with_unexisted_user(self):
        self.login_as(self.admin)

        repo_name = randstring(6)
        repo_owner = '%s@email.com' % randstring(6)

        data = {
            'name': repo_name,
            'owner': repo_owner,
        }

        resp = self.client.post(self.libraries_url, data)
        self.assertEqual(404, resp.status_code)


class AdminLibraryTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.repo_id= self.repo.repo_id

        self.library_url = reverse('api-v2.1-admin-library', args=[self.repo_id])
        self.fs_share = FileShare.objects.create_dir_link(self.user.username,
             self.repo_id, self.folder, None, None)

        self.fs_upload = UploadLinkShare.objects.create_upload_link_share(self.user.username,
             self.repo_id, self.folder, None, None)

    def test_get_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.get(self.library_url)
        self.assertEqual(403, resp.status_code)

    def test_delete_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.delete(self.library_url)
        self.assertEqual(403, resp.status_code)

    def test_put_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.put(self.library_url)
        self.assertEqual(403, resp.status_code)

    def test_can_update_status_to_read_only(self):

        self.login_as(self.admin)

        data = 'status=%s' % 'read-only'
        resp = self.client.put(self.library_url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['status'] == 'read-only'

        data = 'status=%s' % 'normal'
        resp = self.client.put(self.library_url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['status'] == 'normal'

    def test_update_status_with_invalid_args(self):

        self.login_as(self.admin)

        data = 'status=%s' % 'invalid_args'
        resp = self.client.put(self.library_url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(400, resp.status_code)

    def test_can_get(self):

        self.login_as(self.admin)

        resp = self.client.get(self.library_url)

        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['owner'] == self.user_name
        assert json_resp['name'] == self.repo.repo_name
        assert json_resp['status'] == 'normal'

    def test_get_with_invalid_user_permission(self):

        self.login_as(self.user)
        resp = self.client.get(self.library_url)
        self.assertEqual(403, resp.status_code)

    def test_can_not_transfer_library_to_owner(self):

        self.login_as(self.admin)

        data = 'owner=%s' % self.user_name
        resp = self.client.put(self.library_url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(400, resp.status_code)

    def test_can_transfer(self):

        self.login_as(self.admin)

        data = 'owner=%s' % self.admin_name
        resp = self.client.put(self.library_url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['owner'] == self.admin_name

    def test_transfer_group_invalid_user_permission(self):

        self.login_as(self.user)

        data = 'owner=%s' % self.admin_name
        resp = self.client.put(self.library_url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_transfer_group_invalid_args(self):

        self.login_as(self.admin)

        # new owner not exist
        data = 'owner=invalid@email.com'
        resp = self.client.put(self.library_url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

    def test_can_delete(self):
        self.login_as(self.admin)
        resp = self.client.delete(self.library_url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

    def test_delete_with_invalid_user_permission(self):
        self.login_as(self.user)
        resp = self.client.delete(self.library_url)
        self.assertEqual(403, resp.status_code)

    def test_reshare_to_share_links_after_transfer_repo(self):
        self.login_as(self.admin)

        assert len(UploadLinkShare.objects.all()) == 1

        data = 'owner=%s' % self.admin_name
        resp = self.client.put(self.library_url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['owner'] == self.admin_name

    def test_reshare_to_upload_links_after_transfer_repo(self):
        self.login_as(self.admin)

        assert len(UploadLinkShare.objects.all()) == 1

        data = 'owner=%s' % self.admin_name
        resp = self.client.put(self.library_url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['owner'] == self.admin_name
