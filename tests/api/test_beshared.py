import json

import seaserv
from seaserv import seafile_api

from seahub.test_utils import BaseTestCase

class BeSharedReposTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def tearDown(self):
        self.remove_repo()

    def _prepare_repo_and_group(self):
        # create repo for user
        sub_repo_id = seafile_api.create_virtual_repo(self.repo.id,
                                                      self.folder,
                                                      self.repo.name, '',
                                                      self.user.username)

        self.sub_repo_id = sub_repo_id

        # create group for admin
        admin_group_id = seaserv.ccnet_threaded_rpc.create_group('admin-group',
                self.admin.email)
        self.admin_group_id = admin_group_id

    def test_can_list_personal_shared_repo(self):
        self._prepare_repo_and_group()

        # A user shares a folder to admin with permission 'rw'.
        seafile_api.share_repo(self.sub_repo_id,
                               self.user.username,
                               self.admin.username,
                               'rw')


        resp = self.client.get('/api2/beshared-repos/')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp[0]['repo_id'] == self.sub_repo_id
        assert json_resp[0]['share_type'] == 'personal'

    def test_can_list_group_repo(self):
        self._prepare_repo_and_group()

        # A user shares a folder to admin group with permission 'rw'.
        seafile_api.set_group_repo(self.sub_repo_id,
                                   self.admin_group_id,
                                   self.user.username,
                                   'rw')


        resp = self.client.get('/api2/beshared-repos/')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp[0]['repo_id'] == self.sub_repo_id
        assert json_resp[0]['share_type'] == 'group'

    def test_can_list_public_repo(self):
        self._prepare_repo_and_group()

        # A user shares a folder to public with permission 'rw'.
        seafile_api.add_inner_pub_repo(self.sub_repo_id, 'rw')

        resp = self.client.get('/api2/beshared-repos/')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        # assert json_resp[0]['repo_id'] == self.sub_repo_id
        # assert json_resp[0]['share_type'] == 'public'
        public_repo_success = False
        for repo_info in json_resp:
            if repo_info['repo_id'] == self.sub_repo_id and \
                    repo_info['share_type'] == 'public':
                public_repo_success = True
        assert public_repo_success
