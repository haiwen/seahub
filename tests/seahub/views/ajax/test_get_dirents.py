import json

from seaserv import seafile_api
from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

class GetDirentsTest(BaseTestCase):
    def setUp(self):
        a = self.file        # create a file
        self.url = reverse('get_dirents', args=[self.repo.id]) + "?path=/"

    def test_can_get(self):
        self.login_as(self.user)
        resp = self.client.get(self.url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 1

    def test_cannot_get_others(self):
        self.login_as(self.admin)
        resp = self.client.get(self.url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(403, resp.status_code)

    def test_get_entries_in_enc_repo(self):
        self.login_as(self.user)

        url = reverse('get_dirents', args=[self.enc_repo.id]) + "?path=/"
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(200, resp.status_code)
