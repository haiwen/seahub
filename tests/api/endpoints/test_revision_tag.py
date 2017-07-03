import os
import json

from mock import patch
from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seaserv import seafile_api


class RevisionTagsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.tag_name = "test_tag_name"
        self.repo = seafile_api.get_repo(self.create_repo(
            name="test_repo",
            desc="",
            username=self.user.username,
            passwd=None
        ))
        self.url = reverse("api-v2.1-revision-tags-tagged-items") 
        self.url_get = reverse("api-v2.1-revision-tags-tag-names") 

    @patch('seahub.api2.endpoints.revision_tag.check_folder_permission')
    def test_revision_tags(self, mock_permission):
        mock_permission.return_value = 'rw'
        c_resp = self.client.post(self.url, {
            "tag_names": self.tag_name,
            "repo_id": self.repo.repo_id,
        })
        assert c_resp.status_code in [200, 201]
        g_resp = self.client.get(self.url_get+"?name_only=true")
        assert g_resp.status_code == 200
        assert self.tag_name in g_resp.data

        #d_resp = self.client.delete(self.url+"?repo_id="+str(self.repo.repo_id)+
        #                            "&tag_name="+str(self.tag_name))
        #assert d_resp.status_code in [200, 202]

        #g_resp = self.client.get(self.url_get+"?name_only=true")
        #assert g_resp.status_code == 200
        #assert self.tag_name not in g_resp.data
