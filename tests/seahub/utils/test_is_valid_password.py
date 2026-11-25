import unittest

from seahub.utils import is_valid_password


class IsValidPasswordTest(unittest.TestCase):

    def test_rejects_del_character(self):
        # DEL is invisible in an input box and is often dropped when the
        # password is copied into email or chat, so it must not be accepted.
        for password in ('\x7f', 'abc\x7f', 'abc\x7fdef'):
            with self.subTest(password=password):
                self.assertFalse(is_valid_password(password))

    def test_accepts_printable_ascii(self):
        # Every character the frontend generator can produce must pass.
        for code in range(33, 127):
            with self.subTest(code=code):
                self.assertTrue(is_valid_password('abc' + chr(code)))

    def test_rejects_non_ascii(self):
        self.assertFalse(is_valid_password(u'密码'))
