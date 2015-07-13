#coding: UTF-8
import json

from seaserv import seafile_api

from seahub.test_utils import BaseTestCase
from tests.common.utils import urljoin
from tests.api.apitestbase import ApiTestBase
from tests.api.urls import SHARED_LINKS_URL, SHARED_LIBRARIES_URL, \
    BESHARED_LIBRARIES_URL, SHARED_FILES_URL, F_URL, S_F_URL

class SharesApiTest(ApiTestBase):
    def test_create_file_shared_link(self):
        with self.get_tmp_repo() as repo:
            fname, _ = self.create_file(repo)
            fsurl = urljoin(repo.file_url, 'shared-link')
            data = {
                'type': 'f',
                'p': '/' + fname,
            }
            res = self.put(fsurl, data=data, expected=201)
            self.assertRegexpMatches(res.headers['Location'], \
                            r'http(.*)/f/(\w{10,10})/')

            res = self.get(SHARED_LINKS_URL).json()
            self.assertNotEmpty(res)
            for fileshare in res['fileshares']:
                self.assertIsNotNone(fileshare['username'])
                self.assertIsNotNone(fileshare['repo_id'])
                #self.assertIsNotNone(fileshare['ctime'])
                self.assertIsNotNone(fileshare['s_type'])
                self.assertIsNotNone(fileshare['token'])
                self.assertIsNotNone(fileshare['view_cnt'])
                self.assertIsNotNone(fileshare['path'])


class DirSharedItemsTest(BaseTestCase):
    def tearDown(self):
        self.remove_repo()

    def _add_shared_items(self):
        sub_repo_id = seafile_api.create_virtual_repo(self.repo.id,
                                                      self.folder,
                                                      self.repo.name, '',
                                                      self.user.username)
        # A user shares a folder to admin with permission 'rw'.
        seafile_api.share_repo(sub_repo_id, self.user.username,
                               self.admin.username, 'rw')
        # A user shares a folder to group with permission 'rw'.
        seafile_api.set_group_repo(sub_repo_id, self.group.id,
                                   self.user.username, 'rw')

    def test_can_list_all(self):
        self._add_shared_items()
        self.login_as(self.user)

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user,group' % (
            self.repo.id,
            self.folder))

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 2

    def test_can_list_without_share_type_arg(self):
        self._add_shared_items()
        self.login_as(self.user)

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=%s' % (
            self.repo.id,
            self.folder))

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 2

    def test_can_share_folder_to_users(self):
        self.login_as(self.user)

        resp = self.client.put(
            '/api2/repos/%s/dir/shared_items/?p=%s' % (self.repo.id,
                                                       self.folder),
            "share_type=user&username=a@a.com&username=b@b.com",
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 2
        assert json_resp['success'][0]['permission'] == 'r'

    def test_can_share_root_to_groups(self):
        self.login_as(self.user)

        grp1 = self.group
        grp2 = self.create_group(group_name="test-grp2",
                                 username=self.user.username)

        resp = self.client.put(
            '/api2/repos/%s/dir/shared_items/?p=/' % (self.repo.id),
            "share_type=group&group_id=%d&group_id=%d&permission=rw" % (grp1.id, grp2.id),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 2
        assert json_resp['success'][0]['permission'] == 'rw'

    def test_can_share_folder_to_groups(self):
        self.login_as(self.user)

        grp1 = self.group
        grp2 = self.create_group(group_name="test-grp2",
                                 username=self.user.username)

        resp = self.client.put(
            '/api2/repos/%s/dir/shared_items/?p=%s' % (self.repo.id,
                                                       self.folder),
            "share_type=group&group_id=%d&group_id=%d&permission=rw" % (grp1.id, grp2.id),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 2
        assert json_resp['success'][0]['permission'] == 'rw'

    def test_can_modify_user_shared_repo(self):
        self._add_shared_items()
        self.login_as(self.user)

        resp = self.client.post('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user&username=%s' % (
            self.repo.id,
            self.folder,
            self.admin.username), {
                'permission': 'r'
            }
        )
        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user' % (
            self.repo.id,
            self.folder))
        json_resp = json.loads(resp.content)
        assert json_resp[0]['permission'] == 'r'

    def test_can_modify_group_shared_repo(self):
        self._add_shared_items()
        self.login_as(self.user)

        resp = self.client.post('/api2/repos/%s/dir/shared_items/?p=%s&share_type=group&group_id=%d' % (
            self.repo.id,
            self.folder,
            self.group.id), {
                'permission': 'r'
            }
        )
        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=%s&share_type=group' % (
            self.repo.id,
            self.folder))
        json_resp = json.loads(resp.content)
        assert json_resp[0]['permission'] == 'r'

    def test_can_unshare_repo_to_user(self):
        self._add_shared_items()
        self.login_as(self.user)

        resp = self.client.delete('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user&username=%s' % (
            self.repo.id,
            self.folder,
            self.admin.username
        ))
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user' % (
            self.repo.id,
            self.folder))

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0

    def test_can_unshare_repo_to_group(self):
        self._add_shared_items()
        self.login_as(self.user)

        resp = self.client.delete('/api2/repos/%s/dir/shared_items/?p=%s&share_type=group&group_id=%d' % (
            self.repo.id,
            self.folder,
            self.group.id
        ))
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=%s&share_type=group' % (
            self.repo.id,
            self.folder))

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0
