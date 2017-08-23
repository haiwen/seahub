import os
import pytest
from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

TRAVIS = 'TRAVIS' in os.environ


@pytest.mark.skipif(TRAVIS, reason="")
class TwoFactorAuthViewTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_can_disable_two_factor_auth(self):
        from seahub.two_factor.models import (StaticDevice, TOTPDevice,
                                                    PhoneDevice)
        totp = TOTPDevice(user=self.admin, name="", confirmed=1)
        totp.save()

        from seahub.two_factor import devices_for_user
        devices = devices_for_user(self.admin)
        i = 0
        for device in devices_for_user(self.admin):
            if device:
                i+=1
        assert i > 0
        resp = self.client.delete(reverse('two-factor-auth-view', args=[str(self.admin.username)]))
        assert resp.status_code == 200
        i = 0
        for device in devices_for_user(self.admin):
            if device:
                i+=1
        assert i == 0

    def tearDown(self):
        try:
            for device in devices_for_user(self.admin):
                device.delete()
        except:
            pass
