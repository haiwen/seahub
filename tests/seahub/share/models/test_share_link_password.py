from django.test import RequestFactory

from seahub.share.models import FileShare, UploadLinkShare, check_share_link_common
from seahub.test_utils import BaseTestCase


class ShareLinkPasswordTest(BaseTestCase):

    def _post(self, token, password):
        request = RequestFactory().post('/link/%s/' % token, {'password': password})
        request.session = {}
        return request

    def test_file_share_keeps_trailing_brace_in_password(self):
        password = 'file-link-{'
        share = FileShare.objects.create_file_link(
            self.user.username, self.repo.id, self.file, password=password)

        self.assertEqual(share.get_password(), password)

        passed, _ = check_share_link_common(self._post(share.token, password), share)
        self.assertTrue(passed)

    def test_upload_link_keeps_trailing_brace_in_password(self):
        password = 'upload-link-{'
        share = UploadLinkShare.objects.create_upload_link_share(
            self.user.username, self.repo.id, self.folder, password=password)

        self.assertEqual(share.get_password(), password)

        passed, _ = check_share_link_common(
            self._post(share.token, password), share, is_upload_link=True)
        self.assertTrue(passed)

    def test_wrong_password_is_still_rejected(self):
        share = FileShare.objects.create_file_link(
            self.user.username, self.repo.id, self.file, password='file-link-{')

        passed, _ = check_share_link_common(self._post(share.token, 'file-link'), share)
        self.assertFalse(passed)
