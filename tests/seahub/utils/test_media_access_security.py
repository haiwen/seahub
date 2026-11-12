import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import RequestFactory

from seahub.utils.markdown import markdown_contains_image
from seahub.utils.document_assets import get_asset_path
from seahub.seadoc import apis, utils
from seahub.views import file as file_views
from seahub.api2.endpoints import share_links


class MarkdownImageAccessTest(unittest.TestCase):
    url = 'https://example.com/lib/repo/file/shared/photo.png?raw=1'

    def test_supported_images(self):
        for content in ['![image](%s)', '![image][ref]\n\n[ref]: %s', '<img src="%s" />']:
            with self.subTest(content=content):
                self.assertTrue(markdown_contains_image(content % self.url, self.url))

    def test_url_compatibility(self):
        for query in ['raw=1&v=1', 'v=1&raw=1', 'raw=1#preview']:
            src = self.url.split('?')[0] + '?' + query
            self.assertTrue(markdown_contains_image('![image](%s)' % src, self.url))
        url = self.url.replace('photo.png', '%E5%9B%BE%20%281%29.png')
        src = url.replace('%28', r'\(').replace('%29', r'\)')
        self.assertTrue(markdown_contains_image('![image](%s)' % src, url))

    def test_other_resources_are_not_authorized(self):
        for old, new in [('/shared/', '/private/'), ('/repo/', '/other-repo/'),
                         ('example.com', 'other.example.com')]:
            self.assertFalse(markdown_contains_image(
                '![image](%s)' % self.url.replace(old, new), self.url))

    def test_non_image_text_is_not_authorized(self):
        for template in ['%s', '[link](%s)', '`![image](%s)`',
                         '```\n![image](%s)\n```', '<!-- ![image](%s) -->']:
            self.assertFalse(markdown_contains_image(template % self.url, self.url))

    def test_non_image_targets_rejected_before_share_lookup(self):
        with patch.object(file_views, 'FileShare') as shares:
            for path in ['/private/secret.txt/', '/private/secret.txt']:
                request = RequestFactory().get('/image', {'path': path, 'token': 'share'})
                with patch.object(file_views, 'render_error', return_value='rejected'):
                    self.assertEqual(file_views.view_media_file_via_share_link(request), 'rejected')
            shares.objects.get_valid_file_link_by_token.assert_not_called()


class SdocAssetAccessTest(unittest.TestCase):
    def setUp(self):
        self.request = RequestFactory().get(
            '/asset', HTTP_IF_MODIFIED_SINCE='Fri, 01 Jan 2027 00:00:00 GMT')
        self.request.user = SimpleNamespace(username='user')

    def test_invalid_names_never_lookup_or_issue_tokens(self):
        with patch.object(utils, 'seafile_api') as api:
            for name in ['/private/a.png', '../a.png', 'nested/a.mp4', '..\\a.png',
                         'a.png/', '', '.', '..', '%2fa.png', 'a\x00.png']:
                self.assertIsNone(get_asset_path('/images/sdoc/doc/', name))
                self.assertIsNone(utils.get_seadoc_asset_download_link(
                    'repo', '/images/sdoc/doc/', name, 'user'))
            api.get_file_id_by_path.assert_not_called()
            api.get_fileserver_access_token.assert_not_called()

    def test_invalid_api_targets_rejected_before_lookup(self):
        with patch.object(apis, 'FileUUIDMap') as maps:
            for cls, names in [(apis.SeadocDownloadImage, ['/private/a.png', '../a.mp4', 'a.txt']),
                               (apis.SeadocDownloadVideo, ['/private/a.mp4', '../a.mp4', 'a.png'])]:
                for name in names:
                    self.assertEqual(cls().get(self.request, 'doc', name).status_code, 400)
            maps.objects.get_fileuuidmap_by_uuid.assert_not_called()

    def test_unauthorized_conditionals_do_not_read_metadata(self):
        with patch.object(apis, 'FileUUIDMap'), \
                patch.object(apis, 'Wiki2Publish') as publish, \
                patch.object(apis, 'can_access_seadoc_asset', return_value=False), \
                patch.object(apis, 'latest_entry') as metadata:
            publish.objects.filter.return_value.first.return_value = None
            self.assertEqual(apis.SeadocDownloadImage().get(self.request, 'doc', 'a.png').status_code, 403)
            self.assertEqual(apis.SeadocDownloadVideo().get(self.request, 'doc', 'a.mp4').status_code, 403)
            metadata.assert_not_called()

    def test_valid_media_and_conditionals(self):
        with patch.object(apis, 'FileUUIDMap') as maps, \
                patch.object(apis, 'Wiki2Publish') as publish, \
                patch.object(apis, 'can_access_seadoc_asset', return_value=True), \
                patch.object(apis, 'latest_entry', return_value=datetime(2026, 1, 1)) as metadata, \
                patch.object(apis, 'get_seadoc_asset_download_link', return_value='url') as link, \
                patch.object(apis.requests, 'get', return_value=Mock(ok=True, content=b'media')):
            maps.objects.get_fileuuidmap_by_uuid.return_value = SimpleNamespace(
                repo_id='repo', parent_path='/', filename='document.sdoc')
            publish.objects.filter.return_value.first.return_value = None
            cases = [(apis.SeadocDownloadImage, 'a.png', 'image/png'),
                     (apis.SeadocDownloadImage, 'a.mp4', 'video/mp4'),
                     (apis.SeadocDownloadVideo, 'a.mov', 'video/quicktime')]
            for cls, name, mime in cases:
                self.assertEqual(cls().get(self.request, 'doc', name).status_code, 304)
            link.assert_not_called()
            self.request.META.pop('HTTP_IF_MODIFIED_SINCE')
            metadata.return_value = None
            for cls, name, mime in cases:
                response = cls().get(self.request, 'doc', name)
                self.assertEqual(response.content, b'media')
                self.assertEqual(response['Content-Type'], mime)
                self.assertEqual(response['Cache-Control'], 'private, max-age=604800')
                link.assert_called_with('repo', '/images/sdoc/doc/', name, 'user')


class ShareLinkOwnerTest(unittest.TestCase):
    def test_non_owner_rejected_before_sensitive_serialization(self):
        request = SimpleNamespace(user=SimpleNamespace(username='other-user'))
        with patch.object(share_links, 'FileShare') as shares, \
                patch.object(share_links, 'get_share_link_info') as info:
            shares.objects.get.return_value.is_owner.return_value = False
            self.assertEqual(share_links.ShareLink().get(request, 'token').status_code, 403)
            info.assert_not_called()
            shares.objects.get.return_value.is_owner.assert_called_once_with('other-user')

    def test_owner_keeps_detail_access(self):
        request = SimpleNamespace(user=SimpleNamespace(username='owner'))
        with patch.object(share_links, 'FileShare') as shares, \
                patch.object(share_links, 'get_share_link_info', return_value={'token': 'token'}) as info:
            shares.objects.get.return_value.is_owner.return_value = True
            self.assertEqual(share_links.ShareLink().get(request, 'token').data, {'token': 'token'})
            info.assert_called_once_with(shares.objects.get.return_value)
