from seahub.share.models import ExtraGroupsSharePermission
from seahub.test_utils import BaseTestCase

from seaserv import seafile_api


class ExtraGroupsSharePermissionTest(BaseTestCase):
    def test_can_add(self):
        ExtraGroupsSharePermission.objects.create_share_permission(self.repo.id, 
                                                                   self.group.id, 
                                                                   'admin')
        self.assertEqual(1, len(ExtraGroupsSharePermission.objects.all()))

    def test_can_get_admin_groups(self):
        res = ExtraGroupsSharePermission.objects.get_admin_groups(self.repo.id)
        assert len(res) == 0
        ExtraGroupsSharePermission.objects.create_share_permission(self.repo.id, 
                                                                   self.group.id, 
                                                                   'admin')
        res = ExtraGroupsSharePermission.objects.get_admin_groups(self.repo.id)
        assert res[0] == str(self.group.id)

    def test_can_get_repos_with_admin_permission(self):
        res = ExtraGroupsSharePermission.objects.get_repos_with_admin_permission(self.group.id)
        assert len(res) == 0
        ExtraGroupsSharePermission.objects.create_share_permission(self.repo.id, 
                                                                   self.group.id, 
                                                                   'admin')
        res = ExtraGroupsSharePermission.objects.get_repos_with_admin_permission(self.group.id)
        assert res[0] == str(self.repo.id)

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
