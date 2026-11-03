import os
import json
from unittest.mock import patch

from django.urls import reverse

from seaserv import seafile_api, ccnet_api
from seahub.test_utils import BaseTestCase

from seahub.group.utils import is_group_admin
from tests.common.utils import randstring

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False


class RepoTrashTest(BaseTestCase):

    def setUp(self):

        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.repo_id = self.repo.id
        self.repo_name = self.repo.repo_name

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder.rstrip('/'))

        self.url = reverse('api-v2.1-repo-trash', args=[self.repo_id])

        self.tmp_user = self.create_user(
            'user_%s@test.com' % randstring(4), is_staff=False)

    def tearDown(self):
        self.remove_repo()
        self.remove_group()
        self.remove_user(self.tmp_user.username)

    def test_can_get(self):

        # delete a file first
        seafile_api.del_file(self.repo_id, '/',
                             json.dumps([self.file_name]),
                             self.user_name)

        self.login_as(self.user)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['data'][0]['obj_name'] == self.file_name
        assert json_resp['data'][0]['is_dir'] == False

    def test_restore_errors_do_not_expose_exception_details(self):
        self.login_as(self.user)
        commit_id = 'a' * 40
        for url_name in ('api-v2.1-repo-trash-revert-dirents',
                         'api-v2.1-repo-trash2-revert'):
            with self.subTest(url_name=url_name):
                data = ({'path': ['/failed.txt', '/restored.txt'], 'commit_id': commit_id}
                        if url_name.endswith('dirents') else
                        {commit_id: ['/failed.txt', '/restored.txt']})
                with patch('seahub.api2.endpoints.repo_trash.seafile_api.get_dir_id_by_commit_and_path',
                           side_effect=[RuntimeError('private backend details'), 'dir-id']), \
                     patch('seahub.api2.endpoints.repo_trash.seafile_api.revert_dir'), \
                     patch('seahub.api2.endpoints.repo_trash.logger.exception') as log_exception:
                    url = reverse(url_name, args=[self.repo_id])
                    if url_name.endswith('dirents'):
                        response = self.client.post(url, data)
                    else:
                        response = self.client.post(
                            url, json.dumps(data), content_type='application/json')

                self.assertEqual(response.status_code, 200)
                result = json.loads(response.content)
                self.assertEqual(result['failed'][0]['path'], '/failed.txt')
                self.assertEqual(result['failed'][0]['error_msg'], 'Internal Server Error')
                self.assertEqual(result['success'], [{'path': '/restored.txt', 'is_dir': True}])
                self.assertNotIn('private backend details', response.content.decode())
                log_exception.assert_called_once()

    def test_restore_requires_write_permission(self):
        self.login_as(self.admin)
        for url_name in ('api-v2.1-repo-trash-revert-dirents',
                         'api-v2.1-repo-trash2-revert'):
            with self.subTest(url_name=url_name):
                with patch('seahub.api2.endpoints.repo_trash.seafile_api.revert_dir') as revert_dir:
                    response = self.client.post(
                        reverse(url_name, args=[self.repo_id]),
                        {'path': ['/file.txt'], 'commit_id': 'a' * 40})
                self.assertEqual(response.status_code, 403)
                revert_dir.assert_not_called()

    def test_can_not_get_with_invalid_repo_permission(self):

        self.login_as(self.admin)

        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_can_not_get_with_invalid_path_parameter(self):

        invalid_path = randstring(6)

        self.login_as(self.admin)

        resp = self.client.get(self.url + '?path=%s' % invalid_path)
        self.assertEqual(404, resp.status_code)

    def test_can_clean_library_trash(self):

        # delete a file first
        seafile_api.del_file(self.repo_id, '/',
                             json.dumps([self.file_name]),
                             self.user_name)

        self.login_as(self.user)

        # get trash item count
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['data']) > 0

        # clean library trash
        resp = self.client.delete(self.url)
        self.assertEqual(200, resp.status_code)

        # get trash item count again
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['data']) == 0

    def test_can_clean_department_repo_trash(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        # create a department
        group_id = ccnet_api.create_group('department_test', 'system admin', parent_group_id=-1)
        seafile_api.set_group_quota(group_id, -2)
        repo_id = seafile_api.add_group_owned_repo(group_id, 'dep_test', 'rw')
        repo_owner = seafile_api.get_repo_owner(repo_id)
        assert '@seafile_group' in repo_owner
        group_repos = seafile_api.get_repos_by_group(group_id)
        assert len(group_repos) == 1
        group = ccnet_api.get_group(group_id)

        # department add user
        ccnet_api.group_add_member(group_id, group.creator_name, self.user_name)
        ccnet_api.group_add_member(group_id, group.creator_name, self.tmp_user.username)
        ccnet_api.group_set_admin(group_id, self.user_name)
        ccnet_api.group_unset_admin(group_id, self.tmp_user.username)
        assert is_group_admin(group_id, self.user_name)
        assert not is_group_admin(group_id, self.tmp_user.username)

        file_name = 'dep_test.txt'
        self.create_file(
            repo_id=repo_id, parent_dir='/', filename=file_name, username=self.user_name)

        # delete a file first
        seafile_api.del_file(repo_id, '/',
                             json.dumps([file_name]),
                             self.user_name)

        # get trash item count
        self.login_as(self.user)
        resp = self.client.get(reverse('api-v2.1-repo-trash', args=[repo_id]))
        json_resp = json.loads(resp.content)
        assert len(json_resp['data']) > 0

        # department member can not clean trash
        self.logout()
        self.login_as(self.tmp_user)
        resp = self.client.delete(self.url)
        self.assertEqual(403, resp.status_code)

        # department admin can clean library trash
        self.logout()
        self.login_as(self.user)
        ccnet_api.group_set_admin(group_id, self.user_name)
        resp = self.client.delete(self.url)
        self.assertEqual(200, resp.status_code)

        # get trash item count again
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['data']) == 0

    def test_can_not_clean_with_invalid_user_permission(self):

        self.login_as(self.admin)
        resp = self.client.delete(self.url)
        self.assertEqual(403, resp.status_code)
