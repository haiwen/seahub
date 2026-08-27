from _sha1 import sha1

import hmac
import os

import json
import uuid

from django.urls import reverse

from seahub.repo_api_tokens.models import RepoAPITokens
from seahub.repo_metadata.models import RepoMetadataViews
from seahub.test_utils import BaseTestCase


class ViaRepoDirTest(BaseTestCase):

    def _create_repo_api_token_obj(self, app_name, permission):
        username = self.user.username
        return RepoAPITokens.objects.create_token(app_name, self.repo_id, username, permission=permission)

    def setUp(self):
        self.login_as(self.user)

        self.repo_id = self.repo.id

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path.rstrip('/'))

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder_path)

        self.r_app_name, permission = 'app_name', 'r'
        self.repo_r_api_token_obj = self._create_repo_api_token_obj(self.r_app_name, permission)
        self.rw_app_name, permission = 'rw_app_name', 'rw'
        self.repo_rw_api_token_obj = self._create_repo_api_token_obj(self.rw_app_name, permission)

        self.url = reverse('via-repo-dir')
        self.logout()

    def tearDown(self):
        RepoAPITokens.objects.filter(repo_id=self.repo_id).delete()
        self.remove_repo(self.repo_id)

    def test_read_repo_from_valid_token(self):
        headers = {'HTTP_AUTHORIZATION': 'token ' + self.repo_r_api_token_obj.token}
        resp = self.client.get(self.url, **headers)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert len(json_resp['dirent_list']) == 2
        assert self.folder_name == json_resp['dirent_list'][0]['name']
        assert self.file_name == json_resp['dirent_list'][1]['name']
        assert len(json_resp['dirent_list'][1]['modifier_name']) > 0
        assert len(json_resp['dirent_list'][1]['modifier_contact_email']) > 0

    def test_read_repo_from_invalid_token(self):
        unique = str(uuid.uuid4())
        token = hmac.new(unique.encode('utf-8'), digestmod=sha1).hexdigest()
        headers = {'HTTP_AUTHORIZATION': 'token ' + token}
        resp = self.client.get(self.url, **headers)
        assert resp.status_code in (401, 403)

    def test_mkdir_repo_from_valid_r_token(self):
        data = {
            'operation': 'mkdir',
        }
        headers = {'HTTP_AUTHORIZATION': 'token ' + self.repo_r_api_token_obj.token}
        url = self.url + '?path=/new'
        resp = self.client.post(url, data=data, **headers)
        self.assertEqual(403, resp.status_code)

    def test_mkdir_repo_from_valid_rw_token(self):
        data = {
            'operation': 'mkdir',
        }
        headers = {'HTTP_AUTHORIZATION': 'token ' + self.repo_rw_api_token_obj.token}
        url = self.url + '?path=/new'
        resp = self.client.post(url, data=data, **headers)
        self.assertEqual(200, resp.status_code)


class ViaUploadLinkTest(BaseTestCase):

    def _create_repo_api_token_obj(self, app_name, permission):
        username = self.user.username
        return RepoAPITokens.objects.create_token(app_name, self.repo_id, username, permission=permission)

    def setUp(self):
        self.login_as(self.user)
        repo_id = self.create_repo(name='test-repo',
                                   desc='',
                                   username=self.user.username,
                                   passwd=None)

        self.repo_id = repo_id
        self.folder_name = os.path.basename(self.create_folder(repo_id=self.repo_id,
                                                               parent_dir='/',
                                                               dirname='folder',
                                                               username='test@test.com'))
        self.file_name = os.path.basename(self.create_file(repo_id=self.repo_id,
                                                           parent_dir='/',
                                                           filename='test.txt',
                                                           username='test@test.com'))

        self.r_app_name, permission = 'app_name', 'r'
        self.repo_r_api_token_obj = self._create_repo_api_token_obj(self.r_app_name, permission)
        self.rw_app_name, permission = 'rw_app_name', 'rw'
        self.repo_rw_api_token_obj = self._create_repo_api_token_obj(self.rw_app_name, permission)

        self.url = reverse('via-upload-link')
        self.logout()

    def tearDown(self):
        RepoAPITokens.objects.filter(repo_id=self.repo_id).delete()
        self.remove_repo(self.repo_id)

    def test_get_upload_link_from_r_token(self):
        data = {
            'path': '/',
        }
        headers = {'HTTP_AUTHORIZATION': 'token ' + self.repo_r_api_token_obj.token}
        resp = self.client.get(self.url, data=data, **headers)
        self.assertEqual(403, resp.status_code)

    def test_get_upload_link_from_rw_token(self):
        data = {
            'path': '/',
        }
        headers = {'HTTP_AUTHORIZATION': 'token ' + self.repo_rw_api_token_obj.token}
        resp = self.client.get(self.url, data=data, **headers)
        self.assertEqual(200, resp.status_code)
        assert resp.content


class ViaRepoMetadataViewsTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)
        self.repo_id = self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None,
        )
        self.client.put(reverse('api-v2.1-metadata', args=[self.repo_id]))

        metadata_views = RepoMetadataViews.objects.get(repo_id=self.repo_id)
        view_details = json.loads(metadata_views.details)
        view_details['views'].append({
            '_id': '_legacy_face_recognition',
            'name': 'People',
            'type': 'face_recognition',
        })
        view_details['navigation'].append({
            '_id': '_legacy_face_recognition',
            'type': 'view',
        })
        metadata_views.details = json.dumps(view_details)
        metadata_views.save(update_fields=['details'])

        self.read_token = RepoAPITokens.objects.create_token(
            'read-app', self.repo_id, self.user.username, permission='r')
        self.write_token = RepoAPITokens.objects.create_token(
            'write-app', self.repo_id, self.user.username, permission='rw')
        self.url = reverse('via-repo-token-metadata-views')
        self.logout()

    def tearDown(self):
        RepoAPITokens.objects.filter(repo_id=self.repo_id).delete()
        self.remove_repo(self.repo_id)

    def test_get_hides_legacy_face_recognition_view(self):
        headers = {'HTTP_AUTHORIZATION': 'token ' + self.read_token.token}
        resp = self.client.get(self.url, **headers)
        self.assertEqual(200, resp.status_code)

        result = json.loads(resp.content)
        self.assertNotIn('_legacy_face_recognition', [view['_id'] for view in result['views']])
        self.assertNotIn('_legacy_face_recognition', [item['_id'] for item in result['navigation']])

    def test_get_legacy_face_recognition_view_detail(self):
        headers = {'HTTP_AUTHORIZATION': 'token ' + self.read_token.token}
        url = reverse('via-repo-token-metadata-views-detail', args=['_legacy_face_recognition'])
        resp = self.client.get(url, **headers)
        self.assertEqual(404, resp.status_code)

    def test_post_rejects_face_recognition_view(self):
        headers = {'HTTP_AUTHORIZATION': 'token ' + self.write_token.token}
        resp = self.client.post(self.url, {
            'name': 'People',
            'type': 'face_recognition',
        }, **headers)
        self.assertEqual(400, resp.status_code)

    def test_put_rejects_legacy_face_recognition_view(self):
        headers = {'HTTP_AUTHORIZATION': 'token ' + self.write_token.token}
        resp = self.client.put(self.url, {
            'view_id': '_legacy_face_recognition',
            'view_data': {'name': 'People 2'},
        }, **headers)
        self.assertEqual(400, resp.status_code)

    def test_duplicate_face_recognition_view(self):
        headers = {'HTTP_AUTHORIZATION': 'token ' + self.write_token.token}
        url = reverse('via-repo-token-metadata-duplicate-views')
        resp = self.client.post(url, {'view_id': '_legacy_face_recognition'}, **headers)
        self.assertEqual(400, resp.status_code)
