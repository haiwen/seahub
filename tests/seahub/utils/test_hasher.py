import base64
import unittest

from Crypto.Cipher import AES

from seahub.utils.hasher import AESPasswordHasher, AESPasswordDecodeError


SECRET = 'k' * 32


def legacy_encode(password):
    """Encode a value the way AESPasswordHasher did before PKCS#7 padding."""
    raw = password.encode('utf-8')
    raw += (16 - len(raw) % 16) * b'{'
    cipher = AES.new(SECRET.encode('utf-8'), AES.MODE_ECB)
    return 'aes$' + base64.b64encode(cipher.encrypt(raw)).decode('utf-8')


class AESPasswordHasherTest(unittest.TestCase):

    def setUp(self):
        self.hasher = AESPasswordHasher(SECRET)

    def test_round_trip_keeps_trailing_padding_characters(self):
        passwords = [
            'abc',
            'abc{',
            'abc{{',
            '{',
            '{{',
            'a{b',
            'p@ss{word{',
            'x' * 15,
            'x' * 16,
            'x' * 15 + '{',
            'x' * 16 + '{',
            '{' * 16,
        ]
        for password in passwords:
            encoded = self.hasher.encode(password)
            self.assertEqual(self.hasher.decode(encoded), password)
            self.assertTrue(self.hasher.verify(password, encoded))

    def test_new_encoding_is_not_ambiguous_for_trailing_braces(self):
        self.assertNotEqual(self.hasher.encode('abc'), self.hasher.encode('abc{'))

    def test_verify_rejects_truncated_password(self):
        encoded = self.hasher.encode('abc{')
        self.assertFalse(self.hasher.verify('abc', encoded))

    def test_legacy_values_keep_legacy_decoding(self):
        # Existing records are padded with '{', so they still decode to the
        # value the old rstrip(PADDING) implementation produced.
        cases = [
            ('abc', 'abc'),
            ('abc{', 'abc'),
            ('abc{{', 'abc'),
            ('a{b', 'a{b'),
            ('{', ''),
            ('x' * 16, 'x' * 16),
            ('x' * 15 + '{', 'x' * 15),
            ('x' * 16 + '{', 'x' * 16),
        ]
        for password, expected in cases:
            self.assertEqual(self.hasher.decode(legacy_encode(password)), expected)

    def test_decode_rejects_unknown_algorithm(self):
        with self.assertRaises(AESPasswordDecodeError):
            self.hasher.decode('sha1$abc')
