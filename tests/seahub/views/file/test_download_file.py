from django.urls import reverse

from seaserv import seafile_api

from seahub.test_utils import BaseTestCase

class DownloadFileTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def test_can_download(self):
        obj_id = seafile_api.get_file_id_by_path(self.repo.id, self.file)

        resp = self.client.get(reverse('download_file', args=[
            self.repo.id, obj_id]))

        self.assertEqual(302, resp.status_code)
        assert '8082' in resp.get('location')
