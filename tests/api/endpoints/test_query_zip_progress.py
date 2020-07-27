# -*- coding: utf-8 -*-
import json

from django.urls import reverse

from seahub.test_utils import BaseTestCase

class QueryZipProgressViewTest(BaseTestCase):

    def _get_zip_token(self):
        self.login_as(self.user)

        parent_dir = '/'
        folder_name = self.folder
        args = '?parent_dir=%s&dirents=%s' % (parent_dir, folder_name)
        url = reverse('api-v2.1-zip-task', args=[self.repo.id]) + args

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        return json_resp['zip_token']

    def setUp(self):
        self.url = reverse('api-v2.1-query-zip-progress')

    def tearDown(self):
        self.remove_repo()

    def test_can_get_progress(self):

        token = self._get_zip_token()

        url = self.url + '?token=%s' % token

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['total'] is not None
        assert json_resp['zipped'] is not None
