"""seahub/api2/views.py::Repo api tests.
"""
import json
from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.share.models import UploadLinkShare, FileShare

class RepoSharedLinksTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id

        upload_link_share = UploadLinkShare.objects.create_upload_link_share(
            self.user.username, self.repo_id, self.folder)

        file_download_link_share = FileShare.objects.create_file_link(self.user.username,
            self.repo_id, self.file)

        dir_download_link_share = FileShare.objects.create_dir_link(self.user.username,
            self.repo_id, self.folder)

        self.upload_token = upload_link_share.token
        self.file_download_token = file_download_link_share.token
        self.dir_download_token = dir_download_link_share.token

    def tearDown(self):
        self.remove_repo()

    def test_can_get_download_share_link(self):
        self.login_as(self.user)
        resp = self.client.get(reverse("api2-repo-download-shared-links", args=[self.repo_id]))
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 2

        assert json_resp[0]['token'] == self.file_download_token
        assert json_resp[0]['create_by'] == self.user.email
        assert json_resp[1]['token'] == self.dir_download_token
        assert json_resp[1]['create_by'] == self.user.email

    def test_can_delete_download_share_link(self):
        self.login_as(self.user)
        resp = self.client.delete(reverse("api2-repo-download-shared-link", args=[self.repo_id, self.file_download_token]))
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-download-shared-links", args=[self.repo_id]))
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 1

        resp = self.client.delete(reverse("api2-repo-download-shared-link", args=[self.repo_id, self.dir_download_token]))
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-download-shared-links", args=[self.repo_id]))
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0

    def test_can_get_upload_share_link(self):
        self.login_as(self.user)
        resp = self.client.get(reverse("api2-repo-upload-shared-links", args=[self.repo_id]))
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 1

        assert json_resp[0]['create_by'] == self.user.email
        assert json_resp[0]['token'] == self.upload_token

    def test_can_delete_upload_share_link(self):
        self.login_as(self.user)
        resp = self.client.delete(reverse("api2-repo-upload-shared-link", args=[self.repo_id, self.upload_token]))
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-upload-shared-links", args=[self.repo_id]))
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0

    def test_can_not_get_download_share_link_if_not_repo_owner(self):
        self.login_as(self.admin)
        resp = self.client.get(reverse("api2-repo-download-shared-links", args=[self.repo_id]))
        self.assertEqual(403, resp.status_code)

    def test_can_not_delete_download_share_link_if_not_repo_owner(self):
        self.login_as(self.admin)

        resp = self.client.delete(reverse("api2-repo-download-shared-link", args=[self.repo_id, self.file_download_token]))
        self.assertEqual(403, resp.status_code)

        resp = self.client.delete(reverse("api2-repo-download-shared-link", args=[self.repo_id, self.dir_download_token]))
        self.assertEqual(403, resp.status_code)

    def test_can_not_get_upload_share_link_if_not_repo_owner(self):
        self.login_as(self.admin)
        resp = self.client.get(reverse("api2-repo-upload-shared-links", args=[self.repo_id]))
        self.assertEqual(403, resp.status_code)

    def test_can_not_delete_upload_share_link_if_not_repo_owner(self):
        self.login_as(self.admin)
        resp = self.client.delete(reverse("api2-repo-upload-shared-link", args=[self.repo_id, self.upload_token]))
        self.assertEqual(403, resp.status_code)
