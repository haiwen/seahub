from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from seahub.seadoc.apis import SeadocImportRemoteImages
from seahub.seadoc.remote_image import RemoteImageError


class SeadocImportRemoteImagesTest(SimpleTestCase):
    file_uuid = '00000000-0000-0000-0000-000000000001'

    def make_request(self, image_urls, permission='rw'):
        return SimpleNamespace(
            headers={'authorization': 'Token test-token'},
            data={'image_urls': image_urls},
            permission=permission,
        )

    def test_rejects_read_only_token(self):
        request = self.make_request(['https://mmbiz.qpic.cn/image.jpg'])
        with patch(
            'seahub.seadoc.apis.is_valid_seadoc_access_token',
            return_value=(True, {'permission': 'r'}),
        ):
            response = SeadocImportRemoteImages().post(request, self.file_uuid)

        self.assertEqual(response.status_code, 403)

    def test_rejects_invalid_image_list(self):
        request = self.make_request([1])
        with patch(
            'seahub.seadoc.apis.is_valid_seadoc_access_token',
            return_value=(True, {'permission': 'rw'}),
        ):
            response = SeadocImportRemoteImages().post(request, self.file_uuid)

        self.assertEqual(response.status_code, 400)

    def test_rejects_non_object_request_body(self):
        request = self.make_request([])
        request.data = []
        with patch(
            'seahub.seadoc.apis.is_valid_seadoc_access_token',
            return_value=(True, {'permission': 'rw'}),
        ):
            response = SeadocImportRemoteImages().post(request, self.file_uuid)

        self.assertEqual(response.status_code, 400)

    @patch('seahub.seadoc.apis.uuid.uuid4', return_value='generated-id')
    @patch('seahub.seadoc.apis.run_remote_image_transfer', side_effect=lambda task: task())
    @patch('seahub.seadoc.apis.upload_seadoc_asset')
    @patch('seahub.seadoc.apis.download_remote_image')
    @patch('seahub.seadoc.apis.get_seadoc_asset_upload_link', return_value='upload-link')
    @patch('seahub.seadoc.apis.gen_seadoc_image_parent_path', return_value='/images/sdoc/doc/')
    @patch('seahub.seadoc.apis.check_quota', return_value=0)
    @patch('seahub.seadoc.apis.FileUUIDMap.objects.get_fileuuidmap_by_uuid')
    @patch('seahub.seadoc.apis.is_valid_seadoc_access_token')
    def test_deduplicates_urls_and_preserves_partial_failures(
            self, mock_validate_token, mock_get_uuid_map, _mock_check_quota,
            _mock_parent_path, _mock_upload_link, mock_download, mock_upload,
            _mock_run_transfer, _mock_uuid):
        first_url = 'https://mmbiz.qpic.cn/first.jpg'
        second_url = 'https://mmbiz.qpic.cn/second.jpg'
        request = self.make_request([first_url, first_url, second_url])
        mock_validate_token.return_value = (
            True,
            {'permission': 'rw', 'username': 'user@example.com'},
        )
        mock_get_uuid_map.return_value = SimpleNamespace(repo_id='repo-id')

        def download_image(source_url):
            if source_url == first_url:
                return {
                    'content': b'first-image',
                    'extension': 'jpg',
                    'content_type': 'image/jpeg',
                }
            raise RemoteImageError('unsupported_image', 'Unsupported image.')

        mock_download.side_effect = download_image
        mock_upload.return_value = MagicMock(ok=True)

        response = SeadocImportRemoteImages().post(request, self.file_uuid)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {
            'images': [
                {
                    'source_url': first_url,
                    'status': 'success',
                    'relative_path': '/image-generated-id.jpg',
                },
                {
                    'source_url': second_url,
                    'status': 'failed',
                    'error_code': 'unsupported_image',
                },
            ],
        })
        self.assertEqual(mock_download.call_count, 2)
        mock_upload.assert_called_once_with(
            'upload-link',
            '/images/sdoc/doc/',
            'image-generated-id.jpg',
            b'first-image',
            'image/jpeg',
            timeout=(5, 60),
        )
