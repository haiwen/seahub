# Copyright (c) 2012-2016 Seafile Ltd.
import base64
try:
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import pad, unpad
except ImportError:
    AES = None


from django.conf import settings
from django.utils.encoding import force_str


class AESPasswordDecodeError(Exception):
    pass

# the block size for the cipher object; must be 16, 24, or 32 for AES
BLOCK_SIZE = 32

# AES encrypts data in 16-byte blocks. Legacy values used PADDING as the
# padding character; values written now use PKCS#7 padding.
PADDING = '{'
# Values written before the switch to PKCS#7 padding always end their
# plaintext with PADDING, which distinguishes them from values padded with
# PKCS#7 (whose last byte is in the range 0x01-0x10).
LEGACY_PADDING = PADDING.encode('utf-8')

# encrypt with AES, encode with base64
def EncodeAES(c, s):
    return base64.b64encode(c.encrypt(pad(s.encode('utf-8'), 16))).decode('utf-8')


def DecodeAES(c, e):
    data = c.decrypt(base64.b64decode(e))
    if data.endswith(LEGACY_PADDING):
        # Older values used PADDING as the padding character, so keep the old
        # decoding behavior for them. Genuine trailing PADDING characters are
        # still lost for those values; they cannot be told apart from padding.
        data = data.rstrip(LEGACY_PADDING)
    else:
        data = unpad(data, 16)
    return data.decode('utf-8')


class AESPasswordHasher:
    algorithm = 'aes'

    def __init__(self, secret=None):
        if not secret:
            secret = settings.SECRET_KEY[:BLOCK_SIZE]

        self.cipher = AES.new(secret.encode('utf-8'), AES.MODE_ECB)

    def encode(self, password):
        password = force_str(password)
        return "%s$%s" % (self.algorithm, EncodeAES(self.cipher, password))

    def verify(self, password, encoded):
        return self.decode(encoded) == password

    def decode(self, encoded):
        algorithm, data = encoded.split('$', 1)
        if algorithm != self.algorithm:
            raise AESPasswordDecodeError
        data = data.encode('utf-8')

        data += b'='*4
        return DecodeAES(self.cipher, data)
