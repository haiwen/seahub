import json
import pytest

from django.urls import reverse

import seaserv
from seaserv import seafile_api

from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase, TRAVIS
from tests.common.utils import randstring
from mock import patch, MagicMock


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

        # make sure this user has not sharing any repos
        for x in seafile_api.get_share_out_repo_list(self.user_name, -1, -1):
            seafile_api.remove_share(x.repo_id, self.user_name, x.user)
        assert len(seafile_api.get_share_out_repo_list(self.user_name, -1, -1)) == 0

        for x in seafile_api.get_group_repos_by_owner(self.user_name):
            seafile_api.unset_group_repo(x.repo_id, x.group_id, self.user_name)
        assert len(seafile_api.get_group_repos_by_user(self.user_name)) == 0

    def tearDown(self):
        seafile_api.remove_share(self.repo_id, self.user_name, self.admin_name)
        seafile_api.unset_group_repo(self.repo_id, self.group_id, self.user_name)
        seafile_api.remove_inner_pub_repo(self.repo_id)

        self.remove_repo()

    def test_can_get_when_share_to_user(self):
        self.share_repo_to_user()

        contact_email = '%s@%s.com' % (randstring(6), randstring(6))
        nickname = randstring(6)
        p = Profile.objects.add_or_update(self.admin_name, nickname=nickname)
        p.contact_email = contact_email
        p.save()

        self.login_as(self.user)
        resp = self.client.get(self.url + '?share_type=personal')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert 'personal' in [x['share_type'] for x in json_resp]
        for r in json_resp:
            if r['share_type'] != 'personal':
                continue

            assert r['repo_id'] == self.repo_id
            assert r['user_email'] == self.admin_name
            assert r['user_name'] == nickname
            assert r['contact_email'] == contact_email
            assert len(r['modifier_email']) > 0
            assert len(r['modifier_name']) > 0
            assert len(r['modifier_contact_email']) > 0

    def test_can_get_when_share_to_group(self):
        self.share_repo_to_group()

        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert 'group' in [x['share_type'] for x in json_resp]
        for r in json_resp:
            if r['share_type'] != 'group':
                continue

            assert r['repo_id'] == self.repo_id
            assert r['group_id'] == self.group_id

    @pytest.mark.skipif(TRAVIS, reason="") # pylint: disable=E1101
    def test_can_get_when_share_to_org_group(self):
        self.share_org_repo_to_org_group_with_rw_permission()

        self.login_as(self.org_user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 1

        assert json_resp[0]['share_type'] == 'group'
        assert json_resp[0]['repo_id'] == self.org_repo.id
        assert json_resp[0]['group_id'] == self.org_group.id

    def test_can_get_when_share_to_public(self):
        self.share_repo_to_public()

        self.login_as(self.user)
        resp = self.client.get(self.url + '?share_type=public')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert 'public' in [x['share_type'] for x in json_resp]

    def test_get_with_invalid_repo_permission(self):

        user_shared_repos = \
                seafile_api.get_share_out_repo_list(self.admin_name, -1, -1)
        for repo in user_shared_repos:
            seafile_api.remove_share(repo.repo_id, self.admin_name, repo.user)

        group_shared_repos = seafile_api.get_group_repos_by_owner(self.admin_name)
        for repo in group_shared_repos:
            seafile_api.unset_group_repo(repo.repo_id, repo.group_id, self.admin_name)

        public_shared_repos = seafile_api.list_inner_pub_repos_by_owner(self.admin_name)
        for repo in public_shared_repos:
            seafile_api.remove_inner_pub_repo(repo.repo_id)

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

    @pytest.mark.skipif(TRAVIS, reason="") # pylint: disable=E1101
    def test_can_update_org_user_share_perm(self):
        self.share_org_repo_to_org_admin_with_rw_permission()

        assert seafile_api.check_permission_by_path(
                self.org_repo.id, '/', self.org_admin.username) == 'rw'

        self.login_as(self.org_user)

        url = reverse('api-v2.1-shared-repo', args=[self.org_repo.id])
        data = 'permission=r&share_type=personal&user=%s' % self.org_admin.username
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)
        assert seafile_api.check_permission_by_path(
                self.org_repo.id, '/', self.org_admin.username) == 'r'

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

    @pytest.mark.skipif(TRAVIS, reason="") # pylint: disable=E1101
    def test_can_update_org_group_share_perm(self):
        self.share_org_repo_to_org_group_with_rw_permission()

