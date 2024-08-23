# -*- coding: utf-8 -*-
import json
from mock import patch

from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.share.models import FileShare

class ShareLinkZipTaskViewTest(BaseTestCase):

    def _add_dir_share_link(self):
        fs = FileShare.objects.create_dir_link(self.user.username,
                self.repo.id, self.folder, None, None)

        return fs.token

    def setUp(self):
        self.url = reverse('api-v2.1-share-link-zip-task')

    def tearDown(self):
        self.remove_repo()

    def test_can_get_share_link_zip_task(self):

        share_link_token = self._add_dir_share_link()

        url = self.url + '?share_link_token=%s&path=/' % share_link_token

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['zip_token']) == 36
