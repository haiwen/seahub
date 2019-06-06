import json

from seaserv import seafile_api
from django.core.urlresolvers import reverse
from seahub.file_participants.models import FileParticipant
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


class FileParticipantsTest(BaseTestCase):
    def setUp(self):
        self.tmp_user = self.create_user()

        self.login_as(self.user)
        self.url = reverse('api2-file-participants', args=[self.repo.id]) + '?path=' + self.file
        # share repo and add participant
        seafile_api.share_repo(self.repo.id, self.user.username, self.tmp_user.username, 'rw')
        FileParticipant.objects.add_by_file_path_and_username(
            repo_id=self.repo.id, file_path=self.file, username=self.user.username)

    def tearDown(self):
        self.remove_repo()
        self.remove_user(self.tmp_user.email)

    def test_can_list(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['participant_list']
        assert json_resp['participant_list'][0]
        assert json_resp['participant_list'][0]['email'] == self.user.username
        assert json_resp['participant_list'][0]['avatar_url']
        assert json_resp['participant_list'][0]['contact_email']
        assert json_resp['participant_list'][0]['name']

    def test_can_not_list_by_not_exists_path(self):
        invalid_path = randstring(5)
        resp = self.client.get(self.url + invalid_path)
        self.assertEqual(404, resp.status_code)

    def test_can_not_list_by_invalid_user_permission(self):
        self.logout()
        self.login_as(self.admin)

        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_can_post(self):
        resp = self.client.post(self.url, {
            'email': self.tmp_user.username
        })
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['email'] == self.tmp_user.username
        assert json_resp['avatar_url']
        assert json_resp['contact_email']
        assert json_resp['name']

    def test_can_not_post_by_not_exists_path(self):
        invalid_path = randstring(5)
        resp = self.client.post(self.url + invalid_path, {
            'email': self.tmp_user.username
        })
        self.assertEqual(404, resp.status_code)

    def test_can_not_post_by_invalid_user_permission(self):
        self.logout()
        self.login_as(self.admin)

        resp = self.client.post(self.url, {
            'email': self.tmp_user.username
        })
        self.assertEqual(403, resp.status_code)

    def test_can_not_post_by_not_exists_user(self):
        invalid_email = randstring(5) + '@seafile.com'
        resp = self.client.post(self.url, {
            'email': invalid_email
        })
        self.assertEqual(404, resp.status_code)

    def test_can_not_post_by_invalid_email_permission(self):
        resp = self.client.post(self.url, {
            'email': self.admin.username
        })
        self.assertEqual(403, resp.status_code)
