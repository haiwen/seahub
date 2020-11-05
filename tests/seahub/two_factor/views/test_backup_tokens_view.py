from django.urls import reverse
import pytest
pytestmark = pytest.mark.django_db

from seahub.two_factor.models import StaticDevice, user_has_device
from seahub.test_utils import BaseTestCase


class BackupTokensViewTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()

        from constance import config
        self.config = config

        self.login_as(self.user)
        self.url = reverse('two_factor:backup_tokens')
        self.old_conf = self.config.ENABLE_TWO_FACTOR_AUTH
        self.config.ENABLE_TWO_FACTOR_AUTH = True

    def tearDown(self):
        self.config.ENABLE_TWO_FACTOR_AUTH = self.old_conf

    def test_user_2fa_not_enabled(self):
        resp = self.client.get(self.url)
        # redirect to 2fa setup page
        self.assertRegex(resp['Location'],
                                 r'/profile/two_factor_authentication/setup/')
