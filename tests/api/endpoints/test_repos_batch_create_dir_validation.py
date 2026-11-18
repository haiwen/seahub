import unittest
from types import SimpleNamespace
from unittest.mock import patch

from seahub.api2.endpoints import repos_batch


class ReposBatchCreateDirValidationTest(unittest.TestCase):

    def test_invalid_path_is_skipped_while_valid_path_is_created(self):
        invalid_path = '/Folder\\Shared/'
        request = SimpleNamespace(
            data={'repo_id': 'repo', 'paths': [invalid_path, '/valid/']},
            user=SimpleNamespace(username='owner'),
        )

        with patch.object(repos_batch, 'seafile_api') as api, \
                patch.object(repos_batch, 'check_folder_permission', return_value='rw'), \
                patch.object(repos_batch, 'get_folder_permission_recursively', return_value='rw'):
            api.get_dir_id_by_path.return_value = None
            api.is_valid_filename.return_value = True
            response = repos_batch.ReposBatchCreateDirView().post(request)

        self.assertEqual(response.data['failed'], [
            {'repo_id': 'repo', 'path': invalid_path, 'error_msg': 'path invalid.'},
        ])
        self.assertEqual(response.data['success'], [
            {'repo_id': 'repo', 'path': '/valid/'},
        ])
        api.mkdir_with_parents.assert_called_once_with('repo', '/', 'valid', 'owner')

    def test_validation_error_does_not_create_directory(self):
        request = SimpleNamespace(
            data={'repo_id': 'repo', 'paths': ['/folder/']},
            user=SimpleNamespace(username='owner'),
        )

        with patch.object(repos_batch, 'seafile_api') as api, \
                patch.object(repos_batch, 'check_folder_permission', return_value='rw'), \
                patch.object(repos_batch, 'is_valid_dirent_name', side_effect=RuntimeError('validation failed')):
            response = repos_batch.ReposBatchCreateDirView().post(request)

        self.assertEqual(len(response.data['failed']), 1)
        self.assertEqual(response.data['success'], [])
        api.mkdir_with_parents.assert_not_called()
