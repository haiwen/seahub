import random
import string
import unittest

from seahub.api2.endpoints.multi_share_links import generate_share_link_password


class ShareLinkPasswordTest(unittest.TestCase):
    """The auto-generated share link password must not come from the
    process-wide Mersenne Twister instance, whose state can be reconstructed
    from enough observed output.
    """

    def test_password_is_not_reproducible_from_a_known_random_seed(self):
        random.seed(20261028)
        first = generate_share_link_password()

        random.seed(20261028)
        second = generate_share_link_password()

        self.assertNotEqual(first, second)

    def test_password_shape(self):
        password = generate_share_link_password()

        self.assertEqual(8, len(password))
        allowed = set(string.ascii_letters + string.digits + string.punctuation)
        self.assertTrue(set(password).issubset(allowed))
