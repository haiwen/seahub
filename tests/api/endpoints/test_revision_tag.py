import os
import json

from mock import patch
from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seaserv import seafile_api


class RevisionTagsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name="test_repo",
            desc="",
            username=self.user.username,
            passwd=None
        ))
        self.url = reverse("api-v2.1-revision-tags-tagged-items") 
        self.url_get = reverse("api-v2.1-revision-tags-tag-names") 

    @patch('seahub.api2.endpoints.revision_tag.check_folder_permission')
    def test_post_revision_tags(self, mock_permission):
        mock_permission.return_value = 'rw'
        c_resp = self.client.post(self.url, {
            "tag_names": 'test_tag_name,test_tag',
            "repo_id": self.repo.repo_id,
            "commit_id": ''
        })
        c_res = json.loads(c_resp.content)
        res_tag_name_list = [e["tag"] for e in c_res["revisionTags"]]
        self.assertIn(c_resp.status_code, [200, 201])
        self.assertIn('test_tag_name', res_tag_name_list)
        self.assertIn('test_tag', res_tag_name_list)
        g_resp = self.client.get(self.url_get+"?name_only=true")
        self.assertEqual(200, g_resp.status_code)
        self.assertIn('test_tag_name', g_resp.data)
        self.assertIn('test_tag', g_resp.data)

    @patch('seahub.api2.endpoints.revision_tag.check_folder_permission')
    def test_put_revision_tags(self, mock_permission):
        mock_permission.return_value = 'rw'
        data = 'tag_names=test_tag,test_tag_one&repo_id=%s&commit_id=' % self.repo.repo_id
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)
        p_res = json.loads(resp.content)
        res_tag_name_list = [e["tag"] for e in p_res["revisionTags"]]
        self.assertIn(resp.status_code, [200, 201])
        self.assertIn('test_tag_one', res_tag_name_list)
        self.assertIn('test_tag', res_tag_name_list)

        g_resp = self.client.get(self.url_get+"?name_only=true")
        self.assertEqual(200, g_resp.status_code)
        self.assertIn('test_tag', g_resp.data)
        self.assertIn('test_tag_one', g_resp.data)

        data = 'tag_names=test_del_tag&repo_id=%s&commit_id=' % self.repo.repo_id
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        g_resp = self.client.get(self.url_get+"?name_only=true")
        self.assertEqual(200, g_resp.status_code)
        self.assertNotIn('test_tag', g_resp.data)
        self.assertNotIn('test_tag_one', g_resp.data)
        self.assertIn('test_del_tag', g_resp.data)

    @patch('seahub.api2.endpoints.revision_tag.check_folder_permission')
    def test_delete_revision_tags(self, mock_permission):
        mock_permission.return_value = 'rw'
        data = 'tag_names=test_tag,test_tag_one&repo_id=%s&commit_id=' % self.repo.repo_id
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)
        self.delete_url = self.url + '?repo_id=' + self.repo.repo_id + '&tag_name=test_tag'
        resp = self.client.delete(self.delete_url)
        self.assertEqual(200, resp.status_code)
