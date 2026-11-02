import json
from uuid import uuid4

from seaserv import seafile_api

from seahub.api2.models import Token
from seahub.test_utils import BaseTestCase


class RepoHistoryTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.url = '/api2/repos/%s/history/' % self.repo_id
        self.recipient = self.create_user()
        self.addCleanup(self.remove_user, self.recipient.username)
        self.addCleanup(self.remove_repo, self.repo_id)

    def get_history(self, user, url=None):
        token, _ = Token.objects.get_or_create(user=user.username)
        return self.client.get(
            url or self.url, HTTP_AUTHORIZATION='Token ' + token.key)

    def test_owner_can_get_history(self):
        resp = self.get_history(self.user)

        self.assertEqual(200, resp.status_code)
        data = json.loads(resp.content)
        self.assertTrue(data['commits'])
        self.assertIn('root_id', data['commits'][0])
        self.assertIn('page_next', data)

    def test_unrelated_user_cannot_get_history(self):
        resp = self.get_history(self.recipient)

        self.assertEqual(403, resp.status_code)
        self.assertNotIn('commits', json.loads(resp.content))

    def test_read_only_recipient_can_get_history(self):
        seafile_api.share_repo(
            self.repo_id, self.user.username, self.recipient.username, 'r')

        resp = self.get_history(self.recipient)

        self.assertEqual(200, resp.status_code)
        self.assertTrue(json.loads(resp.content)['commits'])

    def test_folder_recipient_cannot_get_origin_history(self):
        sub_repo_id = seafile_api.create_virtual_repo(
            self.repo_id, self.folder, self.repo.name, '', self.user.username)
        self.addCleanup(self.remove_repo, sub_repo_id)
        seafile_api.share_repo(
            sub_repo_id, self.user.username, self.recipient.username, 'rw')

        resp = self.get_history(self.recipient)
        self.assertEqual(403, resp.status_code)
        self.assertNotIn('commits', json.loads(resp.content))

        resp = self.get_history(
            self.recipient, '/api2/repos/%s/history/' % sub_repo_id)
        self.assertEqual(200, resp.status_code)

    def test_missing_library_returns_not_found(self):
        resp = self.get_history(
            self.user, '/api2/repos/%s/history/' % uuid4())

        self.assertEqual(404, resp.status_code)

    def test_anonymous_cannot_get_history(self):
        resp = self.client.get(self.url)

        self.assertIn(resp.status_code, (401, 403))
