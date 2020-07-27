from mock import patch
import time

from django.urls import reverse
from django.test import override_settings

from seahub.api2.throttling import SimpleRateThrottle
from seahub.test_utils import BaseTestCase


class ThrottingsTest(BaseTestCase):

    def setUp(self):
        # clear cache between every test case to avoid cache issue in throtting
        self.clear_cache()

        self.login_as(self.user)

    @patch.object(SimpleRateThrottle, 'get_rate')
    def test_default(self, mock_get_rate):
        mock_get_rate.return_value = '10/minute'

        for i in range(12):
            res = self.client.get(reverse('api2-pub-repos'))
            if i >= 10:
                assert res.status_code == 429
            else:
                assert res.status_code == 200

            time.sleep(0.1)

    @override_settings(REST_FRAMEWORK_THROTTING_WHITELIST=['127.0.0.1'])
    @patch.object(SimpleRateThrottle, 'get_rate')
    def test_whitelist(self, mock_get_rate):
        mock_get_rate.return_value = '10/minute'

        for i in range(12):
            res = self.client.get(reverse('api2-pub-repos'))
            assert res.status_code == 200

            time.sleep(0.1)
