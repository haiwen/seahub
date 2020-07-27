import os
import json

from mock import patch
from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seaserv import seafile_api


class RevisionTagsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)
        self.url = reverse("api-v2.1-admin-revision-tags-tagged-items")
        self.url_create = reverse("api-v2.1-revision-tags-tagged-items")
        self.repo = seafile_api.get_repo(self.create_repo(
            name="test_repo",
            desc="",
            username=self.admin.username,
            passwd=None
        ))
        self.tag_name = "test_tag_name"

    def test_get_revision_by_user(self):
        resp = self.client.post(self.url_create, {
            "tag_names": self.tag_name,
            "repo_id": self.repo.id,
            "commit_id": ''
        })
        assert resp.status_code in [200, 201]
        resp = self.client.get(self.url+"?user="+self.admin.username)
        assert self.tag_name in [e["tag"] for e in resp.data]
        resp = self.client.get(self.url+"?user="+self.user.username)
        assert not self.tag_name in [e["tag"] for e in resp.data]

    def test_get_revision_by_repo_id(self):
        p_repo = seafile_api.get_repo(self.create_repo(
            name="test_repo",
            desc="",
            username=self.admin.username,
            passwd=None
        ))
        resp = self.client.post(self.url_create, {
            "tag_names": self.tag_name,
            "repo_id": self.repo.id,
            "commit_id": ""
        })
        assert resp.status_code in [200, 201]
        resp = self.client.get(self.url+"?repo_id="+self.repo.id)
        assert self.tag_name in [e["tag"] for e in resp.data]
        resp = self.client.get(self.url+"?repo_id="+p_repo.id)
        assert not self.tag_name in [e["tag"] for e in resp.data]

    def test_revisin_by_tag_name(self):
        resp = self.client.post(self.url_create, {
            "tag_names": self.tag_name,
            "repo_id": self.repo.id,
            "commit_id": ""
        })
        assert resp.status_code in [200, 201]
        resp = self.client.get(self.url+"?tag_name="+self.tag_name)
        assert self.tag_name in [e["tag"] for e in resp.data]
        resp = self.client.get(self.url+"?tag_name=Hello")
        assert not self.tag_name in [e["tag"] for e in resp.data]

    def test_revisin_by_tag_contains(self):
        resp = self.client.post(self.url_create, {
            "tag_names": self.tag_name,
            "repo_id": self.repo.id,
            "commit_id": ""
        })
        assert resp.status_code in [200, 201]
        resp = self.client.get(self.url+"?tag_contains="+self.tag_name[:-2])
        assert self.tag_name in [e["tag"] for e in resp.data]
        resp = self.client.get(self.url+"?tag_contains=Hello")
        assert not self.tag_name in [e["tag"] for e in resp.data]

    def test_revision_all(self):
        resp = self.client.post(self.url_create, {
            "tag_names": self.tag_name,
            "repo_id": self.repo.id,
            "commit_id": ""
        })
        assert resp.status_code in [200, 201]
        resp = self.client.get(self.url)
        assert self.tag_name in [e["tag"] for e in resp.data]

    def test_get_all_tag_when_repo_deleted(self):
        resp = self.client.post(self.url_create, {
            "tag_names": self.tag_name,
            "repo_id": self.repo.id,
            "commit_id": ""
        })
        assert resp.status_code in [200, 201]
        seafile_api.remove_repo(self.repo.id)
        resp = self.client.get(self.url)
        assert resp.status_code in [200, 201]
