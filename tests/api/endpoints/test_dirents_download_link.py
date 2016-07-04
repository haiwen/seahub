# -*- coding: utf-8 -*-
import os
import json

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase


class DirentsDownloadLinkViewTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder_path)

        self.url = reverse('api-v2.1-dirents-download-link-view', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()

    def test_can_get_download_url(self):
        self.login_as(self.user)
        parent_dir = '/'
        dirents = self.file_name + ',' + self.folder_name
        url = self.url + '?parent_dir=%s&dirents=%s' % (parent_dir, dirents)

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert '8082' in json_resp['url']

    def test_args_invalid(self):
        self.login_as(self.user)
        parent_dir = '/'
        dirents = self.file_name + ',' + self.folder_name

        url = self.url + '?prent_dir=%s&dirents=%s' % (parent_dir, dirents)
        resp = self.client.get(url)
        self.assertEqual(400, resp.status_code)

        url = self.url + '?parent_dir=%s&dirent=%s' % (parent_dir, dirents)
        resp = self.client.get(url)
        self.assertEqual(400, resp.status_code)

        url = self.url + '?parent_dir=%s&dirents=%s' % (parent_dir+'invalid', dirents)
        resp = self.client.get(url)
        self.assertEqual(404, resp.status_code)

    def test_permission_invalid(self):
        self.login_as(self.admin)
        parent_dir = '/'
        dirents = self.file_name + ',' + self.folder_name

        url = self.url + '?parent_dir=%s&dirents=%s' % (parent_dir, dirents)
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)
