import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import RequestFactory

from seahub.seadoc import apis, utils


class SeadocAssetSecurityTest(unittest.TestCase):
    def setUp(self):
        # File type detection reads database-backed Constance settings.
        text_ext = patch('seahub.utils.get_conf_text_ext', return_value=[])
        text_ext.start()
        self.addCleanup(text_ext.stop)
        self.request = RequestFactory().get(
            '/asset', HTTP_IF_MODIFIED_SINCE='Fri, 01 Jan 2027 00:00:00 GMT')
        self.request.user = SimpleNamespace(username='user')

    def test_invalid_paths_never_reach_file_service(self):
        with patch.object(utils, 'seafile_api') as api:
            for filename in ['/private/a.png', '../a.mp4', '..\\a.png', '%2fa.png', 'a\x00.png']:
                with self.subTest(filename=filename):
                    self.assertIsNone(utils.get_seadoc_asset_download_link(
                        'repo', '/images/sdoc/doc/', filename, 'user'))
            api.get_file_id_by_path.assert_not_called()
            api.get_fileserver_access_token.assert_not_called()

    def test_download_rejects_paths_and_wrong_types_before_lookup(self):
        with patch.object(apis, 'FileUUIDMap') as maps:
            for cls, filenames in [
                (apis.SeadocDownloadImage, ['/private/a.png', '../a.png', 'secret.txt', '../a.mp4']),
                (apis.SeadocDownloadVideo, ['/private/a.mp4', '../a.mp4', 'secret.txt', 'a.png']),
            ]:
                for filename in filenames:
                    with self.subTest(api=cls.__name__, filename=filename):
                        response = cls().get(self.request, 'doc', filename)
                        self.assertEqual(response.status_code, 400)
            maps.objects.get_fileuuidmap_by_uuid.assert_not_called()

    def test_unauthorized_conditional_request_never_reads_metadata(self):
        with patch.object(apis, 'FileUUIDMap'), \
                patch.object(apis, 'Wiki2Publish') as publish, \
                patch.object(apis, 'can_access_seadoc_asset', return_value=False), \
                patch.object(apis, 'latest_entry') as metadata:
            publish.objects.filter.return_value.first.return_value = None
            for cls, filename in [(apis.SeadocDownloadImage, 'a.png'),
                                  (apis.SeadocDownloadImage, 'a.mp4'),
                                  (apis.SeadocDownloadVideo, 'a.mp4')]:
                self.assertEqual(cls().get(self.request, 'doc', filename).status_code, 403)
            metadata.assert_not_called()

    def test_authorized_conditional_request_still_returns_304(self):
        with patch.object(apis, 'FileUUIDMap'), \
                patch.object(apis, 'Wiki2Publish') as publish, \
                patch.object(apis, 'can_access_seadoc_asset', return_value=True), \
                patch.object(apis, 'latest_entry', return_value=datetime(2026, 1, 1)), \
                patch.object(apis, 'get_seadoc_asset_download_link') as download:
            publish.objects.filter.return_value.first.return_value = None
            for cls, filename in [(apis.SeadocDownloadImage, 'a.png'),
                                  (apis.SeadocDownloadImage, 'a.mp4'),
                                  (apis.SeadocDownloadVideo, 'a.mp4')]:
                self.assertEqual(cls().get(self.request, 'doc', filename).status_code, 304)
            download.assert_not_called()

    def test_valid_image_and_video_download_preserve_cache_policy(self):
        self.request.META.pop('HTTP_IF_MODIFIED_SINCE')
        with patch.object(apis, 'FileUUIDMap') as maps, \
                patch.object(apis, 'Wiki2Publish') as publish, \
                patch.object(apis, 'can_access_seadoc_asset', return_value=True), \
                patch.object(apis, 'latest_entry', return_value=None), \
                patch.object(apis, 'get_seadoc_asset_download_link', return_value='url') as download, \
                patch.object(apis.requests, 'get', return_value=Mock(ok=True, content=b'asset')):
            maps.objects.get_fileuuidmap_by_uuid.return_value = SimpleNamespace(
                repo_id='repo', parent_path='/', filename='document.sdoc')
            publish.objects.filter.return_value.first.return_value = None
            for cls, filename in [(apis.SeadocDownloadImage, 'a.png'),
                                  (apis.SeadocDownloadImage, 'a.mp4'),
                                  (apis.SeadocDownloadImage, 'a.mov'),
                                  (apis.SeadocDownloadVideo, 'a.mp4')]:
                response = cls().get(self.request, 'doc', filename)
                self.assertEqual(response.content, b'asset')
                self.assertEqual(response['Cache-Control'], 'private, max-age=604800')
                expected_type = {'png': 'image/png', 'mp4': 'video/mp4', 'mov': 'video/quicktime'}
                self.assertEqual(response['Content-Type'], expected_type[filename.rsplit('.', 1)[-1]])
                download.assert_called_with('repo', '/images/sdoc/doc/', filename, 'user')
