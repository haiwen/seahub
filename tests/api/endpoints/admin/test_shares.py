import json

from django.urls import reverse

from seaserv import seafile_api

from seahub.test_utils import BaseTestCase
from seahub.share.models import ExtraSharePermission

class Shares(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.group_id = self.group.id

        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.para = '?repo_id=%s&path=/' % self.repo_id
        self.url = reverse('api-v2.1-admin-shares')

        self.tmp_user = self.create_user('tmp@email.com')
        self.tmp_user_email = self.tmp_user.username

    def tearDown(self):
        self.remove_repo()
        self.remove_user(self.tmp_user_email)

    def test_can_get_user_shared(self):

        self.share_repo_to_admin_with_rw_permission()

        self.login_as(self.admin)

        resp = self.client.get(self.url + self.para + '&share_type=user')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert json_resp[0]['repo_id'] == self.repo_id
        assert json_resp[0]['path'] == '/'
        assert json_resp[0]['share_type'] == 'user'
        assert json_resp[0]['user_email'] == self.admin_name
        assert json_resp[0]['permission'] == 'rw'

    def test_can__no_permission(self):

        self.share_repo_to_admin_with_rw_permission()

        self.login_as(self.admin_no_other_permission)

        resp = self.client.get(self.url + self.para + '&share_type=user')
        self.assertEqual(403, resp.status_code)

    def test_can_get_user_shared_with_admin(self):

        self.share_repo_to_admin_with_admin_permission()

        self.login_as(self.admin)

        resp = self.client.get(self.url + self.para + '&share_type=user')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert json_resp[0]['repo_id'] == self.repo_id
        assert json_resp[0]['path'] == '/'
        assert json_resp[0]['share_type'] == 'user'
        assert json_resp[0]['user_email'] == self.admin_name
        assert json_resp[0]['permission'] == 'rw'
        assert json_resp[0]['is_admin'] == True

    def test_can_get_group_shared(self):

        self.share_repo_to_group_with_rw_permission()

        self.login_as(self.admin)

        resp = self.client.get(self.url + self.para + '&share_type=group')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert json_resp[0]['repo_id'] == self.repo_id
        assert json_resp[0]['path'] == '/'
        assert json_resp[0]['share_type'] == 'group'
        assert json_resp[0]['group_id'] == self.group_id
        assert json_resp[0]['permission'] == 'rw'

    def test_can_get_group_shared_with_admin(self):

        self.share_repo_to_group_with_admin_permission()

        self.login_as(self.admin)

        resp = self.client.get(self.url + self.para + '&share_type=group')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert json_resp[0]['repo_id'] == self.repo_id
        assert json_resp[0]['path'] == '/'
        assert json_resp[0]['share_type'] == 'group'
        assert json_resp[0]['group_id'] == self.group_id
        assert json_resp[0]['permission'] == 'rw'
        assert json_resp[0]['is_admin'] == True

    def test_get_with_invalid_permission(self):

        self.login_as(self.user)

        resp = self.client.get(self.url + self.para + '&share_type=group')
        self.assertEqual(403, resp.status_code)

    def test_share_repo_to_user(self):

        self.login_as(self.admin)

        invalid_email = 'invalid@email.com'
        permission = 'r'

        data = {
            'repo_id': self.repo_id,
            'share_type': 'user',
            'permission': permission,
            'share_to': [invalid_email, self.tmp_user_email]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['failed'][0]['user_email'] == invalid_email
        assert json_resp['success'][0]['user_email'] == self.tmp_user_email
        assert json_resp['success'][0]['permission'] == permission

    def test_share_repo_to_user_with_admin_permission(self):

        self.login_as(self.admin)

        invalid_email = 'invalid@email.com'
        permission = 'admin'

        data = {
            'repo_id': self.repo_id,
            'share_type': 'user',
            'permission': permission,
            'share_to': [invalid_email, self.tmp_user_email]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['failed'][0]['user_email'] == invalid_email
        assert json_resp['success'][0]['user_email'] == self.tmp_user_email
        assert json_resp['success'][0]['permission'] == 'rw'
        assert json_resp['success'][0]['is_admin'] == True

    def test_share_repo_to_group(self):

        self.login_as(self.admin)

        invalid_group_id = -100
        permission = 'r'

        data = {
            'repo_id': self.repo_id,
            'share_type': 'group',
            'permission': permission,
            'share_to': [invalid_group_id, self.group_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['failed'][0]['group_id'] == invalid_group_id
        assert json_resp['success'][0]['group_id'] == self.group_id
        assert json_resp['success'][0]['permission'] == permission

    def test_share_repo_to_group_with_admin_permission(self):

        self.login_as(self.admin)

        invalid_group_id = -100
        permission = 'admin'

        data = {
            'repo_id': self.repo_id,
            'share_type': 'group',
            'permission': permission,
            'share_to': [invalid_group_id, self.group_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['failed'][0]['group_id'] == invalid_group_id
        assert json_resp['success'][0]['group_id'] == self.group_id
        assert json_resp['success'][0]['permission'] == 'rw'
        assert json_resp['success'][0]['is_admin'] == True

    def test_share_repo_with_invalid_user_permission(self):

        self.login_as(self.user)

        invalid_group_id = 'invalid_group_id'
        permission = 'r'

        data = {
            'repo_id': self.repo_id,
            'share_type': 'group',
            'permission': permission,
            'share_to': [invalid_group_id, self.group_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(403, resp.status_code)

    def test_modify_repo_user_share_permission(self):

        # user share repo to tmp user
        init_permission = 'rw'
        seafile_api.share_repo(self.repo_id,
                self.user_name, self.tmp_user_email, init_permission)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) == init_permission

        self.login_as(self.admin)

        modified_perm = 'r'
        data = 'repo_id=%s&share_type=%s&permission=%s&share_to=%s' % \
                (self.repo_id, 'user', modified_perm, self.tmp_user_email)
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) == modified_perm

    def test_modify_repo_user_share_permission_to_admin(self):

        # user share repo to tmp user
        init_permission = 'rw'
        seafile_api.share_repo(self.repo_id,
                self.user_name, self.tmp_user_email, init_permission)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) == init_permission

        self.login_as(self.admin)

        modified_perm = 'admin'
        data = 'repo_id=%s&share_type=%s&permission=%s&share_to=%s' % \
                (self.repo_id, 'user', modified_perm, self.tmp_user_email)
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['permission'] == 'rw'
        assert json_resp['is_admin'] == True
        assert json_resp['user_email'] == self.tmp_user_email

    def test_modify_repo_group_share_permission(self):

        # user share repo to tmp user
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
        data = 'repo_id=%s&share_type=%s&permission=%s&share_to=%s' % \
                (self.repo_id, 'group', modified_perm, self.group_id)
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        shared_groups = seafile_api.list_repo_shared_group(
                self.user_name, self.repo_id)

        for e in shared_groups:
            if e.group_id == self.group_id:
                permission = e.perm
                break

        assert  permission == modified_perm

    def test_modify_repo_group_share_permission_to_admin(self):

        # user share repo to tmp user
        self.share_repo_to_group_with_rw_permission()

        shared_groups = seafile_api.list_repo_shared_group(
                self.user_name, self.repo_id)

        for e in shared_groups:
            if e.group_id == self.group_id:
                permission = e.perm
                break

        assert permission == 'rw'

        self.login_as(self.admin)

        modified_perm = 'admin'
        data = 'repo_id=%s&share_type=%s&permission=%s&share_to=%s' % \
                (self.repo_id, 'group', modified_perm, self.group_id)
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['permission'] == 'rw'
        assert json_resp['is_admin'] == True
        assert json_resp['group_id'] == self.group_id

    def test_modify_with_invalid_user_permission(self):
        self.login_as(self.user)

        resp = self.client.put(self.url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_delete_repo_user_share_permission(self):

        # user share repo to tmp user
        init_permission = 'rw'
        seafile_api.share_repo(self.repo_id,
                self.user_name, self.tmp_user_email, init_permission)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) == init_permission

        self.login_as(self.admin)

        data = 'repo_id=%s&share_type=%s&share_to=%s' % \
                (self.repo_id, 'user', self.tmp_user_email)
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) is None

    def test_delete_repo_user_share_admin_permission(self):

        # user share repo to tmp user
        init_permission = 'rw'
        seafile_api.share_repo(self.repo_id,
                self.user_name, self.tmp_user_email, init_permission)

        ExtraSharePermission.objects.create_share_permission(self.repo.id, self.tmp_user_email, 'admin')

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) == init_permission

        self.login_as(self.admin)

        resp = self.client.get(self.url + self.para + '&share_type=user')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert json_resp[0]['repo_id'] == self.repo_id
        assert json_resp[0]['path'] == '/'
        assert json_resp[0]['share_type'] == 'user'
        assert json_resp[0]['user_email'] == self.tmp_user_email
        assert json_resp[0]['permission'] == 'rw'
        assert json_resp[0]['is_admin'] == True

        data = 'repo_id=%s&share_type=%s&share_to=%s' % \
                (self.repo_id, 'user', self.tmp_user_email)
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        assert seafile_api.check_permission_by_path(self.repo_id, \
                '/', self.tmp_user_email) is None

        resp = self.client.get(self.url + self.para + '&share_type=user')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert not json_resp

    def test_delete_repo_group_share_permission(self):

        self.share_repo_to_group_with_rw_permission()

        shared_groups = seafile_api.list_repo_shared_group(
                self.user_name, self.repo_id)
        for e in shared_groups:
            if e.group_id == self.group_id:
                permission = e.perm
                break

        assert permission == 'rw'

        self.login_as(self.admin)

        data = 'repo_id=%s&share_type=%s&share_to=%s' % \
                (self.repo_id, 'group', self.group_id)
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

    def test_delete_repo_group_share_admin_permission(self):

        self.share_repo_to_group_with_admin_permission()

        shared_groups = seafile_api.list_repo_shared_group(
                self.user_name, self.repo_id)
        for e in shared_groups:
            if e.group_id == self.group_id:
                permission = e.perm
                break

        assert permission == 'rw'

        self.login_as(self.admin)

        resp = self.client.get(self.url + self.para + '&share_type=group')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert json_resp[0]['repo_id'] == self.repo_id
        assert json_resp[0]['path'] == '/'
        assert json_resp[0]['share_type'] == 'group'
        assert json_resp[0]['group_id'] == self.group_id
        assert json_resp[0]['permission'] == 'rw'
        assert json_resp[0]['is_admin'] == True

        data = 'repo_id=%s&share_type=%s&share_to=%s' % \
                (self.repo_id, 'group', self.group_id)
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

    def test_delete_with_invalid_user_permission(self):

        self.login_as(self.user)
        resp = self.client.delete(self.url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_delete_with_unshared_group(self):

        self.login_as(self.admin)
        data = 'repo_id=%s&share_type=%s&share_to=%s' % \
                (self.repo_id, 'group', self.group_id)
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)


    def test_delete_with_unshared_user(self):

        self.login_as(self.admin)
        data = 'repo_id=%s&share_type=%s&share_to=%s' % \
                (self.repo_id, 'user', self.tmp_user_email)
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

