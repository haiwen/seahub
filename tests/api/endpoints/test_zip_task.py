# -*- coding: utf-8 -*-
import os
import json

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

from seaserv import seafile_api

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False


class ZipTaskViewTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder_path)

        self.url = reverse('api-v2.1-zip-task', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()

    def test_can_get_download_dir_zip_token(self):
        self.login_as(self.user)

        parent_dir = '/'
        folder_name = self.folder_name
        url = self.url + '?parent_dir=%s&dirents=%s' % (parent_dir, folder_name)

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['zip_token']) == 36

    def test_can_get_download_multi_zip_token(self):

        # create another folder for download multi
        another_folder_name = 'another_folder_name'
        seafile_api.post_dir(repo_id=self.repo.id,
                parent_dir='/', dirname=another_folder_name,
                username=self.user.username)

        self.login_as(self.user)

        parent_dir = '/'
        folder_name = self.folder_name
        url = self.url + '?parent_dir=%s&dirents=%s&dirents=%s' % (parent_dir,
                folder_name, another_folder_name)

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['zip_token']) == 36

    def test_can_get_zip_token_with_invalid_repo_permission(self):
        self.login_as(self.admin)

        parent_dir = '/'
        folder_name = self.folder_name
        url = self.url + '?parent_dir=%s&dirents=%s' % (parent_dir, folder_name)

        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

    def test_can_get_zip_token_for_r_permission_folder(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.set_user_folder_r_permission_to_admin()

        self.login_as(self.admin)

        parent_dir = '/'
        folder_name = self.folder_name
        url = self.url + '?parent_dir=%s&dirents=%s' % (parent_dir, folder_name)

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['zip_token']) == 36

    def test_can_get_zip_token_for_rw_permission_folder(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.set_user_folder_rw_permission_to_admin()

        self.login_as(self.admin)

        parent_dir = '/'
        folder_name = self.folder_name
        url = self.url + '?parent_dir=%s&dirents=%s' % (parent_dir, folder_name)

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['zip_token']) == 36
