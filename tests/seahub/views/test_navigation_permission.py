from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from seahub.api2.endpoints import dir as dir_endpoint
from seahub.api2 import views as api_views
from seahub.repo_api_tokens import utils as token_utils


class NavigationListingTest(TestCase):
    def setUp(self):
        self.entry = SimpleNamespace(
            obj_name='bridge', obj_id='directory-id', mode=0o040755,
            mtime=123, permission='invisible', write_protected=True)

    def test_directory_listing_preserves_navigation_folders(self):
        with patch.object(dir_endpoint, 'seafile_api') as api, \
                patch.object(dir_endpoint, 'UserStarredFiles') as starred:
            api.list_dir_with_perm.return_value = [self.entry]
            api.get_repo_status.return_value = 0
            starred.objects.filter.return_value = []
            dirs, files = dir_endpoint.get_dir_file_info_list(
                'member@example.com', 'd', SimpleNamespace(id='repo'), '/', False, 48)
        self.assertEqual(files, [])
        self.assertEqual(dirs[0]['name'], 'bridge')
        self.assertEqual(dirs[0]['permission'], 'invisible')
        self.assertTrue(dirs[0]['write_protected'])

    def test_recursive_listing_walks_through_navigation_folders(self):
        with patch.object(api_views, 'seafile_api') as api, \
                patch.object(api_views, 'is_pro_version', return_value=False):
            api.list_dir_with_perm.side_effect = [[self.entry], []]
            entries = api_views._collect_dir_file_recursively('member@example.com', 'repo', '/', [])
        self.assertTrue(entries[0]['write_protected'])
        self.assertEqual(api.list_dir_with_perm.call_count, 2)

    def test_old_dirents_default_to_unprotected(self):
        del self.entry.write_protected
        self.entry.permission = 'rw'
        with patch.object(dir_endpoint, 'seafile_api') as api, \
                patch.object(dir_endpoint, 'UserStarredFiles') as starred:
            api.list_dir_with_perm.return_value = [self.entry]
            api.get_repo_status.return_value = 0
            starred.objects.filter.return_value = []
            dirs, _ = dir_endpoint.get_dir_file_info_list(
                'member@example.com', 'd', SimpleNamespace(id='repo'), '/', False, 48)
        self.assertFalse(dirs[0]['write_protected'])

    def test_repo_token_recursive_listing_includes_write_protected(self):
        del self.entry.write_protected
        with patch.object(token_utils, 'seafile_api') as api, \
                patch.object(token_utils, 'is_pro_version', return_value=False):
            api.list_dir_by_path.side_effect = [[self.entry], []]
            entries = token_utils._collect_dir_file_recursively('repo', '/', [])
        self.assertFalse(entries[0]['write_protected'])
