from seahub.share.models import ExtraGroupsSharePermission
from seahub.test_utils import BaseTestCase

from seaserv import seafile_api

class ExtraGroupsSharePermissionTest(BaseTestCase):
    def test_can_add(self):
        ExtraGroupsSharePermission.objects.create_share_permission(self.repo.id, 
                                                                   self.group.id, 
                                                                   'admin')
        self.assertEqual(1, len(ExtraGroupsSharePermission.objects.all()))

    def test_can_get_admin_groups_by_repo(self):
        res = ExtraGroupsSharePermission.objects.get_admin_groups_by_repo(self.repo.id)
        assert len(res) == 0
        ExtraGroupsSharePermission.objects.create_share_permission(self.repo.id, 
                                                                   self.group.id, 
                                                                   'admin')
        res = ExtraGroupsSharePermission.objects.get_admin_groups_by_repo(self.repo.id)
        assert res[0] == self.group.id

    def test_can_get_repos_with_admin_permission(self):
        res = ExtraGroupsSharePermission.objects.get_repos_with_admin_permission(self.group.id)
        assert len(res) == 0
        ExtraGroupsSharePermission.objects.create_share_permission(self.repo.id, 
                                                                   self.group.id, 
                                                                   'admin')
        res = ExtraGroupsSharePermission.objects.get_repos_with_admin_permission(self.group.id)
        assert res[0] == self.repo.id

    def test_can_delete(self):
        self.assertEqual(0, len(ExtraGroupsSharePermission.objects.all()))
        ExtraGroupsSharePermission.objects.create_share_permission(self.repo.id, 
                                                                   self.group.id, 
                                                                   'admin')
        self.assertEqual(1, len(ExtraGroupsSharePermission.objects.all()))
        ExtraGroupsSharePermission.objects.delete_share_permission(self.repo.id, 
                                                          self.group.id)
        self.assertEqual(0, len(ExtraGroupsSharePermission.objects.all()))

    def test_can_update(self):
        self.assertEqual(0, len(ExtraGroupsSharePermission.objects.all()))
        ExtraGroupsSharePermission.objects.update_share_permission(self.repo.id,
                                                                   self.group.id,
                                                                   'admin')
        self.assertEqual(1, len(ExtraGroupsSharePermission.objects.all()))

    def test_batch_get_repos_with_admin_permission(self):
        r = seafile_api.get_repo(self.create_repo(name='repo2',
            desc='', username=self.user.email, passwd=None))
        new_group = self.create_group(group_name='test_group',
                                       username=self.user.username)
        data = [self.group.id, new_group.id]
        self.assertEqual([], ExtraGroupsSharePermission.objects.batch_get_repos_with_admin_permission(data))
        ExtraGroupsSharePermission.objects.create_share_permission(self.repo.id, 
                                                                   self.group.id, 
                                                                   'admin')
        ExtraGroupsSharePermission.objects.create_share_permission(self.repo.id, 
                                                                   new_group.id, 
                                                                   'admin')
        res = ExtraGroupsSharePermission.objects.batch_get_repos_with_admin_permission(data)
        assert (self.repo.id, self.group.id) in res
        assert (self.repo.id, new_group.id) in res
