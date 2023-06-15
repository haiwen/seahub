from django.conf import settings
from django.urls import reverse
from django.test import override_settings
from urllib.parse import quote

from seahub.test_utils import BaseTestCase
from seahub.views.sso import sso


class SSOTest(BaseTestCase):
    def setUp(self):
        self.url = reverse(sso)

    @override_settings(ENABLE_SHIB_LOGIN=True)
    def test_sso(self):
        resp = self.client.get(self.url)
        self.assertEqual(302, resp.status_code)
        assert resp.get('location') == '/'

        resp = self.client.get(self.url + '?next=/foo')
        assert resp.get('location') == '/foo'

        resp = self.client.get(self.url + '?next=' + quote('http://testserver\@example.com'))
        self.assertRegex(resp['Location'], settings.LOGIN_REDIRECT_URL)
