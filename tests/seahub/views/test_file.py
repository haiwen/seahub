import datetime

from mock import patch

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase


class FileAccessLogTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)
        self.file_path = self.file
        self.repo_id = self.repo.id

    def tearDown(self):
        self.remove_repo()

    def generate_file_audit_event_type(self, e):
        return {
            'file-download-web': ('web', ''),
            'file-download-share-link': ('share-link',''),
            'file-download-api': ('API', e.device),
            'repo-download-sync': ('download-sync', e.device),
            'repo-upload-sync': ('upload-sync', e.device),
        }[e.etype]

    @patch('seahub.views.file.is_pro_version')
    def test_can_not_render_if_not_pro(self, mock_is_pro_version):
        mock_is_pro_version.return_value = False

        url = reverse('file_access', args=[self.repo_id]) + '?p=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(404, resp.status_code)

    @patch('seahub.views.file.generate_file_audit_event_type')
    @patch('seahub.views.file.get_file_audit_events_by_path')
    @patch('seahub.views.file.is_pro_version')
    def test_can_show_web_type(self, mock_is_pro_version,
            mock_get_file_audit_events_by_path, mock_generate_file_audit_event_type):

        etype = 'file-download-web'
        event = Event(self.user.email, self.repo_id, self.file_path, etype)

        mock_is_pro_version.return_value = True
        mock_get_file_audit_events_by_path.return_value = [event]
        mock_generate_file_audit_event_type.side_effect = self.generate_file_audit_event_type

        url = reverse('file_access', args=[self.repo_id]) + '?p=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'file_access.html')
        self.assertContains(resp, 'web')

    @patch('seahub.views.file.generate_file_audit_event_type')
    @patch('seahub.views.file.get_file_audit_events_by_path')
    @patch('seahub.views.file.is_pro_version')
    def test_can_show_share_link_type(self, mock_is_pro_version,
            mock_get_file_audit_events_by_path, mock_generate_file_audit_event_type):

        etype = 'file-download-share-link'
        event = Event(self.user.email, self.repo_id, self.file_path, etype)

        mock_is_pro_version.return_value = True
        mock_get_file_audit_events_by_path.return_value = [event]
        mock_generate_file_audit_event_type.side_effect = self.generate_file_audit_event_type

        url = reverse('file_access', args=[self.repo_id]) + '?p=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'file_access.html')
        self.assertContains(resp, 'share-link')

    @patch('seahub.views.file.generate_file_audit_event_type')
    @patch('seahub.views.file.get_file_audit_events_by_path')
    @patch('seahub.views.file.is_pro_version')
    def test_can_show_api_type(self, mock_is_pro_version,
            mock_get_file_audit_events_by_path, mock_generate_file_audit_event_type):

        etype = 'file-download-api'
        event = Event(self.user.email, self.repo_id, self.file_path, etype)

        mock_is_pro_version.return_value = True
        mock_get_file_audit_events_by_path.return_value = [event]
        mock_generate_file_audit_event_type.side_effect = self.generate_file_audit_event_type

        url = reverse('file_access', args=[self.repo_id]) + '?p=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'file_access.html')
        self.assertContains(resp, 'API')

    @patch('seahub.views.file.generate_file_audit_event_type')
    @patch('seahub.views.file.get_file_audit_events_by_path')
    @patch('seahub.views.file.is_pro_version')
    def test_can_show_download_sync_type(self, mock_is_pro_version,
            mock_get_file_audit_events_by_path, mock_generate_file_audit_event_type):

        etype = 'repo-download-sync'
        event = Event(self.user.email, self.repo_id, self.file_path, etype)

        mock_is_pro_version.return_value = True
        mock_get_file_audit_events_by_path.return_value = [event]
        mock_generate_file_audit_event_type.side_effect = self.generate_file_audit_event_type

        url = reverse('file_access', args=[self.repo_id]) + '?p=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'file_access.html')
        self.assertContains(resp, 'download-sync')

    @patch('seahub.views.file.generate_file_audit_event_type')
    @patch('seahub.views.file.get_file_audit_events_by_path')
    @patch('seahub.views.file.is_pro_version')
    def test_can_show_upload_sync_type(self, mock_is_pro_version,
            mock_get_file_audit_events_by_path, mock_generate_file_audit_event_type):

        etype = 'repo-upload-sync'
        event = Event(self.user.email, self.repo_id, self.file_path, etype)

        mock_is_pro_version.return_value = True
        mock_get_file_audit_events_by_path.return_value = [event]
        mock_generate_file_audit_event_type.side_effect = self.generate_file_audit_event_type

        url = reverse('file_access', args=[self.repo_id]) + '?p=' + self.file_path
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'file_access.html')
        self.assertContains(resp, 'upload-sync')


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
