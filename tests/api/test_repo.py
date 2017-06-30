"""seahub/api2/views.py::Repo api tests.
"""
import json
from django.core.urlresolvers import reverse

from seahub.share.models import FileShare, UploadLinkShare
from seahub.test_utils import BaseTestCase

class RepoTest(BaseTestCase):

    def test_can_fetch(self):
        self.login_as(self.user)

        resp = self.client.get(reverse("api2-repo", args=[self.repo.id]))
        json_resp = json.loads(resp.content)

        self.assertFalse(json_resp['encrypted'])
        self.assertIsNotNone(json_resp['mtime'])
        self.assertIsNotNone(json_resp['owner'])
        self.assertIsNotNone(json_resp['id'])
        self.assertIsNotNone(json_resp['size'])
        self.assertIsNotNone(json_resp['name'])
        self.assertIsNotNone(json_resp['root'])
        self.assertIsNotNone(json_resp['type'])
        self.assertIsNotNone(json_resp['file_count'])

    def test_can_delete(self):
        self.login_as(self.user)

        resp = self.client.delete(
            reverse('api2-repo', args=[self.repo.id])
        )
        self.assertEqual(200, resp.status_code)

    def test_rename_with_invalid_name(self):

        self.login_as(self.user)

        invalid_name = '123/456'
        data = {'repo_name': invalid_name}

        resp = self.client.post(
                reverse('api2-repo', args=[self.repo.id])+'?op=rename', data)

        self.assertEqual(400, resp.status_code)

    def test_rename_repo(self):

        self.login_as(self.user)

        invalid_name = '123456'
        data = {'repo_name': invalid_name}

        resp = self.client.post(
                reverse('api2-repo', args=[self.repo.id])+'?op=rename', data)

        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp == 'success'

    def test_cleaning_stuff_when_delete(self):
        self.login_as(self.user)

        # create download and upload links
        FileShare.objects.create_dir_link(self.user.username,
                                          self.repo.id, '/', None)
        FileShare.objects.create_file_link(self.user.username,
                                           self.repo.id, self.file)
        UploadLinkShare.objects.create_upload_link_share(self.user.username,
                                                         self.repo.id, '/')
        assert len(FileShare.objects.all()) == 2
        assert len(UploadLinkShare.objects.all()) == 1

        self.client.delete(
            reverse('api2-repo', args=[self.repo.id])
        )

        assert len(FileShare.objects.all()) == 0
        assert len(UploadLinkShare.objects.all()) == 0

    def test_invalid_magic_argu(self):
        self.login_as(self.user)

        resp = self.client.post(reverse('api2-repo', args=[self.repo.id])+'?op=checkpassword&magic=123')
        self.assertEqual(500, resp.status_code)
