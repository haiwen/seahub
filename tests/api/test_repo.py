"""seahub/api2/views.py::Repo api tests.
"""
import json
from mock import patch

import pytest
pytestmark = pytest.mark.django_db

from django.urls import reverse
from django.template.defaultfilters import filesizeformat

from seaserv import seafile_api

from seahub.share.models import FileShare, UploadLinkShare
from seahub.test_utils import BaseTestCase

class RepoTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()
        self.login_as(self.user)
        self.url = reverse('api2-repos')
        self.repo_id = self.repo

        from constance import config
        self.config = config

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

    def test_rename_repo_with_read_only_status(self):

        self.login_as(self.user)

        seafile_api.set_repo_status(self.repo.id, 1)

        invalid_name = '123456'
        data = {'repo_name': invalid_name}

        resp = self.client.post(
                reverse('api2-repo', args=[self.repo.id])+'?op=rename', data)

        self.assertEqual(403, resp.status_code)

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

    def test_can_search(self):
        resp = self.client.get(self.url + "?type=mine&nameContains=t")
        resp_json = json.loads(resp.content)
        assert self.repo.id in [e['id'] for e in resp_json]
        res_repo = [e for e in resp_json if e['id'] == self.repo.id][0]
        assert res_repo['type'] ==  'repo'
        assert res_repo['id'] == self.repo.id
        assert res_repo['owner'] == self.user.email
        assert res_repo['name'] == self.repo.name
        assert res_repo['mtime'] == self.repo.last_modify
        assert res_repo['modifier_email'] == self.repo.last_modifier
        assert res_repo['size'] == self.repo.size
        assert res_repo['size_formatted'] == filesizeformat(self.repo.size)
        assert res_repo['encrypted'] == self.repo.encrypted
        assert res_repo['permission'] == 'rw'
        assert res_repo['virtual'] == False
        assert res_repo['root'] == ''
        assert res_repo['head_commit_id'] == self.repo.head_cmmt_id
        assert res_repo['version'] == self.repo.version
        self.remove_repo(self.repo.id)

    def test_can_not_case_sensitive(self):
        resp = self.client.get(self.url + "?type=mine&nameContains=T")
        resp_json = json.loads(resp.content)
        assert self.repo.id in [e['id'] for e in resp_json]
        res_repo = [e for e in resp_json if e['id'] == self.repo.id][0]
        assert res_repo['type'] ==  'repo'
        assert res_repo['id'] == self.repo.id
        assert res_repo['owner'] == self.user.email
        assert res_repo['name'] == self.repo.name
        assert res_repo['mtime'] == self.repo.last_modify
        assert res_repo['modifier_email'] == self.repo.last_modifier
        assert res_repo['size'] == self.repo.size
        assert res_repo['size_formatted'] == filesizeformat(self.repo.size)
        assert res_repo['encrypted'] == self.repo.encrypted
        assert res_repo['permission'] == 'rw'
        assert res_repo['virtual'] == False
        assert res_repo['root'] == ''
        assert res_repo['head_commit_id'] == self.repo.head_cmmt_id
        assert res_repo['version'] == self.repo.version
        self.remove_repo(self.repo.id)

    def test_can_get_all_own_repo_with_no_parameter(self):
        resp = self.client.get(self.url + "?type=mine")
        resp_json = json.loads(resp.content)
        assert self.repo.id in [e['id'] for e in resp_json]
        res_repo = [e for e in resp_json if e['id'] == self.repo.id][0]
        assert res_repo['type'] ==  'repo'
        assert res_repo['id'] == self.repo.id
        assert res_repo['owner'] == self.user.email
        assert res_repo['name'] == self.repo.name
        assert res_repo['mtime'] == self.repo.last_modify
        assert res_repo['modifier_email'] == self.repo.last_modifier
        assert res_repo['size'] == self.repo.size
        assert res_repo['size_formatted'] == filesizeformat(self.repo.size)
        assert res_repo['encrypted'] == self.repo.encrypted
        assert res_repo['permission'] == 'rw'
        assert res_repo['virtual'] == False
        assert res_repo['root'] == ''
        assert res_repo['head_commit_id'] == self.repo.head_cmmt_id
        self.remove_repo(self.repo.id)

    def test_can_get_share_repo(self):
        self.logout()
        self.login_as(self.admin)
        share_repo = seafile_api.get_repo(self.create_repo(
            name='test-share-repo', desc='', username=self.admin.username,
            passwd=None))
        share_url = reverse('api2-dir-shared-items', kwargs=dict(repo_id=share_repo.id))
        data = "share_type=user&permission=rw&username=%s" % self.user.username
        self.client.put(share_url, data, 'application/x-www-form-urlencoded')

        self.logout()
        self.login_as(self.user)

        resp = self.client.get(self.url + "?nameContaines=sh")
        resp_json = json.loads(resp.content)
        assert self.repo.id in [e['id'] for e in resp_json]
        res_repo = [e for e in resp_json if e['id'] == share_repo.id and e['type'] == 'srepo'][0]
        assert res_repo['type'] ==  'srepo'
        assert res_repo['id'] == share_repo.id
        assert res_repo['owner'] == self.admin.email
        assert res_repo['name'] == share_repo.name
        assert res_repo['mtime'] == share_repo.last_modify
        assert res_repo['modifier_email'] == share_repo.last_modifier
        assert res_repo['size'] == share_repo.size
        assert res_repo['size_formatted'] == filesizeformat(share_repo.size)
        assert res_repo['encrypted'] == share_repo.encrypted
        assert res_repo['permission'] == 'rw'
        assert res_repo['root'] == ''
        assert res_repo['head_commit_id'] == share_repo.head_cmmt_id
        self.remove_repo(share_repo.id)

    def test_can_get_share_group_repo(self):
        self.config.ENABLE_SHARE_TO_ALL_GROUPS = True

        self.logout()
        self.login_as(self.admin)
        share_repo = seafile_api.get_repo(self.create_repo(
            name='test-group-repo', desc='', username=self.admin.username,
            passwd=None))
        share_group_url = reverse('api2-dir-shared-items', kwargs=dict(repo_id=share_repo.id))
        data = "share_type=group&permission=rw&group_id=%s" % self.group.id
        self.client.put(share_group_url, data, 'application/x-www-form-urlencoded')

        self.logout()
        self.login_as(self.user)

        resp = self.client.get(self.url + "?nameContaines=group")
        resp_json = json.loads(resp.content)
        assert self.repo.id in [e['id'] for e in resp_json]
        res_repo = [e for e in resp_json if e['id'] == share_repo.id and e['type'] == 'grepo'][0]
        assert res_repo['id'] == share_repo.id
        assert res_repo['owner'] == self.group.group_name
        assert res_repo['name'] == share_repo.name
        assert res_repo['mtime'] == share_repo.last_modify
        assert res_repo['modifier_email'] == share_repo.last_modifier
        assert res_repo['size'] == share_repo.size
        assert res_repo['encrypted'] == share_repo.encrypted
        assert res_repo['permission'] == 'rw'
        assert res_repo['root'] == ''
        assert res_repo['head_commit_id'] == share_repo.head_cmmt_id
        assert res_repo['version'] == share_repo.version
        assert res_repo['groupid'] == self.group.id
        assert res_repo['group_name'] == self.group.group_name
        self.remove_repo(share_repo.id)

    @patch('seahub.base.accounts.UserPermissions.can_view_org')
    def test_can_search_public_repos(self, mock_can_view_org):
        mock_can_view_org.return_value = True
        self.logout()
        self.login_as(self.admin)
        share_group_url = reverse('api2-pub-repos')
        data = "name=public-repo&permission=rw"
        pub_repo = self.client.post(share_group_url, data, 'application/x-www-form-urlencoded')
        share_repo_id = json.loads(pub_repo.content)
        share_repo = seafile_api.get_repo(share_repo_id['id'])

        self.logout()
        self.login_as(self.user)
        resp = self.client.get(self.url + "?q=publi")
        resp_json = json.loads(resp.content)
        assert self.repo.id in [e['id'] for e in resp_json]
        res_repo = [e for e in resp_json if e['id'] == share_repo.id and e['owner'] == 'Organization'][0]
        assert res_repo['id'] == share_repo.id
        assert res_repo['owner'] == 'Organization'
        assert res_repo['name'] == share_repo.name
        assert res_repo['mtime'] == share_repo.last_modify
        assert res_repo['modifier_email'] == share_repo.last_modifier
        assert res_repo['size'] == share_repo.size
        assert res_repo['size_formatted'] == filesizeformat(share_repo.size)
        assert res_repo['encrypted'] == share_repo.encrypted
        assert res_repo['permission'] == 'rw'
        assert res_repo['share_from'] == self.admin.email
        assert res_repo['share_type'] == 'public'
        assert res_repo['root'] == ''
        assert res_repo['head_commit_id'] == share_repo.head_cmmt_id
        assert res_repo['version'] == share_repo.version
