from unittest import TestCase
from unittest.mock import patch

from django.test import RequestFactory

from seahub.api2.endpoints import repo_file_uploaded_bytes as endpoint


class RepoFileUploadedBytesTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.repo_id = '00000000-0000-0000-0000-000000000000'
        patcher = patch.object(endpoint, 'seafile_api')
        self.api = patcher.start()
        self.addCleanup(patcher.stop)
        self.api.get_upload_tmp_file_offset.return_value = 1024
        self.params = {'parent_dir': '/folder', 'file_name': 'file.txt'}

    def get_response(self, params):
        request = self.factory.get('/file-uploaded-bytes/', params)
        return endpoint.RepoFileUploadedBytesView().get(request, self.repo_id)

    def test_converts_last_modify_to_unix_seconds(self):
        for last_modify, timestamp in (
                ('2024-07-30T18:18:25+08:00', 1722334705),
                ('2024-07-30T06:18:25-04:00', 1722334705),
                ('2024-07-30T10:18:25Z', 1722334705),
                ('2024-07-30T10:18:25.987Z', 1722334705),
                ('1970-01-01T00:00:00+00:00', 0)):
            with self.subTest(last_modify=last_modify):
                response = self.get_response(dict(self.params, last_modify=last_modify))

                self.api.get_upload_tmp_file_offset.assert_called_with(
                    self.repo_id, '/folder/file.txt', timestamp)
                self.assertIsInstance(self.api.get_upload_tmp_file_offset.call_args.args[2], int)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data, {'uploadedBytes': 1024})

    def test_uses_zero_mtime_when_missing_or_empty(self):
        for params in (self.params, dict(self.params, last_modify='')):
            with self.subTest(params=params):
                response = self.get_response(params)

                self.api.get_upload_tmp_file_offset.assert_called_with(
                    self.repo_id, '/folder/file.txt', 0)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data, {'uploadedBytes': 1024})

    def test_rejects_invalid_last_modify_before_rpc(self):
        for last_modify in (
                'invalid',
                '2024-07-30',
                '2024-07-30T18:18:25',
                '2024-02-30T18:18:25+08:00',
                '2024-07-30T18:18:25+25:00'):
            with self.subTest(last_modify=last_modify):
                response = self.get_response(dict(self.params, last_modify=last_modify))

                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.data, {
                    'error_msg': 'last_modify invalid, should be ISO 8601 format with timezone.',
                })
                self.api.get_repo.assert_not_called()
                self.api.get_upload_tmp_file_offset.assert_not_called()

    def test_returns_server_error_when_rpc_fails(self):
        self.api.get_upload_tmp_file_offset.side_effect = RuntimeError('RPC unavailable')

        with self.assertLogs(endpoint.logger, level='ERROR'):
            response = self.get_response(dict(
                self.params, last_modify='2024-07-30T18:18:25+08:00'))

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data, {'error_msg': 'Internal Server Error'})
