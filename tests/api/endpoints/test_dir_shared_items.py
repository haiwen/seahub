import json

from seaserv import seafile_api

from tests.common.utils import randstring

from seahub.test_utils import BaseTestCase

class DirSharedItemsTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.repo_id = self.repo.id
        self.folder_path = self.folder

        self.group_id = self.group.id

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def share_repo_to_user_and_group(self):

        # share repo to user
        seafile_api.share_repo(self.repo_id,
                self.user_name, self.admin_name, 'rw')

        # share repo to group
        seafile_api.set_group_repo(self.repo_id,
                self.group_id, self.user_name, 'rw')

    def share_folder_to_user_and_group(self):

        # share folder to user
        seafile_api.share_subdir_to_user(self.repo_id,
                self.folder_path, self.user_name, self.admin_name, 'rw')

        # share folder to group
        seafile_api.share_subdir_to_group(self.repo_id,
                self.folder_path, self.user_name, self.group_id, 'rw')

    # test get request
    def test_can_list_repo_share_info(self):

        self.share_repo_to_user_and_group()

        self.login_as(self.user)

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=/&share_type=user,group' % self.repo_id)

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 2

    def test_can_list_folder_share_info(self):

        self.share_folder_to_user_and_group()

        self.login_as(self.user)

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user,group' % (
            self.repo_id, self.folder))

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 2

    def test_list_with_invalid_user_permission(self):

        self.share_folder_to_user_and_group()

        self.login_as(self.admin)

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user,group' % (
            self.repo_id, self.folder))

        self.assertEqual(403, resp.status_code)

    def test_list_without_share_type_arg(self):

        self.share_folder_to_user_and_group()

        self.login_as(self.user)

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=%s' % (
            self.repo_id, self.folder))

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 2

    # test put request
    def test_can_share_repo_to_users(self):
        self.login_as(self.user)

        resp = self.client.put(
            '/api2/repos/%s/dir/shared_items/?p=/' % self.repo_id,
            "share_type=user&username=%s" % self.admin.email,
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 1
        assert json_resp['success'][0]['permission'] == 'r'

        # test share failed when share the same item to the same user
        resp = self.client.put(
            '/api2/repos/%s/dir/shared_items/?p=/' % self.repo_id,
            "share_type=user&username=%s" % self.admin.email,
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'has been shared to' in json_resp['failed'][0]['error_msg']

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

        # test share failed when share the same item to the same user
        resp = self.client.put(
            '/api2/repos/%s/dir/shared_items/?p=%s' % (self.repo.id,
                                                       self.folder),
            "share_type=user&username=%s" % self.admin.email,
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'has been shared to' in json_resp['failed'][0]['error_msg']

    def test_can_share_repo_to_groups(self):
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

        # test share failed when share the same item to the same group
        resp = self.client.put(
            '/api2/repos/%s/dir/shared_items/?p=/' % (self.repo.id),
            "share_type=group&group_id=%d&group_id=%d&permission=rw" % (grp1.id, grp2.id),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'has been shared to' in json_resp['failed'][0]['error_msg']

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

        # test share failed when share the same item to the same group
        resp = self.client.put(
            '/api2/repos/%s/dir/shared_items/?p=%s' % (self.repo.id,
                                                       self.folder),
            "share_type=group&group_id=%d&group_id=%d&permission=rw" % (grp1.id, grp2.id),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'has been shared to' in json_resp['failed'][0]['error_msg']

    def test_share_with_invalid_email(self):
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

    def test_share_with_unregistered_user(self):
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

    def test_share_with_invalid_ownership(self):

        self.share_repo_to_user_and_group()

        # admin can visit user sub-folder with 'rw' permission
        assert seafile_api.check_permission_by_path(self.repo.id,
                '/', self.admin.username) == 'rw'

        self.login_as(self.admin)

        resp = self.client.put(
            '/api2/repos/%s/dir/shared_items/?p=/' % self.repo.id,
            "share_type=user&username=%s" % self.admin.username,
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(403, resp.status_code)

    # test post request
    def test_can_modify_user_repo_share_perm(self):
        self.share_repo_to_user_and_group()
        self.login_as(self.user)

        resp = self.client.post('/api2/repos/%s/dir/shared_items/?p=/&share_type=user&username=%s' % (
            self.repo.id,
            self.admin.username), {
                'permission': 'r'
            }
        )
        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=/&share_type=user' % self.repo_id)
        json_resp = json.loads(resp.content)
        assert json_resp[0]['permission'] == 'r'

    def test_can_modify_user_folder_share_perm(self):
        self.share_folder_to_user_and_group()
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

    def test_can_modify_group_repo_share_perm(self):
        self.share_repo_to_user_and_group()
        self.login_as(self.user)

        resp = self.client.post('/api2/repos/%s/dir/shared_items/?p=/&share_type=group&group_id=%d' % (
            self.repo.id,
            self.group.id), {
                'permission': 'r'
            }
        )
        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=/&share_type=group' % self.repo_id)
        json_resp = json.loads(resp.content)
        assert json_resp[0]['permission'] == 'r'

    def test_can_modify_group_folder_share_perm(self):
        self.share_folder_to_user_and_group()
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

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=%s&share_type=group' %
                (self.repo_id, self.folder))
        json_resp = json.loads(resp.content)
        assert json_resp[0]['permission'] == 'r'

    def test_modify_with_invalid_email(self):
        self.share_folder_to_user_and_group()
        self.login_as(self.user)

        invalid_email = '%s' % randstring(6)

        resp = self.client.post('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user&username=%s' % (
            self.repo.id,
            self.folder,
            invalid_email), {
                'permission': 'r'
            }
        )
        self.assertEqual(400, resp.status_code)

    def test_modify_with_unregistered_user(self):
        self.share_folder_to_user_and_group()
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

    def test_modify_with_invalid_ownership(self):

        self.share_repo_to_user_and_group()

        # admin can visit user sub-folder with 'rw' permission
        assert seafile_api.check_permission_by_path(self.repo.id,
                '/', self.admin.username) == 'rw'

        self.login_as(self.admin)

        resp = self.client.post('/api2/repos/%s/dir/shared_items/?p=/&share_type=user&username=%s' % (
            self.repo.id,
            self.admin.username), {
                'permission': 'r'
            }
        )
        self.assertEqual(403, resp.status_code)

    # test delete request
    def test_can_unshare_repo_to_user(self):
        self.share_repo_to_user_and_group()
        self.login_as(self.user)

        resp = self.client.delete('/api2/repos/%s/dir/shared_items/?p=/&share_type=user&username=%s' % (
            self.repo.id, self.admin.username))
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=/&share_type=user' % self.repo_id)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0

    def test_can_unshare_folder_to_user(self):
        self.share_folder_to_user_and_group()
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
        self.share_repo_to_user_and_group()
        self.login_as(self.user)

        resp = self.client.delete('/api2/repos/%s/dir/shared_items/?p=/&share_type=group&group_id=%d' % (
            self.repo.id,
            self.group.id
        ))
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

        resp = self.client.get('/api2/repos/%s/dir/shared_items/?p=/&share_type=group' % self.repo.id)

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0

    def test_can_unshare_folder_to_group(self):
        self.share_folder_to_user_and_group()
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
            self.repo.id, self.folder))

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0

    def test_unshare_with_invalid_email(self):
        self.share_folder_to_user_and_group()
        self.login_as(self.user)
        invalid_email = '%s' % randstring(6)

        resp = self.client.delete('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user&username=%s' % (
            self.repo.id,
            self.folder,
            invalid_email
        ))
        self.assertEqual(400, resp.status_code)

    def test_unshare_with_unregistered_user(self):
        self.share_folder_to_user_and_group()
        self.login_as(self.user)

        unregistered_user = '%s@%s.com' % (randstring(6), randstring(6))

        resp = self.client.delete('/api2/repos/%s/dir/shared_items/?p=%s&share_type=user&username=%s' % (
            self.repo.id,
            self.folder,
            unregistered_user
        ))
        self.assertEqual(200, resp.status_code)

    def test_unshare_with_invalid_ownership(self):

        self.share_repo_to_user_and_group()

        # admin can visit user sub-folder with 'rw' permission
        assert seafile_api.check_permission_by_path(self.repo.id,
                '/', self.admin.username) == 'rw'

        self.login_as(self.admin)

        resp = self.client.delete('/api2/repos/%s/dir/shared_items/?p=/&share_type=user&username=%s' % (
            self.repo.id,
            self.admin.username
        ))
        self.assertEqual(403, resp.status_code)
