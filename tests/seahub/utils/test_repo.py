from seahub.utils.repo import get_repo_shared_users, get_repo_owner
from seahub.test_utils import BaseTestCase

import seaserv
from seaserv import seafile_api, ccnet_api


class GetRepoOwnerTest(BaseTestCase):
    def test_can_get(self):
        assert get_repo_owner(self.fake_request, self.repo.id) == self.user.username

class GetRepoSharedUsersTest(BaseTestCase):
    def setUp(self):
        self.user2 = self.create_user()
        ccnet_api.group_add_member(self.group.id, self.user.username,
                                   self.user2.username)
        g_members = [x.user_name for x in seaserv.get_group_members(self.group.id)]
        assert self.user2.username in g_members

    def tearDown(self):
        self.remove_user(self.user2.username)
        self.remove_group()

    def test_can_get(self):
        username = self.user.username

        owner = get_repo_owner(self.fake_request, self.repo.id)
        assert owner == username
        assert get_repo_shared_users(self.repo.id, owner) == []

        # user share a repo to admin
        seafile_api.share_repo(self.repo.id, username,
                               self.admin.username, 'rw')
        assert get_repo_shared_users(self.repo.id, owner) == [self.admin.username]

        # user share a repo to group
        seafile_api.set_group_repo(self.repo.id, self.group.id,
                                   username, 'rw')
        assert get_repo_shared_users(self.repo.id, owner) == [self.admin.username, self.user2.username]
