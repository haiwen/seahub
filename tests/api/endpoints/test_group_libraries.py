import json
import pytest

from django.urls import reverse

from seaserv import seafile_api, ccnet_api

from tests.common.utils import randstring

from seahub.test_utils import BaseTestCase, TRAVIS
from seahub.share.models import ExtraGroupsSharePermission
from seahub.constants import (
    PERMISSION_ADMIN, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT)


class GroupLibrariesTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.repo_name = self.repo.name
        self.group_id = self.group.id
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.group_libraries_url = reverse('api-v2.1-group-libraries', args=[self.group.id])

    def tearDown(self):
        self.remove_group()
        self.remove_repo()

    def test_can_get(self):

        # share repo to group
        seafile_api.set_group_repo(self.repo_id,
                self.group_id, self.user_name, 'rw')
        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 1

        self.login_as(self.user)

        resp = self.client.get(self.group_libraries_url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp[0]['repo_name'] == self.repo_name
        assert json_resp[0]['repo_id'] == self.repo_id

    def test_get_with_login_user_is_not_group_member(self):

        self.login_as(self.admin)

        resp = self.client.get(self.group_libraries_url)
        self.assertEqual(403, resp.status_code)

    def test_get_with_login_user_is_group_member(self):

        ccnet_api.group_add_member(self.group_id, self.user_name, self.admin_name)

        self.login_as(self.admin)

        resp = self.client.get(self.group_libraries_url)
        self.assertEqual(200, resp.status_code)

    def test_can_create(self):

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 0

        self.login_as(self.user)

        repo_name = randstring(6)
        resp = self.client.post(self.group_libraries_url, {
            'repo_name': repo_name
        })
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['repo_name'] == repo_name

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 1

    @pytest.mark.skipif(TRAVIS, reason="pro only")
    def test_can_create_with_perms(self):
        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 0

        self.login_as(self.user)

        for perm in [PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT]:
            repo_name = randstring(6)
            resp = self.client.post(self.group_libraries_url, {
                'repo_name': repo_name,
                'permission': perm
            })
            self.assertEqual(200, resp.status_code)

            json_resp = json.loads(resp.content)
            assert json_resp['repo_name'] == repo_name
            assert json_resp['permission'] == perm

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 2

    def test_create_with_login_user_is_not_group_member(self):

        self.login_as(self.admin)

        repo_name = randstring(6)
        resp = self.client.post(self.group_libraries_url, {
            'repo_name': repo_name
        })
        self.assertEqual(403, resp.status_code)

    def test_create_with_login_user_is_group_member(self):

        ccnet_api.group_add_member(self.group_id, self.user_name, self.admin_name)

        self.login_as(self.admin)

        repo_name = randstring(6)
        resp = self.client.post(self.group_libraries_url, {
            'repo_name': repo_name
        })

        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['repo_name'] == repo_name

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 1


class GroupLibraryTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.repo_name = self.repo.name
        self.group_id = self.group.id
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.group_library_url = reverse('api-v2.1-group-library',
                args=[self.group_id, self.repo_id])

        seafile_api.set_group_repo(self.repo_id,
                self.group_id, self.user_name, 'rw')

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 1

    def tearDown(self):
        self.remove_group()
        self.remove_repo()

    def test_can_delete(self):

        self.login_as(self.user)

        resp = self.client.delete(self.group_library_url)
        self.assertEqual(200, resp.status_code)

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 0

    def test_delete_with_login_user_is_not_group_member(self):

        self.login_as(self.admin)
        resp = self.client.delete(self.group_library_url)
        self.assertEqual(403, resp.status_code)

    def test_delete_with_login_user_is_group_member(self):

        ccnet_api.group_add_member(self.group_id, self.user_name, self.admin_name)

        self.login_as(self.admin)
        resp = self.client.delete(self.group_library_url)
        self.assertEqual(403, resp.status_code)

    def test_delete_if_login_user_is_repo_owner(self):

        self.login_as(self.admin)

        # admin user can not delete
        resp = self.client.delete(self.group_library_url)
        self.assertEqual(403, resp.status_code)

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 1

        # add admin user to group
        ccnet_api.group_add_member(self.group_id, self.user_name, self.admin_name)

        # transfer repo to admin user
        library_url = reverse('api-v2.1-admin-library', args=[self.repo_id])
        data = 'owner=%s' % self.admin_name
        resp = self.client.put(library_url, data, 'application/x-www-form-urlencoded')

        # admin user can delete
        resp = self.client.delete(self.group_library_url)
        self.assertEqual(200, resp.status_code)

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 0

    def test_delete_if_login_user_is_group_staff(self):

        self.login_as(self.admin)

        # admin user can not delete
        resp = self.client.delete(self.group_library_url)
        self.assertEqual(403, resp.status_code)

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 1

        # set admin user as group staff
        ccnet_api.group_add_member(self.group_id, self.user_name, self.admin_name)
        ccnet_api.group_set_admin(self.group_id, self.admin_name)

        # admin user can delete
        resp = self.client.delete(self.group_library_url)
        self.assertEqual(200, resp.status_code)

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 0

    def test_delete_if_login_user_is_group_repo_admin(self):

        self.login_as(self.admin)

        # commont user can not delete
        resp = self.client.delete(self.group_library_url)
        self.assertEqual(403, resp.status_code)

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 1

        # share library to group with `admin` permission
        ccnet_api.group_add_member(self.group_id, self.user_name, self.admin_name)
        ExtraGroupsSharePermission.objects.create_share_permission(
                self.repo_id, self.group_id, PERMISSION_ADMIN)

        # repo admin user(not group admin) can not delete
        resp = self.client.delete(self.group_library_url)
        self.assertEqual(403, resp.status_code)

        # repo admin user(also is group admin) can delete
        ccnet_api.group_set_admin(self.group_id, self.admin_name)
        resp = self.client.delete(self.group_library_url)
        self.assertEqual(200, resp.status_code)

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 0
