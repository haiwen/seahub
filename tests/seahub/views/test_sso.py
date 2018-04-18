from django.conf import settings
from django.core.urlresolvers import reverse
from django.test import override_settings
from django.utils.http import urlquote

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

        resp = self.client.get(self.url + '?next=' + urlquote('http://testserver\@example.com'))
        self.assertRegexpMatches(resp['Location'], settings.LOGIN_REDIRECT_URL)
