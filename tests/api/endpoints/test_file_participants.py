import json

from seaserv import seafile_api
from django.urls import reverse
from seahub.file_participants.models import FileParticipant
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring
from seahub.tags.models import FileUUIDMap


class FileParticipantsTest(BaseTestCase):
    def setUp(self):
        self.tmp_user = self.create_user()

        self.login_as(self.user)
        self.url = reverse('api-v2.1-file-participants', args=[self.repo.id])

        # share repo and add participant
        seafile_api.share_repo(self.repo.id, self.user.username, self.tmp_user.username, 'rw')
        self.file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap_by_path(self.repo.id, self.file, False)
        FileParticipant.objects.add_participant(self.file_uuid, self.user.username)

    def tearDown(self):
        self.remove_repo()
        self.remove_user(self.tmp_user.email)

    def test_can_list(self):
        resp = self.client.get(self.url + '?path=' + self.file)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['participant_list']
        assert json_resp['participant_list'][0]
        assert json_resp['participant_list'][0]['email'] == self.user.username
        assert json_resp['participant_list'][0]['avatar_url']
        assert json_resp['participant_list'][0]['contact_email']
        assert json_resp['participant_list'][0]['name']

    def test_can_not_list_by_not_exists_path(self):
        invalid_path = self.file + randstring(5)
        resp = self.client.get(self.url + '?path=' + invalid_path)
        self.assertEqual(404, resp.status_code)

    def test_can_not_list_by_invalid_user_permission(self):
        self.logout()
        self.login_as(self.admin)

        resp = self.client.get(self.url + '?path=' + self.file)
        self.assertEqual(403, resp.status_code)

    def test_can_post(self):
        data = {
            'emails': [self.tmp_user.username, self.admin.username],
            'path': self.file,
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 1
        assert json_resp['success'][0]['email'] == self.tmp_user.username

        assert len(json_resp['failed']) == 1
        assert json_resp['failed'][0]['email'] == self.admin.username

        assert FileParticipant.objects.filter(uuid=self.file_uuid).count() == 2

    def test_can_not_post_by_not_exists_path(self):
        invalid_path = self.file + randstring(5)
        data = {
            'emails': [self.tmp_user.username],
            'path': invalid_path,
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_can_not_post_by_invalid_user_permission(self):
        self.logout()
        self.login_as(self.admin)

        data = {
            'emails': [self.tmp_user.username],
            'path': self.file,
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

    def test_can_not_post_by_not_exists_user(self):
        invalid_email = randstring(5) + '@seafile.com'
        data = {
            'emails': [invalid_email],
            'path': self.file,
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert len(json_resp['success']) == 0
        assert len(json_resp['failed']) == 1
        assert json_resp['failed'][0]['email'] == invalid_email

    def test_can_not_post_by_invalid_email_permission(self):
        data = {
            'emails': [self.admin.username],
            'path': self.file,
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert len(json_resp['success']) == 0
        assert len(json_resp['failed']) == 1
        assert json_resp['failed'][0]['email'] == self.admin.username


class FileParticipantTest(BaseTestCase):
    def setUp(self):
        self.tmp_user = self.create_user()

        self.login_as(self.user)
        self.url = reverse('api-v2.1-file-participant', args=[self.repo.id])

        # share repo and add participant
        seafile_api.share_repo(self.repo.id, self.user.username, self.tmp_user.username, 'rw')
        self.file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap_by_path(self.repo.id, self.file, False)
        FileParticipant.objects.add_participant(self.file_uuid, self.user.username)
        FileParticipant.objects.add_participant(self.file_uuid, self.tmp_user.username)

    def tearDown(self):
        self.remove_repo()
        self.remove_user(self.tmp_user.email)

    def test_can_delete(self):
        assert FileParticipant.objects.filter(
            uuid=self.file_uuid, username=self.tmp_user.username).count() == 1

        data = 'email=' + self.tmp_user.username + '&path=' + self.file
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['success']
        assert FileParticipant.objects.filter(
            uuid=self.file_uuid, username=self.tmp_user.username).count() == 0

    def test_can_not_delete_by_not_exists_path(self):
        invalid_path = self.file + randstring(5)
        data = 'email=' + self.tmp_user.username + '&path=' + invalid_path
        resp = self.client.delete(self.url + invalid_path, data, 'application/x-www-form-urlencoded')

        self.assertEqual(404, resp.status_code)

    def test_can_not_delete_by_invalid_user_permission(self):
        self.logout()
        self.login_as(self.admin)

        data = 'email=' + self.tmp_user.username + '&path=' + self.file
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(403, resp.status_code)
