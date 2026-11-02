import json
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from django.http import Http404, HttpResponse
from django.test import RequestFactory
from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.views.file import view_lib_file_via_smart_link


class SmartLinkReadonlyPermissionTest(TestCase):

    def setUp(self):
        self.repo_id = '11111111-2222-4333-8444-555555555555'
        self.file_uuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
        self.uuid_map = SimpleNamespace(
            repo_id=self.repo_id, parent_path='/private',
            filename='drawing.exdraw', is_dir=False)
        self.repo = SimpleNamespace(
            encrypted=False, store_id=self.repo_id, version=1, name='Library')
        self.request = RequestFactory().get('/smart-link/', {'readonly': 'true'})
        self.request.user = SimpleNamespace(username='reader@example.com', is_authenticated=True)

        patches = {
            'uuid_lookup': patch('seahub.views.file.FileUUIDMap.objects.get_fileuuidmap_by_uuid', return_value=self.uuid_map),
            'api': patch('seahub.views.file.seafile_api'),
            'permission': patch('seahub.views.file.check_folder_permission', return_value='r'),
            'exdraw_uuid': patch('seahub.views.file.get_exdraw_file_uuid', return_value=self.file_uuid),
            'exdraw_token': patch('seahub.views.file.gen_exdraw_access_token', return_value='editor-token'),
            'file_url': patch('seahub.views.file.gen_file_get_url', return_value='/raw/file'),
            'render': patch('seahub.views.file.render', return_value=HttpResponse()),
            'denied': patch('seahub.views.file.render_permission_error', return_value=HttpResponse(status=403)),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

        self.api.get_repo.return_value = self.repo
        self.api.get_file_id_by_path.return_value = 'file-id'
        self.api.get_fileserver_access_token.return_value = 'file-token'
        self.api.get_file_size.return_value = 100

    def view(self):
        return view_lib_file_via_smart_link(
            self.request, self.file_uuid, self.uuid_map.filename)

    def assert_no_tokens(self):
        self.api.get_fileserver_access_token.assert_not_called()
        self.exdraw_token.assert_not_called()
        self.exdraw_uuid.assert_not_called()

    def test_unauthorized_user_cannot_get_tokens(self):
        self.permission.return_value = None
        self.assertEqual(self.view().status_code, 403)
        self.permission.assert_called_once_with(self.request, self.repo_id, '/private')
        self.assert_no_tokens()

    def test_preview_only_and_invisible_permissions_cannot_get_raw_content(self):
        for permission in ('preview', 'cloud-edit', 'invisible'):
            with self.subTest(permission=permission):
                self.permission.return_value = permission
                self.assertEqual(self.view().status_code, 403)
                self.assert_no_tokens()

    def test_custom_permission_without_preview_or_download_is_denied(self):
        for preview, download in ((False, True), (True, False)):
            with self.subTest(preview=preview, download=download):
                with patch('seahub.views.file.parse_repo_perm', return_value=SimpleNamespace(
                        can_preview=preview, can_download=download)):
                    self.assertEqual(self.view().status_code, 403)
                    self.assert_no_tokens()

    def test_non_exdraw_file_cannot_be_forced_into_readonly_view(self):
        self.uuid_map.filename = 'secret.txt'
        self.request.GET = self.request.GET.copy()
        self.request.GET['filetype'] = 'Excalidraw'
        response = self.view()
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('view_lib_file', args=[
            self.repo_id, '/private/secret.txt']))
        self.assert_no_tokens()

    def test_directory_cannot_enter_readonly_file_view(self):
        self.uuid_map.is_dir = True
        self.assertEqual(self.view().status_code, 302)
        self.assert_no_tokens()

    def test_missing_file_does_not_issue_tokens(self):
        self.api.get_file_id_by_path.return_value = None
        with self.assertRaises(Http404):
            self.view()
        self.assert_no_tokens()

    def test_failed_fileserver_token_does_not_issue_editor_token(self):
        self.api.get_fileserver_access_token.return_value = None
        self.assertEqual(self.view().status_code, 403)
        self.exdraw_token.assert_not_called()
        self.render.assert_not_called()

    def test_authorized_reader_gets_only_readonly_editor_token(self):
        self.assertEqual(self.view().status_code, 200)
        self.api.get_fileserver_access_token.assert_called_once_with(
            self.repo_id, 'file-id', 'view', 'reader@example.com', use_onetime=True)
        self.exdraw_token.assert_called_once_with(
            self.file_uuid, 'drawing.exdraw', 'reader@example.com', permission='r')
        data = self.render.call_args.args[2]
        self.assertEqual(data['filetype'], 'Excalidraw')
        self.assertEqual(data['raw_path'], '/raw/file')

    def test_writer_still_gets_only_readonly_editor_token(self):
        self.permission.return_value = 'rw'
        self.assertEqual(self.view().status_code, 200)
        self.exdraw_token.assert_called_once_with(
            self.file_uuid, 'drawing.exdraw', 'reader@example.com', permission='r')

    def test_normal_smart_link_keeps_download_redirect(self):
        self.request.GET = self.request.GET.copy()
        self.request.GET['readonly'] = 'false'
        self.request.GET['dl'] = '1'
        response = self.view()
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('view_lib_file', args=[
            self.repo_id, '/private/drawing.exdraw']) + '?dl=1')
        self.assert_no_tokens()


class ViewLibFileViaSmartLinkTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path = self.file
        self.folder_path = self.folder

        self.login_as(self.user)

        # get file smart link
        get_smart_link_url = reverse('api-v2.1-smart-link')
        data = '?repo_id=%s&path=%s&is_dir=false' % (self.repo_id, self.file_path)
        resp = self.client.get(get_smart_link_url + data)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['smart_link'] is not None
        assert json_resp['smart_link_token'] is not None

        self.smart_link = json_resp['smart_link']

    def tearDown(self):
        self.remove_repo()

    def test_can_view(self):
        self.login_as(self.user)

        url = self.smart_link
        resp = self.client.get(url)
        self.assertEqual(302, resp.status_code)
        assert 'lib/' in resp.get('location')
        assert '/file/' in resp.get('location')
        assert 'dl=1' not in resp.get('location')

    def test_can_download(self):
        self.login_as(self.user)

        url = self.smart_link + '?dl=1'
        resp = self.client.get(url)
        self.assertEqual(302, resp.status_code)
        assert 'lib/' in resp.get('location')
        assert '/file/' in resp.get('location')
        assert 'dl=1' in resp.get('location')

        resp = self.client.get(resp.get('location'))
        assert '8082/repos/' in resp.get('location')
