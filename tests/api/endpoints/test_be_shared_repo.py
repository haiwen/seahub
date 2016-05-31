import json

import seaserv
from seaserv import seafile_api

from seahub.test_utils import BaseTestCase

class BeSharedRepoTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def tearDown(self):
        self.remove_repo()

    def _add_shared_items(self):
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

        # A user shares a folder to admin with permission 'rw'.
        seafile_api.share_repo(sub_repo_id, self.user.username,
                               self.admin.username, 'rw')

        # A user shares a folder to admin group with permission 'rw'.
        seafile_api.set_group_repo(sub_repo_id, admin_group_id,
                                   self.user.username, 'rw')

        # A user shares a folder to public with permission 'rw'.
        seafile_api.add_inner_pub_repo(sub_repo_id, 'rw')

    def test_can_delete_personal_shared_repo(self):
        self._add_shared_items()

        resp = self.client.delete('/api2/beshared-repos/%s/?share_type=personal&from=%s' % (
            self.sub_repo_id,
            self.user.email,
        ))
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

    def test_can_delete_group_repo(self):
        self._add_shared_items()

        resp = self.client.delete('/api2/beshared-repos/%s/?share_type=group&from=%s&group_id=%d' % (
            self.sub_repo_id,
            self.user.email,
            self.admin_group_id,
        ))
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

    def test_can_delete_public_repo(self):
        self._add_shared_items()

        resp = self.client.delete('/api2/beshared-repos/%s/?share_type=public' % (
            self.sub_repo_id,
        ))
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

