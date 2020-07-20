# -*- coding: utf-8 -*-
import json
import uuid

from django.urls import reverse

from seahub.test_utils import BaseTestCase

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class SmartLinkTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path= self.file
        self.folder_path= self.folder
        self.url = reverse('api-v2.1-smart-link')

    def tearDown(self):
        self.remove_repo()

    def test_get_file_smart_link(self):

        self.login_as(self.user)

        para = '?repo_id=%s&path=%s&is_dir=false' % (self.repo_id, self.file_path)
        resp = self.client.get(self.url + para)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['smart_link'] is not None
        assert json_resp['smart_link_token'] is not None

    def test_get_folder_smart_link(self):

        self.login_as(self.user)

        para = '?repo_id=%s&path=%s&is_dir=true' % (self.repo_id, self.folder_path)
        resp = self.client.get(self.url + para)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['smart_link'] is not None
        assert json_resp['smart_link_token'] is not None

    def test_get_file_smart_link_with_invalid_user_permission(self):

        self.login_as(self.admin)

        # file smart link
        para = '?repo_id=%s&path=%s&is_dir=false' % (self.repo_id, self.file_path)
        resp = self.client.get(self.url + para)
        self.assertEqual(403, resp.status_code)

        # folder smart link
        para = '?repo_id=%s&path=%s&is_dir=true' % (self.repo_id, self.folder_path)
        resp = self.client.get(self.url + para)
        self.assertEqual(403, resp.status_code)


class SmartLinkTokenTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path= self.file
        self.folder_path= self.folder

    def tearDown(self):
        self.remove_repo()

    def test_get_info_via_smart_link_token(self):

        self.login_as(self.user)

        # get file smart link token
        url = reverse('api-v2.1-smart-link')
        para = '?repo_id=%s&path=%s&is_dir=false' % (self.repo_id, self.file_path)
        resp = self.client.get(url + para)
        json_resp = json.loads(resp.content)
        file_smart_link_token = json_resp['smart_link_token']

        # get file info via smart link token
        url = reverse('api-v2.1-smart-links-token', args=[file_smart_link_token])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['repo_id'] == self.repo_id
        assert json_resp['path'] == self.file_path
        assert json_resp['is_dir'] == False

        # get folder smart link token
        url = reverse('api-v2.1-smart-link')
        para = '?repo_id=%s&path=%s&is_dir=true' % (self.repo_id, self.folder_path)
        resp = self.client.get(url + para)
        json_resp = json.loads(resp.content)
        folder_smart_link_token = json_resp['smart_link_token']

        # get folder info via smart link token
        url = reverse('api-v2.1-smart-links-token', args=[folder_smart_link_token])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['repo_id'] == self.repo_id
        assert json_resp['path'] == self.folder_path
        assert json_resp['is_dir'] == True

    def test_get_info_via_smart_link_token_with_invalid_user_permission(self):

        # get file smart link token
        self.login_as(self.user)
        url = reverse('api-v2.1-smart-link')
        para = '?repo_id=%s&path=%s&is_dir=false' % (self.repo_id, self.file_path)
        resp = self.client.get(url + para)
        json_resp = json.loads(resp.content)
        file_smart_link_token = json_resp['smart_link_token']
        self.logout()

        # get file info via smart link token
        self.login_as(self.admin)
        url = reverse('api-v2.1-smart-links-token', args=[file_smart_link_token])
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)
        self.logout()

        # get folder smart link token
        self.login_as(self.user)
        url = reverse('api-v2.1-smart-link')
        para = '?repo_id=%s&path=%s&is_dir=true' % (self.repo_id, self.folder_path)
        resp = self.client.get(url + para)
        json_resp = json.loads(resp.content)
        folder_smart_link_token = json_resp['smart_link_token']
        self.logout()

        # get folder info via smart link token
        self.login_as(self.admin)
        url = reverse('api-v2.1-smart-links-token', args=[folder_smart_link_token])
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)
        self.logout()

    def test_get_info_via_smart_link_token_with_invalid_token(self):

        file_smart_link_token = uuid.uuid4()
        folder_smart_link_token = uuid.uuid4()

        self.login_as(self.user)

        url = reverse('api-v2.1-smart-links-token', args=[file_smart_link_token])
        resp = self.client.get(url)
        self.assertEqual(400, resp.status_code)

        url = reverse('api-v2.1-smart-links-token', args=[folder_smart_link_token])
        resp = self.client.get(url)
        self.assertEqual(400, resp.status_code)
