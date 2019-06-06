import json

from seaserv import seafile_api
from django.core.urlresolvers import reverse
from seahub.file_participants.models import FileParticipant
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


class FileParticipantTest(BaseTestCase):
    def setUp(self):
        self.tmp_user = self.create_user()

        self.login_as(self.user)
        self.url = reverse('api2-file-participant', args=[self.repo.id]) + '?path=' + self.file
        # share repo and add participant
        seafile_api.share_repo(self.repo.id, self.user.username, self.tmp_user.username, 'rw')
        FileParticipant.objects.add_by_file_path_and_username(
            repo_id=self.repo.id, file_path=self.file, username=self.tmp_user.username)

    def tearDown(self):
        self.remove_repo()
        self.remove_user(self.tmp_user.email)

    def test_can_delete(self):
        data = 'email=' + self.tmp_user.username
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['success']

    def test_can_not_delete_by_not_exists_path(self):
        invalid_path = randstring(5)
        data = 'email=' + self.tmp_user.username
        resp = self.client.delete(self.url + invalid_path, data, 'application/x-www-form-urlencoded')

        self.assertEqual(404, resp.status_code)

    def test_can_not_delete_by_invalid_user_permission(self):
        self.logout()
        self.login_as(self.admin)

        data = 'email=' + self.tmp_user.username
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(403, resp.status_code)
