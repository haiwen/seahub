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

    def test_regular_names_are_validated_without_rpc(self):
        with patch('seahub.utils.seafile_api.is_valid_filename') as validate:
            for name in ('Test folder', 'report.txt', '中文文件.md'):
                with self.subTest(name=name):
                    self.assertTrue(is_valid_dirent_name(name))

        validate.assert_not_called()

    def test_rejects_invalid_names(self):
        for name in ('', '..', 'report..txt', 'Folder/Shared', '\ud800', 'a' * 257):
            with self.subTest(name=name):
                self.assertFalse(is_valid_dirent_name(name))
