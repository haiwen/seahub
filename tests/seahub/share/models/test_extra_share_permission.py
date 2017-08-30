from seahub.share.models import ExtraSharePermission
from seahub.test_utils import BaseTestCase

from seaserv import seafile_api


class ExtraSharePermissionTest(BaseTestCase):
    def test_can_add(self):
        ExtraSharePermission.objects.create_share_permission(self.repo.id, 
                                                             self.user.username, 
                                                             'admin')
        self.assertEqual(1, len(ExtraSharePermission.objects.all()))

    def test_can_update(self):
        ExtraSharePermission.objects.create_share_permission(self.repo.id, 
                                                             self.user.username, 
                                                             'rw')
        ExtraSharePermission.objects.update_share_permission(self.repo.id, 
                                                             self.user.username, 
                                                             'admin')
        self.assertEqual('admin', ExtraSharePermission.objects.all()[0].permission)

    def test_can_delete(self):
        ExtraSharePermission.objects.create_share_permission(self.repo.id, 
                                                             self.user.username, 
                                                             'admin')
        ExtraSharePermission.objects.delete_share_permission(self.repo.id, 
                                                             self.user.username)
        self.assertEqual(0, len(ExtraSharePermission.objects.all()))

    def test_can_get_user_permission(self):
        self.assertEqual(None, ExtraSharePermission.objects.\
                         get_user_permission(self.repo.id, self.user.username))
        ExtraSharePermission.objects.create_share_permission(self.repo.id, 
                                                             self.user.username, 
                                                             'admin')
        self.assertEqual('admin', ExtraSharePermission.objects.\
                         get_user_permission(self.repo.id, self.user.username))

    def test_can_get_shared_repos_with_admin(self):
        self.assertEqual([], ExtraSharePermission.objects.\
                        get_repos_with_admin_permission(self.user.username))
        ExtraSharePermission.objects.create_share_permission(self.repo.id, 
                                                             self.user.username, 
                                                             'admin')
        self.assertEqual([self.repo.id], ExtraSharePermission.objects.\
                        get_repos_with_admin_permission(self.user.username))

    def test_get_permission_by_owner_shared(self):
        self.assertEqual([], ExtraSharePermission.objects.\
                        get_admin_users_by_repo(self.repo.id))
        ExtraSharePermission.objects.create_share_permission(self.repo.id, 
                                                             self.user.username, 
                                                             'admin')
        self.assertEqual([self.user.username], ExtraSharePermission.objects.\
                        get_admin_users_by_repo(self.repo.id))

    def test_batch_is_admin(self):
        r = seafile_api.get_repo(self.create_repo(name='repo2',
            desc='', username=self.user.email, passwd=None))
        data = [(self.repo.id, self.admin.email), (r.id, self.admin.email)]
        self.assertEqual([], ExtraSharePermission.objects.batch_is_admin(data))
        ExtraSharePermission.objects.create_share_permission(self.repo.id, 
                                                             self.admin.username, 
                                                             'admin')
        self.assertEqual([(self.repo.id, self.admin.email)], ExtraSharePermission.objects.batch_is_admin(data))
