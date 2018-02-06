from django.core.urlresolvers import reverse
from constance import config

from seahub.two_factor.models import StaticDevice, user_has_device
from seahub.test_utils import BaseTestCase


class BackupTokensViewTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()

        self.login_as(self.user)
        self.url = reverse('two_factor:backup_tokens')
        self.old_conf = config.ENABLE_TWO_FACTOR_AUTH
        config.ENABLE_TWO_FACTOR_AUTH = True

    def tearDown(self):
        config.ENABLE_TWO_FACTOR_AUTH = self.old_conf

    def test_user_2fa_not_enabled(self):
        resp = self.client.get(self.url)
        # redirect to 2fa setup page
        self.assertRegexpMatches(resp['Location'],
                                 r'http://testserver/profile/two_factor_authentication/setup/')
