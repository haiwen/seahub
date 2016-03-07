import json

from seaserv import seafile_api

from tests.common.utils import randstring

from seahub.test_utils import BaseTestCase

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

    def test_list_without_repo_permission(self):
        self._add_shared_items()
        self.login_as(self.admin)

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user,group' % (
            self.repo.id,
            self.folder))

        self.assertEqual(403, resp.status_code)

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
            "share_type=user&username=%s" % self.admin.email,
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 1
        assert json_resp['success'][0]['permission'] == 'r'

    def test_share_folder_to_invalid_email(self):
        self.login_as(self.user)
        invalid_email = '%s' % randstring(6)

        resp = self.client.put(
            '/api2/repos/%s/dir/shared_items/?p=%s' % (self.repo.id,
                                                       self.folder),
            "share_type=user&username=%s" % invalid_email,
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['failed']) == 1
        assert invalid_email in json_resp['failed'][0]['email']

    def test_share_folder_to_unregistered_user(self):
        self.login_as(self.user)
        unregistered_user = '%s@%s.com' % (randstring(6), randstring(6))

        resp = self.client.put(
            '/api2/repos/%s/dir/shared_items/?p=%s' % (self.repo.id,
                                                       self.folder),
            "share_type=user&username=%s" % unregistered_user,
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['failed']) == 1
        assert unregistered_user in json_resp['failed'][0]['email']

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

    def test_modify_shared_repo_with_unregistered_user(self):
        self._add_shared_items()
        self.login_as(self.user)

        unregistered_user = '%s@%s.com' % (randstring(6), randstring(6))

        resp = self.client.post('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user&username=%s' % (
            self.repo.id,
            self.folder,
            unregistered_user), {
                'permission': 'r'
            }
        )
        self.assertEqual(400, resp.status_code)

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

    def test_unshare_repo_with_unregistered_user(self):
        self._add_shared_items()
        self.login_as(self.user)

        unregistered_user = '%s@%s.com' % (randstring(6), randstring(6))

        resp = self.client.delete('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user&username=%s' % (
            self.repo.id,
            self.folder,
            unregistered_user
        ))
        self.assertEqual(400, resp.status_code)

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
