from django.core.urlresolvers import reverse

from seahub.share.models import UploadLinkShare, FileShare
from seahub.test_utils import BaseTestCase

class RepoSharedLinkTest(BaseTestCase):
    def setUp(self):
        username = self.user.username
        upload_link_share = UploadLinkShare.objects.create_upload_link_share(
            username, self.repo.id, self.folder)

        file_download_link_share = FileShare.objects.create_file_link(
            username, self.repo.id, self.file)

        dir_download_link_share = FileShare.objects.create_dir_link(
            username, self.repo.id, self.folder)

        self.upload_token = upload_link_share.token
        self.file_download_token = file_download_link_share.token
        self.dir_download_token = dir_download_link_share.token

        self.login_as(self.user)

    def test_can_render(self):
        resp = self.client.get(reverse('repo_shared_link', args=[self.repo.id]))

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'repo_shared_link.html')
        assert len(resp.context['fileshares']) == 2
        assert len(resp.context['uploadlinks']) == 1

        for e in resp.context['fileshares']:
            assert e.filesize == 0
