import json
from urllib.parse import urlencode

from seaserv import seafile_api

from seahub.share.models import ExtraSharePermission
from seahub.test_utils import BaseTestCase


class VirtualRepoSharingTest(BaseTestCase):

    def setUp(self):
        self.virtual_repo_id = seafile_api.share_subdir_to_user(
            self.repo.id, self.folder, self.user.username,
            self.admin.username, 'r')

    def tearDown(self):
        self.remove_repo()

    def test_owner_cannot_share_or_update_virtual_repo(self):
        self.login_as(self.user)
        for share_type, recipient in (
                ('user', {'username': self.admin.username}),
                ('group', {'group_id': self.group.id})):
            data = dict(recipient, share_type=share_type, permission='admin')
            url = '/api2/repos/%s/dir/shared_items/?p=/' % self.virtual_repo_id
            response = self.client.put(
                url, urlencode(data), 'application/x-www-form-urlencoded')
            self.assertEqual(400, response.status_code)

            response = self.client.post(url + '&' + urlencode(dict(
                recipient, share_type=share_type)), {'permission': 'admin'})
            self.assertEqual(400, response.status_code)

        data = {'share_type': 'personal', 'user': self.admin.username,
                'permission': 'admin'}
        response = self.client.put('/api2/shared-repos/%s/?%s' % (
            self.virtual_repo_id, urlencode(data)))
        self.assertEqual(400, response.status_code)

        response = self.client.put(
            '/api/v2.1/shared-repos/%s/' % self.virtual_repo_id,
            json.dumps(data), 'application/json')
        self.assertEqual(400, response.status_code)
        self.assertFalse(ExtraSharePermission.objects.filter(
            repo_id=self.virtual_repo_id).exists())
        shared_users = seafile_api.get_shared_users_for_subdir(
            self.repo.id, self.folder, self.user.username)
        self.assertEqual('r', shared_users[0].perm)

    def test_admin_cannot_share_or_update_virtual_repo(self):
        self.login_as(self.admin)
        for share_type, recipient in (
                ('user', self.admin.username), ('group', self.group.id)):
            data = {'repo_id': self.virtual_repo_id, 'path': '/',
                    'share_type': share_type, 'share_to': recipient,
                    'permission': 'admin'}
            for method in (self.client.post, self.client.put):
                response = method('/api/v2.1/admin/shares/',
                                  json.dumps(data), 'application/json')
                self.assertEqual(400, response.status_code)

    def test_batch_share_rejects_virtual_repo_and_shares_normal_repo(self):
        self.login_as(self.user)
        response = self.client.post('/api/v2.1/repos/batch/', {
            'operation': 'share',
            'repo_id': [self.virtual_repo_id, self.repo.id],
            'share_type': 'user',
            'username': self.admin.username,
            'permission': 'rw',
        })
        self.assertEqual(200, response.status_code)
        result = json.loads(response.content)
        self.assertEqual([{
            'repo_id': self.virtual_repo_id,
            'error_msg': 'Virtual libraries cannot be shared.',
        }], result['failed'])
        self.assertEqual(self.repo.id, result['success'][0]['repo_id'])
