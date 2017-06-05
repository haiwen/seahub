from django.core.urlresolvers import reverse
from django.conf import settings

from seahub.test_utils import BaseTestCase


class ThrottingsTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)

    def test_whitelist(self):
        WHITELIST = settings.REST_FRAMEWORK_THROTTING_WHITELIST
        count = 0
        for i in range(1000):
            res = self.client.get(reverse('api2-pub-repos'))
            if res.status_code == 200:
                count += 1
        assert count == 300
        WHITELIST.append('127.0.0.1')
        count = 0
        for i in range(1000):
            res = self.client.get(reverse('api2-pub-repos'))
            if res.status_code == 200:
                count += 1
        assert count > 300
