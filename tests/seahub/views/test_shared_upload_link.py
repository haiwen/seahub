from django.core.urlresolvers import reverse

from seahub.share.models import UploadLinkShare
from seahub.test_utils import BaseTestCase

class SharedUploadLinkTest(BaseTestCase):
    def setUp(self):
        share_file_info = {
            'username': self.user,
            'repo_id': self.repo.id,
            'path': '/',
            'password': None,
            'expire_date': None,
        }
        self.fs = UploadLinkShare.objects.create_upload_link_share(**share_file_info)

        share_file_info.update({'password': '12345678'})
        self.enc_fs = UploadLinkShare.objects.create_upload_link_share(**share_file_info)

    def tearDown(self):
        self.remove_repo()

    def test_can_render(self):
        resp = self.client.get(
            reverse('view_shared_upload_link', args=[self.fs.token])
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'view_shared_upload_link.html')
        self.assertContains(resp, "Add Files")

    def test_can_render_enc(self):
        resp = self.client.get(
            reverse('view_shared_upload_link', args=[self.enc_fs.token])
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')

        resp = self.client.post(reverse('view_shared_upload_link',
                                        args=[self.enc_fs.token]), {
                                            'password': '12345678',
                                        }
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'view_shared_upload_link.html')
        self.assertContains(resp, "Add Files")

        resp = self.client.get(
            reverse('view_shared_upload_link', args=[self.enc_fs.token])
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'view_shared_upload_link.html')

    def test_can_not_render_enc_without_password(self):
        resp = self.client.get(
            reverse('view_shared_upload_link', args=[self.enc_fs.token])
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')

    def test_can_not_render_enc_with_wrong_password(self):

        resp = self.client.post(reverse('view_shared_upload_link',
                                        args=[self.enc_fs.token]), {
                                            'password': '1234567',
                                        }
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')
        self.assertContains(resp, 'Please enter a correct password')
