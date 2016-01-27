"""seahub/api2/views.py::Repo api tests.
"""
import json
from tests.common.utils import randstring
from django.core.urlresolvers import reverse
from seaserv import seafile_api
from seahub.test_utils import BaseTestCase
try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class DirDownloadTest(BaseTestCase):
    def setUp(self):
        self.folder_path = self.folder
        self.user2 = self.create_user('test2@test.com')

    def tearDown(self):
        self.remove_repo()
        self.remove_user(self.user.username)
        self.remove_user(self.user2.username)

    def test_can_download(self):
        self.login_as(self.user)

        dl_url = reverse('api2-dir-download', args=[self.repo.id]) + '?p=' + self.folder_path
        resp = self.client.get(dl_url)
        self.assertEqual(200, resp.status_code)
        assert '8082/files/' in resp.content

    def test_library_not_found(self):
        self.login_as(self.user)
        invalid_repo_id = self.repo.id[:-4] + '1234'

        dl_url = reverse('api2-dir-download', args=[invalid_repo_id]) + '?p=' + self.folder_path
        resp = self.client.get(dl_url)
        self.assertEqual(404, resp.status_code)

    def test_path_is_missing(self):
        self.login_as(self.user)

        dl_url = reverse('api2-dir-download', args=[self.repo.id])
        resp = self.client.get(dl_url)
        self.assertEqual(400, resp.status_code)

        dl_url = reverse('api2-dir-download', args=[self.repo.id]) + '?pa=' + self.folder_path
        resp = self.client.get(dl_url)
        self.assertEqual(400, resp.status_code)

    def test_wrong_path(self):
        self.login_as(self.user)

        dl_url = reverse('api2-dir-download', args=[self.repo.id]) + '?p=' + self.folder_path + '/asf/'
        resp = self.client.get(dl_url)
        self.assertEqual(404, resp.status_code)
