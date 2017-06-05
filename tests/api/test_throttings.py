import time

from django.core.urlresolvers import reverse
from django.conf import settings
from django.test import override_settings

from seahub.test_utils import BaseTestCase


@override_settings(REST_FRAMEWORK = {'DEFAULT_THROTTLE_RATES':
    {'ping': '600/minute', 'anon': '5000/minute', 'user': '10/minute',},})
class ThrottingsTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)

    def test_whitelist(self):
        WHITELIST = settings.REST_FRAMEWORK_THROTTING_WHITELIST
        for i in range(12):
            time.sleep(0.1)
            res = self.client.get(reverse('api2-pub-repos'))
            if i > 10:
                assert res.status_code == 429
        WHITELIST.append('127.0.0.1')
        count = 0
        for i in range(12):
            time.sleep(0.1)
            res = self.client.get(reverse('api2-pub-repos'))
            if i > 10:
                assert res.status_code == 200
