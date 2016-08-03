import json

from django.core.urlresolvers import reverse

from seaserv import seafile_api

from seahub.test_utils import BaseTestCase

class AdminLibraryUserShare(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.group_id = self.group.id

        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.url = reverse('api-v2.1-admin-library-group-shares', args = [self.repo_id])

    def tearDown(self):
        self.remove_repo()
        self.remove_group(self.group.id)

    def test_can_get(self):

        self.share_repo_to_group_with_rw_permission()

        self.login_as(self.admin)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp[0]['repo_id'] == self.repo_id
        assert json_resp[0]['group_id'] == self.group_id

    def test_get_with_invalid_user_permission(self):

        self.share_repo_to_group_with_rw_permission()

        self.login_as(self.user)

        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_admin_share_repo_to_group(self):

        self.login_as(self.admin)

        permission = 'r'

        data = {
            'permission': permission,
            'group_id': [self.group_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['success'][0]['group_id'] == self.group_id
        assert json_resp['success'][0]['permission'] == permission

    def test_share_repo_with_invalid_user_permission(self):

        self.login_as(self.user)

        permission = 'r'

        data = {
            'permission': permission,
            'group_id': [self.group_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(403, resp.status_code)

    def test_admin_modify_repo_group_share_permission(self):

        self.share_repo_to_group_with_rw_permission()

        shared_groups = seafile_api.list_repo_shared_group(
                self.user_name, self.repo_id)

        for e in shared_groups:
            if e.group_id == self.group_id:
                permission = e.perm
                break

        assert permission == 'rw'

        self.login_as(self.admin)

        modified_perm = 'r'
        url = reverse('api-v2.1-admin-library-group-share', args = [self.repo_id])
        data = 'permission=%s&group_id=%s' % (modified_perm, self.group_id)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        shared_groups = seafile_api.list_repo_shared_group(
                self.user_name, self.repo_id)

        for e in shared_groups:
            if e.group_id == self.group_id:
                permission = e.perm
                break

        assert  permission == modified_perm

    def test_modify_with_invalid_user_permission(self):

        self.share_repo_to_group_with_rw_permission()

        shared_groups = seafile_api.list_repo_shared_group(
                self.user_name, self.repo_id)
        for e in shared_groups:
            if e.group_id == self.group_id:
                permission = e.perm
                break

        assert permission == 'rw'

        self.login_as(self.user)

        modified_perm = 'r'
        url = reverse('api-v2.1-admin-library-group-share', args = [self.repo_id])
        data = 'permission=%s&group_id=%s' % (modified_perm, self.group_id)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_admin_delete_repo_user_share_permission(self):

        self.share_repo_to_group_with_rw_permission()

        shared_groups = seafile_api.list_repo_shared_group(
                self.user_name, self.repo_id)
        for e in shared_groups:
            if e.group_id == self.group_id:
                permission = e.perm
                break

        assert permission == 'rw'

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-library-group-share', args = [self.repo_id])
        data = 'permission=%s&group_id=%s' % (permission, self.group_id)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

    def test_delete_with_invalid_user_permission(self):

        self.share_repo_to_group_with_rw_permission()

        shared_groups = seafile_api.list_repo_shared_group(
                self.user_name, self.repo_id)
        for e in shared_groups:
            if e.group_id == self.group_id:
                permission = e.perm
                break

        assert permission == 'rw'

        self.login_as(self.user)

        url = reverse('api-v2.1-admin-library-group-share', args = [self.repo_id])
        data = 'permission=%s&group_id=%s' % (permission, self.group_id)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)
