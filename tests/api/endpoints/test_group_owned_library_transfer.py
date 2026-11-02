from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from seahub.api2.endpoints import group_owned_libraries as endpoint


class GroupOwnedLibraryTransferTest(TestCase):
    def setUp(self):
        self.repo_id = '11111111-2222-4333-8444-555555555555'
        self.source_group_id = 10
        self.target_group_id = 20
        self.username = 'admin@example.com'
        self.owner = '10@seafile_group'
        self.request = SimpleNamespace(
            user=SimpleNamespace(username=self.username),
            data={'email': 'recipient@example.com', 'reshare': False},
            cloud_mode=False)

        for name in ('ccnet_api', 'seafile_api', 'get_repo_owner',
                     'is_group_admin', 'is_group_member', 'User',
                     'transfer_repo', 'RepoTransfer', 'UploadLinkShare', 'FileShare'):
            patcher = patch.object(endpoint, name)
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

        # The decorators resolve their dependencies in endpoints.utils.
        for target, value in (
                ('seahub.api2.endpoints.utils.ccnet_api.get_group',
                 SimpleNamespace(id=self.source_group_id)),
                ('seahub.api2.endpoints.utils.is_org_context', False)):
            patcher = patch(target, return_value=value)
            patcher.start()
            self.addCleanup(patcher.stop)

        self.get_repo_owner.side_effect = lambda request, repo_id: self.owner
        self.is_group_admin.return_value = True
        self.is_group_member.return_value = True
        self.ccnet_api.get_group.return_value = SimpleNamespace(creator_name='system admin')
        self.seafile_api.list_inner_pub_repos_by_owner.return_value = []
        self.seafile_api.list_org_inner_pub_repos_by_owner.return_value = []
        self.seafile_api.get_org_id_by_repo_id.return_value = -1

    def transfer(self, group_id=None):
        return endpoint.GroupOwnedLibraryTransferView().put(
            self.request, group_id or self.source_group_id, self.repo_id)

    def assert_no_transfer(self):
        self.transfer_repo.assert_not_called()
        self.RepoTransfer.objects.create.assert_not_called()
        self.UploadLinkShare.objects.filter.assert_not_called()
        self.FileShare.objects.filter.assert_not_called()

    def test_personal_library_shared_with_group_cannot_be_transferred(self):
        self.owner = 'owner@example.com'
        for share_permission in ('r', 'rw'):
            with self.subTest(share_permission=share_permission):
                self.seafile_api.get_group_shared_repo_by_path.return_value = SimpleNamespace(
                    permission=share_permission)
                self.assertEqual(self.transfer().status_code, 404)
                self.assert_no_transfer()

    def test_other_groups_library_cannot_be_transferred_using_receiving_group(self):
        self.owner = '20@seafile_group'
        # The caller administers both groups, but must use the owning group.
        self.is_group_admin.return_value = True
        self.assertEqual(self.transfer(group_id=10).status_code, 404)
        self.assert_no_transfer()

    def test_admin_of_both_groups_can_transfer_using_owning_group(self):
        self.owner = '20@seafile_group'
        self.assertEqual(self.transfer(group_id=20).status_code, 200)
        self.is_group_admin.assert_called_once_with(20, self.username)
        self.transfer_repo.assert_called_once_with(
            self.repo_id, 'recipient@example.com', False, None)
        self.RepoTransfer.objects.create.assert_called_once_with(
            from_user=self.owner, to='recipient@example.com', repo_id=self.repo_id,
            org_id=-1, operator=self.username)

    def test_source_group_member_without_admin_role_cannot_transfer(self):
        self.is_group_admin.return_value = False
        self.assertEqual(self.transfer().status_code, 403)
        self.assert_no_transfer()

    def test_target_group_membership_is_sufficient(self):
        self.request.data['email'] = '20@seafile_group'
        self.is_group_admin.side_effect = lambda group_id, username: group_id == 10
        self.assertEqual(self.transfer().status_code, 200)
        self.is_group_admin.assert_called_once_with(10, self.username)
        self.is_group_member.assert_called_once_with(20, self.username)
        self.transfer_repo.assert_called_once_with(
            self.repo_id, '20@seafile_group', False, None)

    def test_target_group_nonmember_cannot_receive_transfer(self):
        self.request.data['email'] = '20@seafile_group'
        self.is_group_member.return_value = False
        self.assertEqual(self.transfer().status_code, 403)
        self.assert_no_transfer()

    def test_transfer_to_same_group_is_rejected(self):
        self.request.data['email'] = '10@seafile_group'
        self.assertEqual(self.transfer().status_code, 400)
        self.assert_no_transfer()

    def test_reshare_flag_is_preserved_for_authorized_transfer(self):
        self.request.data['reshare'] = True
        self.assertEqual(self.transfer().status_code, 200)
        self.transfer_repo.assert_called_once_with(
            self.repo_id, 'recipient@example.com', True, None)

    def test_organization_transfer_preserves_org_context(self):
        self.request.user.org = SimpleNamespace(org_id=7)
        self.seafile_api.get_org_id_by_repo_id.return_value = 7
        self.ccnet_api.org_user_exists.return_value = True
        with patch('seahub.api2.endpoints.utils.is_org_context', return_value=True):
            self.assertEqual(self.transfer().status_code, 200)
        self.ccnet_api.org_user_exists.assert_called_once_with(7, 'recipient@example.com')
        self.transfer_repo.assert_called_once_with(
            self.repo_id, 'recipient@example.com', False, 7)
        self.seafile_api.list_org_inner_pub_repos_by_owner.assert_called_once_with(
            7, self.owner)
