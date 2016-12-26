from django.test import override_settings

from seahub.invitations.utils import block_accepter
from seahub.test_utils import BaseTestCase


class BlockAccepterTest(BaseTestCase):
    @override_settings(INVITATION_ACCEPTER_BLACKLIST=["a@a.com", "*@a-a-a.com", r".*@(foo|bar).com"])
    def test_email_in_blacklist(self):
        assert block_accepter('a@a.com') is True
        assert block_accepter('a@a-a-a.com') is True
        assert block_accepter('a@foo.com') is True
        assert block_accepter('a@bar.com') is True
        assert block_accepter('a@foobar.com') is False
