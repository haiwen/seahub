import unittest
from unittest.mock import patch

from seahub.utils import is_valid_dirent_name


class IsValidDirentNameTest(unittest.TestCase):

    def test_rejects_backslash_names_before_rpc(self):
        with patch('seahub.utils.seafile_api.is_valid_filename') as validate:
            for name in ('\\', '\\\\', 'Folder\\Shared', 'report\\.txt'):
                with self.subTest(name=name):
                    self.assertFalse(is_valid_dirent_name(name))

        validate.assert_not_called()

    def test_regular_names_keep_existing_validation(self):
        with patch('seahub.utils.seafile_api.is_valid_filename', return_value=True) as validate:
            self.assertTrue(is_valid_dirent_name('Test folder'))
            validate.assert_called_once_with('fake_repo_id', 'Test folder')

        with patch('seahub.utils.seafile_api.is_valid_filename', return_value=False):
            self.assertFalse(is_valid_dirent_name('invalid-name'))
