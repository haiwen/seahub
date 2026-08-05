from types import SimpleNamespace
from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase

from seahub.ai.apis import ChatSessionView
from seahub.ai.utils import (
    PERMISSION_PREVIEW,
    PERMISSION_PREVIEW_EDIT,
    PERMISSION_INVISIBLE,
    user_passes_ai_chat_folder_permissions,
)


class AIChatFolderPermissionTest(SimpleTestCase):
    def setUp(self):
        self.request = RequestFactory().get('/')
        self.request.user = SimpleNamespace(username='user@example.com')
        self.repo_id = 'repo-id'

    @patch('seahub.ai.utils.is_pro_version', return_value=False)
    def test_non_pro_user_can_use_ai_chat(self, mock_is_pro_version):
        assert user_passes_ai_chat_folder_permissions(self.request, self.repo_id) is True
        mock_is_pro_version.assert_called_once_with()

    @patch('seahub.ai.utils.is_repo_admin', return_value=True)
    @patch('seahub.ai.utils.is_pro_version', return_value=True)
    def test_repo_admin_can_use_ai_chat(self, mock_is_pro_version, mock_is_repo_admin):
        assert user_passes_ai_chat_folder_permissions(self.request, self.repo_id) is True
        mock_is_pro_version.assert_called_once_with()
        mock_is_repo_admin.assert_called_once_with(self.request.user.username, self.repo_id)

    @patch('seahub.ai.utils.seafile_api.list_folder_user_perm_by_repo', create=True)
    @patch('seahub.ai.utils.is_repo_admin', return_value=False)
    @patch('seahub.ai.utils.is_pro_version', return_value=True)
    def test_forbidden_user_folder_permissions_block_ai_chat(
            self, mock_is_pro_version, mock_is_repo_admin, mock_list_user_perms):
        for permission in (PERMISSION_INVISIBLE, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT):
            with self.subTest(permission=permission):
                mock_list_user_perms.return_value = [SimpleNamespace(
                    user=self.request.user.username,
                    permission=permission,
                )]

                assert user_passes_ai_chat_folder_permissions(self.request, self.repo_id) is False

    @patch('seahub.ai.utils.ccnet_api.get_groups', create=True)
    @patch('seahub.ai.utils.is_org_context', return_value=False)
    @patch('seahub.ai.utils.seafile_api.list_folder_group_perm_by_repo', create=True)
    @patch('seahub.ai.utils.seafile_api.list_folder_user_perm_by_repo', return_value=[], create=True)
    @patch('seahub.ai.utils.is_repo_admin', return_value=False)
    @patch('seahub.ai.utils.is_pro_version', return_value=True)
    def test_group_preview_folder_permission_blocks_ai_chat(
            self, mock_is_pro_version, mock_is_repo_admin, mock_list_user_perms,
            mock_list_group_perms, mock_is_org_context, mock_get_groups):
        mock_list_group_perms.return_value = [SimpleNamespace(group_id=1, permission=PERMISSION_PREVIEW)]
        mock_get_groups.return_value = [SimpleNamespace(id=1)]

        assert user_passes_ai_chat_folder_permissions(self.request, self.repo_id) is False
        mock_get_groups.assert_called_once_with(self.request.user.username, return_ancestors=True)

    @patch('seahub.ai.utils.ccnet_api.get_org_groups_by_user', create=True)
    @patch('seahub.ai.utils.is_org_context', return_value=True)
    @patch('seahub.ai.utils.seafile_api.list_folder_group_perm_by_repo', create=True)
    @patch('seahub.ai.utils.seafile_api.list_folder_user_perm_by_repo', return_value=[], create=True)
    @patch('seahub.ai.utils.is_repo_admin', return_value=False)
    @patch('seahub.ai.utils.is_pro_version', return_value=True)
    def test_org_group_preview_folder_permission_blocks_ai_chat(
            self, mock_is_pro_version, mock_is_repo_admin, mock_list_user_perms,
            mock_list_group_perms, mock_is_org_context, mock_get_org_groups):
        self.request.user.org = SimpleNamespace(org_id=1)
        mock_list_group_perms.return_value = [SimpleNamespace(group_id=2, permission=PERMISSION_PREVIEW)]
        mock_get_org_groups.return_value = [SimpleNamespace(id=2)]

        assert user_passes_ai_chat_folder_permissions(self.request, self.repo_id) is False
        mock_get_org_groups.assert_called_once_with(1, self.request.user.username, return_ancestors=True)

    @patch('seahub.ai.utils.seafile_api.list_folder_group_perm_by_repo', return_value=[], create=True)
    @patch('seahub.ai.utils.seafile_api.list_folder_user_perm_by_repo', return_value=[], create=True)
    @patch('seahub.ai.utils.is_repo_admin', return_value=False)
    @patch('seahub.ai.utils.is_pro_version', return_value=True)
    def test_user_without_forbidden_folder_permissions_can_use_ai_chat(
            self, mock_is_pro_version, mock_is_repo_admin, mock_list_user_perms,
            mock_list_group_perms):
        assert user_passes_ai_chat_folder_permissions(self.request, self.repo_id) is True


class AIChatAPIPermissionTest(SimpleTestCase):
    @patch('seahub.ai.apis.user_passes_ai_chat_folder_permissions', return_value=False)
    @patch('seahub.ai.apis.check_folder_permission', return_value='rw')
    @patch('seahub.ai.apis.ChatSessions.objects.get_session_by_uuid')
    def test_update_session_rejects_forbidden_folder_permission(
            self, mock_get_session, mock_check_folder_permission, mock_user_passes_permissions):
        request = SimpleNamespace(
            user=SimpleNamespace(username='user@example.com'),
            data={'session_name': 'Renamed chat'},
        )
        mock_get_session.return_value = SimpleNamespace(
            repo_id='repo-id',
            username=request.user.username,
        )

        response = ChatSessionView().put(request, 'session-uuid')

        self.assertEqual(response.status_code, 403)
        mock_check_folder_permission.assert_called_once_with(request, 'repo-id', '/')
        mock_user_passes_permissions.assert_called_once_with(request, 'repo-id')
