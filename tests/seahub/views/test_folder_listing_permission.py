from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from pysearpc import SearpcError
from rest_framework.test import APIRequestFactory, force_authenticate

from seahub import views
from seahub.api2 import views as legacy_api
from seahub.api2.endpoints import dir as dir_api


class FolderListingPermissionTest(TestCase):
    def setUp(self):
        self.request = SimpleNamespace(user=SimpleNamespace(username='member@example.com'))
        patcher = patch.object(views, 'seafile_api')
        self.api = patcher.start()
        self.addCleanup(patcher.stop)
        self.api.get_repo_status.return_value = 0

    def test_invisible_is_only_allowed_for_listing(self):
        self.api.check_permission_by_path.return_value = 'invisible'
        self.assertEqual(views.check_folder_permission(self.request, 'repo', '/hidden', allow_navigation=True), 'invisible')
        self.assertIsNone(views.check_folder_permission(self.request, 'repo', '/hidden'))
        self.api.list_dir_with_perm.assert_not_called()
        self.api.get_dir_id_by_path.assert_not_called()
        self.api.get_repo_status.assert_not_called()

    def test_visible_permissions_and_readonly_repository(self):
        self.api.check_permission_by_path.return_value = 'rw'
        self.assertEqual(views.check_folder_permission(self.request, 'repo', '/visible', allow_navigation=True), 'rw')
        self.api.get_repo_status.return_value = 1
        self.assertEqual(views.check_folder_permission(self.request, 'repo', '/visible', allow_navigation=True), 'r')
        self.api.check_permission_by_path.return_value = 'invisible'
        self.assertEqual(views.check_folder_permission(self.request, 'repo', '/hidden', allow_navigation=True), 'invisible')

    def test_missing_permission_and_rpc_failure_are_denied(self):
        self.api.check_permission_by_path.return_value = None
        self.assertIsNone(views.check_folder_permission(self.request, 'repo', '/', allow_navigation=True))
        self.api.check_permission_by_path.side_effect = SearpcError('RPC failed')
        self.assertIsNone(views.check_folder_permission(self.request, 'repo', '/', allow_navigation=True))

    def test_anonymous_user_is_denied_without_rpc(self):
        self.request.user.username = ''
        self.assertIsNone(views.check_folder_permission(self.request, 'repo', '/', allow_navigation=True))
        self.api.check_permission_by_path.assert_not_called()


class DirectoryListingAPITest(TestCase):
    def test_invisible_empty_listing_is_allowed_without_parent_lookup(self):
        user = SimpleNamespace(username='member@example.com', is_authenticated=True)
        for module in (dir_api, legacy_api):
            for permission, expected_status in (('invisible', 200), (None, 403)):
                with self.subTest(module=module.__name__, permission=permission), \
                        patch.object(views, 'seafile_api') as api, \
                        patch.object(module, 'seafile_api', api), \
                        patch.object(module, 'get_dir_file_recursively', return_value=[]) as listing, \
                        patch.object(module.DirView, 'throttle_classes', ()):
                    api.get_repo.return_value = SimpleNamespace(id='repo')
                    api.get_dir_id_by_path.return_value = 'dir-id'
                    api.check_permission_by_path.return_value = permission
                    request = APIRequestFactory().get('/dir/', {'p': '/hidden', 'recursive': '1'})
                    force_authenticate(request, user=user)
                    response = module.DirView.as_view()(request, repo_id='repo')
                    self.assertEqual(response.status_code, expected_status)
                    self.assertEqual(listing.call_count, int(expected_status == 200))
                    api.check_permission_by_path.assert_called_once_with('repo', '/hidden/', user.username)
                    api.get_dir_id_by_path.assert_called_once_with('repo', '/hidden/')
                    api.list_dir_with_perm.assert_not_called()
