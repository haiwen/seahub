from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import DEFAULT, patch

from django.http import HttpResponse

from seahub.views import file as file_views


class ShareLinkImageReferenceTest(TestCase):

    def setUp(self):
        self.repo_id = '11111111-2222-4333-8444-555555555555'
        self.image_path = '/images/photo.png'
        self.file_share = SimpleNamespace(
            repo_id=self.repo_id, path='/document.md', is_expired=lambda: False)
        self.request = SimpleNamespace(
            GET={'path': self.image_path, 'token': 'share-token'},
            user=SimpleNamespace(username='reader@example.com'))

        patcher = patch.multiple(
            file_views, FileShare=DEFAULT, get_repo=DEFAULT,
            check_share_link_user_access=DEFAULT, check_share_link_common=DEFAULT,
            get_file_content_from_cache=DEFAULT, get_service_url=DEFAULT,
            seafile_api=DEFAULT, gen_file_get_url=DEFAULT, render_error=DEFAULT)
        self.mocks = patcher.start()
        self.addCleanup(patcher.stop)
        self.mocks['FileShare'].objects.get_valid_file_link_by_token.return_value = self.file_share
        self.mocks['check_share_link_user_access'].return_value = True
        self.mocks['check_share_link_common'].return_value = (True, '')
        self.mocks['seafile_api'].get_file_id_by_path.return_value = 'file-id'
        self.mocks['gen_file_get_url'].return_value = '/raw/photo.png'
        self.mocks['render_error'].side_effect = lambda request, message: HttpResponse(message, status=404)

    def view_image(self, service_url, reference_url):
        self.mocks['get_service_url'].return_value = service_url
        self.mocks['get_file_content_from_cache'].return_value = (
            '', '![image](%s)' % reference_url)
        return file_views.view_media_file_via_share_link(self.request)

    def test_referenced_image_redirects(self):
        service_url = 'https://seafile.example.com'
        reference_url = '%s/lib/%s/file%s?raw=1' % (
            service_url, self.repo_id, self.image_path)
        response = self.view_image(service_url, reference_url)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/raw/photo.png')

    def test_service_url_metacharacters_are_matched_literally(self):
        service_url = 'https://seafile.example.com/seafile.v1+(test)[0]'
        reference_url = '%s/lib/%s/file%s?raw=1' % (
            service_url, self.repo_id, self.image_path)
        self.assertEqual(self.view_image(service_url, reference_url).status_code, 302)

    def test_dots_in_service_hostname_cannot_match_other_characters(self):
        service_url = 'https://seafile.example.com'
        reference_url = 'https://seafileXexampleYcom/lib/%s/file%s?raw=1' % (
            self.repo_id, self.image_path)
        self.assertEqual(self.view_image(service_url, reference_url).status_code, 404)
        self.mocks['render_error'].assert_called_once_with(self.request, 'Image does not exist')
        self.mocks['seafile_api'].get_fileserver_access_token.assert_not_called()

    def test_unbalanced_service_url_metacharacter_does_not_break_matching(self):
        service_url = 'https://seafile.example.com/['
        reference_url = '%s/lib/%s/file%s?raw=1' % (
            service_url, self.repo_id, self.image_path)
        self.assertEqual(self.view_image(service_url, reference_url).status_code, 302)

    def test_repository_id_cannot_inject_an_alternative(self):
        self.file_share.repo_id = self.repo_id + '|other-repo'
        service_url = 'https://seafile.example.com'
        reference_url = '%s/lib/other-repo/file%s?raw=1' % (service_url, self.image_path)
        self.assertEqual(self.view_image(service_url, reference_url).status_code, 404)
        self.mocks['seafile_api'].get_fileserver_access_token.assert_not_called()
