import json

from django.core.urlresolvers import reverse

from seaserv import seafile_api

from seahub.test_utils import BaseTestCase

class AdminLibraryUserShare(BaseTestCase):

    def share_repo_to_user(self):

        # user share repo to admin
        seafile_api.share_repo(
                self.repo.id, self.user.username,
                self.admin.username, 'rw')

    def setUp(self):
        self.repo_id = self.repo.id
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.url = reverse('api-v2.1-admin-library-user-shares', args = [self.repo_id])

        self.tmp_user = self.create_user('tmp@email.com')
        self.tmp_user_email = self.tmp_user.username

    def tearDown(self):
        self.remove_repo()
        self.remove_user(self.tmp_user_email)

    def test_can_get(self):

        self.share_repo_to_user()

        self.login_as(self.admin)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp[0]['repo_id'] == self.repo_id

    def test_get_with_invalid_user_permission(self):

        self.share_repo_to_user()

        self.login_as(self.user)

        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_admin_share_repo_to_user(self):

        self.login_as(self.admin)

        invalid_email = 'invalid@email.com'

        data = {
            'permission': 'r',
            'email': [invalid_email, self.tmp_user_email]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['failed'][0]['user_email'] == invalid_email
        assert json_resp['success'][0]['user_email'] == self.tmp_user_email

    def test_share_repo_with_invalid_user_permission(self):

        self.login_as(self.user)

        invalid_email = 'invalid@email.com'
        tmp_user = self.create_user('tmp@email.com')
        tmp_user_email = tmp_user.username

        data = {
            'permission': 'r',
            'email': [invalid_email, tmp_user_email]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(403, resp.status_code)

    def test_admin_modify_repo_user_share_permission(self):

        # user share repo to tmp user
        init_permission = 'rw'
        seafile_api.share_repo(
                self.repo_id, self.user_name,
                self.tmp_user_email, init_permission)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) == init_permission

        self.login_as(self.admin)

        modified_perm = 'r'
        url = reverse('api-v2.1-admin-library-user-share', args = [self.repo_id])
        data = 'permission=%s&user_email=%s' % (modified_perm, self.tmp_user_email)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) == modified_perm

    def test_modify_with_invalid_user_permission(self):

        # user share repo to tmp user
        init_permission = 'rw'
        seafile_api.share_repo(
                self.repo_id, self.user_name,
                self.tmp_user_email, init_permission)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) == init_permission

        self.login_as(self.user)

        modified_perm = 'r'
        url = reverse('api-v2.1-admin-library-user-share', args = [self.repo_id])
        data = 'permission=%s&user_email=%s' % (modified_perm, self.tmp_user_email)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_admin_delete_repo_user_share_permission(self):

        # user share repo to tmp user
        init_permission = 'rw'
        seafile_api.share_repo(
                self.repo_id, self.user_name,
                self.tmp_user_email, init_permission)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) == init_permission

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-library-user-share', args = [self.repo_id])
        data = 'permission=%s&user_email=%s' % (init_permission, self.tmp_user_email)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) is None

    def test_delete_with_invalid_user_permission(self):

        # user share repo to tmp user
        init_permission = 'rw'
        seafile_api.share_repo(
                self.repo_id, self.user_name,
                self.tmp_user_email, init_permission)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) == init_permission

        self.login_as(self.user)

        url = reverse('api-v2.1-admin-library-user-share', args = [self.repo_id])
        data = 'permission=%s&user_email=%s' % (init_permission, self.tmp_user_email)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)
