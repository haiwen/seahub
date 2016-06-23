import json

from django.core.urlresolvers import reverse

import seaserv
from seaserv import seafile_api

from seahub.test_utils import BaseTestCase

class SharedReposTest(BaseTestCase):

    def share_repo_to_user(self):
        seafile_api.share_repo(
                self.repo.id, self.user.username,
                self.admin.username, 'rw')

    def share_repo_to_group(self):
        seafile_api.set_group_repo(
                self.repo.id, self.group.id,
                self.user.username, 'rw')

    def share_repo_to_public(self):
        seafile_api.add_inner_pub_repo(
                self.repo.id, 'rw')

    def setUp(self):
        self.repo_id = self.repo.id
        self.group_id = self.group.id
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.url = reverse('api-v2.1-shared-repos')

    def tearDown(self):
        self.remove_repo()

    def test_can_get(self):
        self.share_repo_to_user()
        self.share_repo_to_group()
        self.share_repo_to_public()

        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp[0]['share_type'] == 'personal'
        assert json_resp[1]['share_type'] == 'group'
        assert json_resp[2]['share_type'] == 'public'

    def test_get_with_invalid_repo_permission(self):
        self.share_repo_to_user()
        self.share_repo_to_group()
        self.share_repo_to_public()

        # login with admin, then get user's share repo info
        self.login_as(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0

    def test_can_update_user_share_perm(self):
        self.share_repo_to_user()

        assert seafile_api.check_permission_by_path(
                self.repo_id, '/', self.admin_name) == 'rw'

        self.login_as(self.user)

        url = reverse('api-v2.1-shared-repo', args=[self.repo_id])
        data = 'permission=r&share_type=personal&user=%s' % self.admin_name
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)
        assert seafile_api.check_permission_by_path(
                self.repo_id, '/', self.admin_name) == 'r'

    def test_can_update_group_share_perm(self):
        self.share_repo_to_group()

#        print seafile_api.get_folder_group_perm(self.repo_id, '/', int(self.group_id))

        repos = seafile_api.get_group_repos_by_owner(self.user_name)
        assert repos[0].permission == 'rw'

        self.login_as(self.user)

        url = reverse('api-v2.1-shared-repo', args=[self.repo_id])
        data = 'permission=r&share_type=group&group_id=%s' % self.group_id
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        repos = seafile_api.get_group_repos_by_owner(self.user_name)
        assert repos[0].permission == 'r'

    def test_can_update_public_share_perm(self):
        for r in seaserv.seafserv_threaded_rpc.list_inner_pub_repos():
            seafile_api.remove_inner_pub_repo(r.repo_id)

        self.share_repo_to_public()

        repos = seaserv.seafserv_threaded_rpc.list_inner_pub_repos_by_owner(
                self.user_name)
        assert repos[0].permission == 'rw'

        self.login_as(self.user)

        url = reverse('api-v2.1-shared-repo', args=[self.repo_id])
        data = 'permission=r&share_type=public'
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        repos = seaserv.seafserv_threaded_rpc.list_inner_pub_repos_by_owner(
                self.user_name)
        assert repos[0].permission == 'r'

    def test_delete_user_share(self):
        self.share_repo_to_user()

        # admin user can view repo
        assert seafile_api.check_permission_by_path(
                self.repo_id, '/', self.admin_name) == 'rw'

        self.login_as(self.user)

        args = '?share_type=personal&user=%s' % self.admin_name
        url = reverse('api-v2.1-shared-repo', args=[self.repo_id]) + args
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        # admin user can NOT view repo
        assert seafile_api.check_permission_by_path(
                self.repo_id, '/', self.admin_name) == None

    def test_delete_group_share(self):
        self.share_repo_to_group()

        # repo in group
        repos = seafile_api.get_group_repos_by_owner(self.user_name)
        assert repos[0].permission == 'rw'

        self.login_as(self.user)

        args = '?share_type=group&group_id=%s' % self.group_id
        url = reverse('api-v2.1-shared-repo', args=[self.repo_id]) + args
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        # repo NOT in group
        repos = seafile_api.get_group_repos_by_owner(self.user_name)
        assert len(repos) == 0

    def test_delete_public_share(self):
        for r in seaserv.seafserv_threaded_rpc.list_inner_pub_repos():
            seafile_api.remove_inner_pub_repo(r.repo_id)

        self.share_repo_to_public()

        # repo in public
        repos = seaserv.seafserv_threaded_rpc.list_inner_pub_repos_by_owner(
                self.user_name)
        assert repos[0].permission == 'rw'

        self.login_as(self.user)

        args = '?share_type=public'
        url = reverse('api-v2.1-shared-repo', args=[self.repo_id]) + args
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        # repo NOT in public
        repos = seaserv.seafserv_threaded_rpc.list_inner_pub_repos_by_owner(
                self.user_name)
        assert len(repos) == 0

    def test_update_perm_if_not_owner(self):
        self.share_repo_to_user()

        # admin can view repo but NOT owner
        assert seafile_api.check_permission_by_path(
                self.repo_id, '/', self.admin_name) == 'rw'

        self.login_as(self.admin)

        url = reverse('api-v2.1-shared-repo', args=[self.repo_id])
        data = 'permission=r&share_type=personal'
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(403, resp.status_code)

    def test_delete_perm_if_not_owner(self):
        self.share_repo_to_user()

        # admin can view repo but NOT owner
        assert seafile_api.check_permission_by_path(
                self.repo_id, '/', self.admin_name) == 'rw'

        self.login_as(self.admin)

        args = '?share_type=personal&user=%s' % self.admin_name
        url = reverse('api-v2.1-shared-repo', args=[self.repo_id]) + args
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')

        self.assertEqual(403, resp.status_code)
