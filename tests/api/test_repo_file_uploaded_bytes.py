from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import RequestFactory, SimpleTestCase, override_settings
from django.urls import resolve, reverse
from django.utils import timezone

from seahub import views
from seahub.api2 import authentication
from seahub.api2.endpoints import repo_file_uploaded_bytes as endpoint, share_links, upload_links
from seahub.share.models import CustomSharePermissions, FileShare, UploadLinkShare
from seahub.share.utils import SCOPE_SPECIFIC_USERS


@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
class RepoFileUploadedBytesTest(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.repo_id = '00000000-0000-0000-0000-000000000000'
        self.repo_url = reverse('api-v2.1-repo-file-uploaded-bytes', args=[self.repo_id])
        self.user = SimpleNamespace(username='uploader@example.com', id=1, is_active=True, is_authenticated=True)
        self.api = Mock()
        for module in (endpoint, views, share_links, upload_links):
            patcher = patch.object(module, 'seafile_api', self.api)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.api.get_repo.return_value = SimpleNamespace(id=self.repo_id, encrypted=False)
        self.api.get_repo_status.return_value = 0
        self.api.get_dir_id_by_path.return_value = 'dir'
        self.api.check_permission_by_path.return_value = 'rw'
        self.api.get_fileserver_access_token.return_value = 'upload-token'
        self.api.get_upload_tmp_file_offset.return_value = 1024
        self.params = {'parent_dir': '/folder', 'file_name': 'file.txt'}

    def request(self, url, params, user=None, **headers):
        request = self.factory.get(url, params, **headers)
        request.user = user
        request.session = {}
        match = resolve(url)
        return match.func(request, **match.kwargs)

    def get_response(self, params):
        return self.request(self.repo_url, params, user=self.user)

    def test_rejects_missing_and_invalid_credentials_before_repo_lookup(self):
        with (patch.object(authentication.TokenV2.objects, 'get', side_effect=authentication.TokenV2.DoesNotExist),
              patch.object(authentication.Token.objects, 'get', side_effect=authentication.Token.DoesNotExist)):
            for headers, code in (({}, 403), ({'HTTP_AUTHORIZATION': 'Token invalid'}, 401)):
                with self.subTest(headers=headers):
                    self.assertEqual(self.request(self.repo_url, self.params, **headers).status_code, code)
                    self.api.get_repo.assert_not_called()
                    self.api.check_permission_by_path.assert_not_called()
                    self.api.get_dir_id_by_path.assert_not_called()
                    self.api.get_upload_tmp_file_offset.assert_not_called()

    def test_accepts_valid_token(self):
        with (patch.object(authentication.TokenV2.objects, 'get', side_effect=authentication.TokenV2.DoesNotExist),
              patch.object(authentication.Token.objects, 'get', return_value=SimpleNamespace(user=self.user.username)),
              patch.object(authentication.User.objects, 'get', return_value=self.user),
              patch.object(authentication, 'MULTI_TENANCY', False)):
            response = self.request(self.repo_url, self.params, HTTP_AUTHORIZATION='Token test-token')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'uploadedBytes': 1024})

    def test_hides_missing_repo_before_directory_or_permission_lookup(self):
        self.api.get_repo.return_value = None
        response = self.get_response(self.params)
        self.assertEqual((response.status_code, response.data), (404, {'error_msg': 'Not found.'}))
        self.api.get_dir_id_by_path.assert_not_called()
        self.api.check_permission_by_path.assert_not_called()
        self.api.get_upload_tmp_file_offset.assert_not_called()

    def test_hides_missing_or_nonwritable_targets(self):
        for directory, permission in ((None, None), (None, 'rw'), ('dir', None), ('dir', 'r'), ('dir', 'invisible')):
            with self.subTest(directory=directory, permission=permission):
                self.api.get_dir_id_by_path.return_value = directory
                self.api.check_permission_by_path.return_value = permission
                response = self.get_response(self.params)
                self.assertEqual((response.status_code, response.data), (404, {'error_msg': 'Not found.'}))
                self.api.get_upload_tmp_file_offset.assert_not_called()

    def test_accepts_custom_upload_permission(self):
        self.api.check_permission_by_path.return_value = 'custom-1'
        with patch.object(CustomSharePermissions.objects, 'get') as get_permission:
            get_permission.return_value.to_dict.return_value = {'permission': {'upload': True}}
            self.assertEqual(self.get_response(self.params).status_code, 200)

    def test_nested_upload_uses_nearest_existing_directory(self):
        self.api.get_dir_id_by_path.side_effect = lambda repo, path: path in ('/folder', '/folder/sub')
        self.api.check_permission_by_path.side_effect = lambda repo, path, user: 'rw' if path == '/folder' else 'r'
        for name in ('sub/file.txt', '/folder/sub/new/file.txt', '/outside/file.txt'):
            with self.subTest(name=name):
                response = self.get_response(dict(self.params, file_name=name))
                self.assertEqual(response.status_code, 400 if name.startswith('/outside') else 404)
                self.api.get_upload_tmp_file_offset.assert_not_called()

        with patch.object(endpoint, 'ENABLE_RESUMABLE_FILEUPLOAD', True):
            response = self.get_response(dict(self.params, file_name='/folder/new/file.txt'))
        self.assertEqual(response['Accept-Ranges'], 'bytes')
        self.assertEqual(response.status_code, 200)
        self.api.get_upload_tmp_file_offset.assert_called_once_with(self.repo_id, '/folder/new/file.txt', 0)

    @patch.object(share_links, 'SHARE_LINK_LOGIN_REQUIRED', False)
    def test_share_upload_urls_include_only_the_requested_files_offset(self):
        attrs = dict(repo_id=self.repo_id, path='/folder/', token='abcdef', username=self.user.username)
        for route, link, directory in (
                ('api-v2.1-upload-link-upload', UploadLinkShare(**attrs), '/folder'),
                ('api-v2.1-share-link-upload', FileShare(**attrs, s_type='d', permission=FileShare.PERM_VIEW_DL_UPLOAD),
                 '/folder/sub')):
            url = reverse(route, args=[link.token])
            with self.subTest(route=route), patch.object(type(link).objects, 'get', return_value=link):
                self.api.reset_mock()
                response = self.request(url, {'path': '/sub/'})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(set(response.data), {'upload_link'})
                self.api.get_upload_tmp_file_offset.assert_not_called()

                response = self.request(url, {'path': '/sub/', 'file_name': 'new/file.txt', 'parent_dir': '/unrelated'})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(set(response.data), {'upload_link', 'uploadedBytes'})
                self.assertEqual(response.data['uploadedBytes'], 1024)
                self.api.get_upload_tmp_file_offset.assert_called_once_with(self.repo_id, directory + '/new/file.txt', 0)

                self.api.reset_mock()
                for name in ('/outside/file.txt', ''):
                    self.assertEqual(self.request(url, {'file_name': name}).status_code, 400)
                self.api.check_permission_by_path.return_value = 'r'
                self.assertEqual(self.request(url, {'file_name': 'file.txt'}).status_code, 404)
                self.api.check_permission_by_path.return_value = 'rw'
                link.password = 'password-hash'
                self.assertEqual(self.request(url, {'file_name': 'file.txt'}).status_code, 403)
                link.password = None
                link.expire_date = timezone.now() - timedelta(days=1)
                self.assertEqual(self.request(url, {'file_name': 'file.txt'}).status_code, 404)
                self.api.get_upload_tmp_file_offset.assert_not_called()
                self.api.get_fileserver_access_token.assert_not_called()

    @patch.object(share_links, 'SHARE_LINK_LOGIN_REQUIRED', False)
    def test_folder_share_enforces_link_permissions_scope_and_path(self):
        link = FileShare(repo_id=self.repo_id, path='/folder/', token='abcdef', username=self.user.username, s_type='d')
        url = reverse('api-v2.1-share-link-upload', args=[link.token])
        with patch.object(FileShare.objects, 'get', return_value=link):
            for scope, permission, path, code in (
                    (SCOPE_SPECIFIC_USERS, FileShare.PERM_VIEW_DL_UPLOAD, '/', 403),
                    ('all_users', FileShare.PERM_VIEW_DL, '/', 403),
                    ('all_users', FileShare.PERM_VIEW_DL_UPLOAD, '/../outside', 400)):
                with self.subTest(scope=scope, permission=permission, path=path):
                    link.user_scope, link.permission = scope, permission
                    self.assertEqual(self.request(url, {'file_name': 'file.txt', 'path': path}).status_code, code)
                    self.api.get_upload_tmp_file_offset.assert_not_called()
                    self.api.get_fileserver_access_token.assert_not_called()

    def test_converts_file_mtime_to_unix_seconds(self):
        for file_mtime, timestamp in (
                ('2024-07-30T18:18:25+08:00', 1722334705),
                ('2024-07-30T06:18:25-04:00', 1722334705),
                ('2024-07-30T10:18:25Z', 1722334705),
                ('2024-07-30T10:18:25.987Z', 1722334705),
                ('1970-01-01T00:00:00+00:00', 0)):
            with self.subTest(file_mtime=file_mtime):
                response = self.get_response(dict(self.params, file_mtime=file_mtime))

                self.api.get_upload_tmp_file_offset.assert_called_with(
                    self.repo_id, '/folder/file.txt', timestamp)
                self.assertIsInstance(self.api.get_upload_tmp_file_offset.call_args.args[2], int)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data, {'uploadedBytes': 1024})

    def test_uses_zero_mtime_when_missing_or_empty(self):
        for params in (self.params, dict(self.params, file_mtime='')):
            with self.subTest(params=params):
                response = self.get_response(params)

                self.api.get_upload_tmp_file_offset.assert_called_with(
                    self.repo_id, '/folder/file.txt', 0)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data, {'uploadedBytes': 1024})

    def test_rejects_invalid_file_mtime_before_rpc(self):
        for file_mtime in (
                'invalid',
                '2024-07-30',
                '2024-07-30T18:18:25',
                '2024-02-30T18:18:25+08:00',
                '2024-07-30T18:18:25+25:00'):
            with self.subTest(file_mtime=file_mtime):
                response = self.get_response(dict(self.params, file_mtime=file_mtime))

                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.data, {
                    'error_msg': 'file_mtime invalid, should be ISO 8601 format with timezone.',
                })
                self.api.get_repo.assert_not_called()
                self.api.check_permission_by_path.assert_not_called()
                self.api.get_upload_tmp_file_offset.assert_not_called()

    def test_returns_server_error_when_rpc_fails(self):
        self.api.get_upload_tmp_file_offset.side_effect = RuntimeError('RPC unavailable')

        with self.assertLogs(endpoint.logger, level='ERROR'):
            response = self.get_response(dict(
                self.params, file_mtime='2024-07-30T18:18:25+08:00'))

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data, {'error_msg': 'Internal Server Error'})
