from mock import patch
from django.urls import reverse
import requests

from seahub.test_utils import BaseTestCase

import datetime


class FileTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)
        self.video = self.create_file(repo_id=self.repo.id,
                                      parent_dir='/',
                                      filename='test.mp4',
                                      username=self.user.username)
        self.audio = self.create_file(repo_id=self.repo.id,
                                      parent_dir='/',
                                      filename='test.mp3',
                                      username=self.user.username)
        self.image = self.create_file(repo_id=self.repo.id,
                                      parent_dir='/',
                                      filename='test.jpg',
                                      username=self.user.username)
        self.doc = self.create_file(repo_id=self.repo.id,
                                    parent_dir='/',
                                    filename='test.doc',
                                    username=self.user.username)
        self.open_doc = self.create_file(repo_id=self.repo.id,
                                         parent_dir='/',
                                         filename='test.odt',
                                         username=self.user.username)
        self.spreadsheet = self.create_file(repo_id=self.repo.id,
                                            parent_dir='/',
                                            filename='test.xls',
                                            username=self.user.username)
        self.pdf = self.create_file(repo_id=self.repo.id,
                                    parent_dir='/',
                                    filename='test.pdf',
                                    username=self.user.username)
        self.unsupported = self.create_file(repo_id=self.repo.id,
                                            parent_dir='/',
                                            filename='test.xxxx',
                                            username=self.user.username)

    def tearDown(self):
        self.remove_repo()

    def test_can_render(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.file]))
        self.assertEqual(200, resp.status_code)

    def test_can_download(self):
        dl_url = reverse('view_lib_file', args=[self.repo.id, self.file]) + '?dl=1'
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        assert '8082/repos/' in resp.get('location')

        resp = requests.request('GET', resp.get('location'))
        cont_disp = resp.headers['content-disposition']
        assert 'inline' not in cont_disp
        assert 'attachment' in cont_disp

    def test_can_render_video(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.video]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_audio(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.audio]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_image(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.image]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_doc(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.doc]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_open_doc(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.open_doc]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_spreadsheet(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.spreadsheet]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_pdf(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.pdf]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_unsupported(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.unsupported]))
        self.assertEqual(200, resp.status_code)


class FileAccessLogTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)
        self.file_path = self.file
        self.repo_id = self.repo.id

    def tearDown(self):
        self.remove_repo()

    def get_type(self, etype):
        return {
            'file-download-web': 'web',
            'file-download-share-link': 'share-link',
            'file-download-api': 'API',
            'repo-download-sync': 'download-sync',
            'repo-upload-sync': 'upload-sync',
        }[etype]

    def generate_file_audit_event_type(self, e):
        return {
            'file-download-web': ('web', ''),
            'file-download-share-link': ('share-link', ''),
            'file-download-api': ('API', e.device),
            'repo-download-sync': ('download-sync', e.device),
            'repo-upload-sync': ('upload-sync', e.device),
        }[e.etype]

    @patch('seahub.api2.endpoints.file_access_log.is_pro_version')
    def test_can_not_render_if_not_pro(self, mock_is_pro_version):

        mock_is_pro_version.return_value = False
        url = reverse('api-v2.1-file-access-log-view',
                      args=[self.repo_id]) + '?path=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(501, resp.status_code)

    @patch('seahub.api2.endpoints.file_access_log.generate_file_audit_event_type')
    @patch('seahub.api2.endpoints.file_access_log.get_file_audit_events_by_path')
    @patch('seahub.api2.endpoints.file_access_log.is_pro_version')
    @patch('seahub.api2.endpoints.file_access_log.FILE_AUDIT_ENABLED')
    def test_can_show_web_type(self,
                               mock_file_audit_enabled,
                               mock_is_pro_version,
                               mock_get_file_audit_events_by_path,
                               mock_generate_file_audit_event_type):

        etype = 'file-download-web'
        event = Event(self.user.email, self.repo_id, self.file_path, etype)

        mock_file_audit_enabled.return_value = True
        mock_is_pro_version.return_value = True
        mock_get_file_audit_events_by_path.return_value = [event]
        mock_generate_file_audit_event_type.side_effect = self.generate_file_audit_event_type

        url = reverse('api-v2.1-file-access-log-view',
                      args=[self.repo_id]) + '?path=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        for access_log in resp.data.get('data'):
            self.assertEqual(self.get_type(etype), access_log['etype'])

    @patch('seahub.api2.endpoints.file_access_log.generate_file_audit_event_type')
    @patch('seahub.api2.endpoints.file_access_log.get_file_audit_events_by_path')
    @patch('seahub.api2.endpoints.file_access_log.is_pro_version')
    @patch('seahub.api2.endpoints.file_access_log.FILE_AUDIT_ENABLED')
    def test_can_show_share_link_type(self,
                                      mock_file_audit_enabled,
                                      mock_is_pro_version,
                                      mock_get_file_audit_events_by_path,
                                      mock_generate_file_audit_event_type):

        etype = 'file-download-share-link'
        event = Event(self.user.email, self.repo_id, self.file_path, etype)

        mock_file_audit_enabled.return_value = True
        mock_is_pro_version.return_value = True
        mock_get_file_audit_events_by_path.return_value = [event]
        mock_generate_file_audit_event_type.side_effect = self.generate_file_audit_event_type

        url = reverse('api-v2.1-file-access-log-view',
                      args=[self.repo_id]) + '?path=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        for access_log in resp.data.get('data'):
            self.assertEqual(self.get_type(etype), access_log['etype'])

    @patch('seahub.api2.endpoints.file_access_log.generate_file_audit_event_type')
    @patch('seahub.api2.endpoints.file_access_log.get_file_audit_events_by_path')
    @patch('seahub.api2.endpoints.file_access_log.is_pro_version')
    @patch('seahub.api2.endpoints.file_access_log.FILE_AUDIT_ENABLED')
    def test_can_show_api_type(self,
                               mock_file_audit_enabled,
                               mock_is_pro_version,
                               mock_get_file_audit_events_by_path,
                               mock_generate_file_audit_event_type):

        etype = 'file-download-api'
        event = Event(self.user.email, self.repo_id, self.file_path, etype)

        mock_file_audit_enabled.return_value = True
        mock_is_pro_version.return_value = True
        mock_get_file_audit_events_by_path.return_value = [event]
        mock_generate_file_audit_event_type.side_effect = self.generate_file_audit_event_type

        url = reverse('api-v2.1-file-access-log-view',
                      args=[self.repo_id]) + '?path=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        for access_log in resp.data.get('data'):
            self.assertEqual(self.get_type(etype), access_log['etype'])

    @patch('seahub.api2.endpoints.file_access_log.generate_file_audit_event_type')
    @patch('seahub.api2.endpoints.file_access_log.get_file_audit_events_by_path')
    @patch('seahub.api2.endpoints.file_access_log.is_pro_version')
    @patch('seahub.api2.endpoints.file_access_log.FILE_AUDIT_ENABLED')
    def test_can_show_download_sync_type(self,
                                         mock_file_audit_enabled,
                                         mock_is_pro_version,
                                         mock_get_file_audit_events_by_path,
                                         mock_generate_file_audit_event_type):

        etype = 'repo-download-sync'
        event = Event(self.user.email, self.repo_id, self.file_path, etype)

        mock_file_audit_enabled.return_value = True
        mock_is_pro_version.return_value = True
        mock_get_file_audit_events_by_path.return_value = [event]
        mock_generate_file_audit_event_type.side_effect = self.generate_file_audit_event_type

        url = reverse('api-v2.1-file-access-log-view',
                      args=[self.repo_id]) + '?path=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        for access_log in resp.data.get('data'):
            self.assertEqual(self.get_type(etype), access_log['etype'])

    @patch('seahub.api2.endpoints.file_access_log.generate_file_audit_event_type')
    @patch('seahub.api2.endpoints.file_access_log.get_file_audit_events_by_path')
    @patch('seahub.api2.endpoints.file_access_log.is_pro_version')
    @patch('seahub.api2.endpoints.file_access_log.FILE_AUDIT_ENABLED')
    def test_can_show_upload_sync_type(self,
                                       mock_file_audit_enabled,
                                       mock_is_pro_version,
                                       mock_get_file_audit_events_by_path,
                                       mock_generate_file_audit_event_type):

        etype = 'repo-upload-sync'
        event = Event(self.user.email, self.repo_id, self.file_path, etype)

        mock_file_audit_enabled.return_value = True
        mock_is_pro_version.return_value = True
        mock_get_file_audit_events_by_path.return_value = [event]
        mock_generate_file_audit_event_type.side_effect = self.generate_file_audit_event_type

        url = reverse('api-v2.1-file-access-log-view',
                      args=[self.repo_id]) + '?path=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        for access_log in resp.data.get('data'):
            self.assertEqual(self.get_type(etype), access_log['etype'])


class Event(object):

    def __init__(self, user, repo_id, file_path, etype):

        self.device = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36'
        self.ip = '192.168.1.124'
        self.org_id = -1
        self.timestamp = datetime.datetime.now()
        self.user = user
        self.repo_id = repo_id
        self.file_path = file_path
        self.etype = etype