#        print seafile_api.get_folder_group_perm(self.repo_id, '/', int(self.group_id))

        repos = seafile_api.get_org_group_repos_by_owner(self.org.org_id, self.org_user.username)
        target_repo = [repo for repo in repos if repo.repo_id == self.org_repo.id]
        assert target_repo[0].permission == 'rw'

        self.login_as(self.org_user)

        url = reverse('api-v2.1-shared-repo', args=[self.org_repo.id])
        data = 'permission=r&share_type=group&group_id=%s' % self.org_group.id
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        repos = seafile_api.get_org_group_repos_by_owner(self.org.org_id, self.org_user.username)
        target_repo = [repo for repo in repos if repo.repo_id == self.org_repo.id]
        assert target_repo[0].permission == 'r'

    @patch('seahub.base.accounts.UserPermissions.can_add_public_repo', MagicMock(return_value=True))
    def test_can_update_public_share_perm(self):
        for r in seaserv.seafserv_threaded_rpc.list_inner_pub_repos():
            seafile_api.remove_inner_pub_repo(r.repo_id)

        self.share_repo_to_public()

        repos = seafile_api.list_inner_pub_repos_by_owner(self.user_name)
        assert repos[0].permission == 'rw'

        self.login_as(self.user)
        assert self.user.permissions.can_add_public_repo() is True

        url = reverse('api-v2.1-shared-repo', args=[self.repo_id])
        data = 'permission=r&share_type=public'
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        repos = seafile_api.list_inner_pub_repos_by_owner(self.user_name)
        assert repos[0].permission == 'r'

    def test_can_not_update_public_share_perm_when_add_public_repo_disabled(self):
        self.login_as(self.user)
        assert self.user.permissions.can_add_public_repo() is False

        url = reverse('api-v2.1-shared-repo', args=[self.repo_id])
        data = 'permission=r&share_type=public'
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

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

    @pytest.mark.skipif(TRAVIS, reason="") # pylint: disable=E1101
    def test_delete_org_user_share(self):
        self.share_org_repo_to_org_admin_with_rw_permission()

        # admin user can view repo
        assert seafile_api.check_permission_by_path(
                self.org_repo.id, '/', self.org_admin.username) == 'rw'

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

    @pytest.mark.skipif(TRAVIS, reason="") # pylint: disable=E1101
    def test_delete_org_group_share(self):
        self.share_org_repo_to_org_group_with_rw_permission()

        repos = seafile_api.get_org_group_repos_by_owner(self.org.org_id, self.org_user.username)
        target_repo = [repo for repo in repos if repo.repo_id == self.org_repo.id]
        assert target_repo[0].permission == 'rw'

        self.login_as(self.org_user)

        args = '?share_type=group&group_id=%s' % self.org_group.id
        url = reverse('api-v2.1-shared-repo', args=[self.org_repo.id]) + args
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        repos = seafile_api.get_org_group_repos_by_owner(self.org.org_id, self.org_user.username)
        target_repo = [repo for repo in repos if repo.repo_id == self.org_repo.id]
        assert len(target_repo) == 0

    def test_delete_public_share(self):
        for r in seaserv.seafserv_threaded_rpc.list_inner_pub_repos():
            seafile_api.remove_inner_pub_repo(r.repo_id)

        self.share_repo_to_public()

        # repo in public
        repos = seafile_api.list_inner_pub_repos_by_owner(
                self.user_name)
        assert repos[0].permission == 'rw'

        self.login_as(self.user)

        args = '?share_type=public'
        url = reverse('api-v2.1-shared-repo', args=[self.repo_id]) + args
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        # repo NOT in public
        repos = seafile_api.list_inner_pub_repos_by_owner(
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

    def test_admin_delete_perm(self):
        self.share_repo_to_user()

        # admin can view repo but NOT owner
        assert seafile_api.check_permission_by_path(
                self.repo_id, '/', self.admin_name) == 'rw'

        self.login_as(self.admin)

        args = '?share_type=personal&user=%s' % self.admin_name
        url = reverse('api-v2.1-shared-repo', args=[self.repo_id]) + args
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)
