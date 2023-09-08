from django.conf import settings
from django.urls import reverse
from django.test import override_settings
from django.urls import re_path
from urllib.parse import quote

from seahub.base.models import ClientSSOToken
from seahub.test_utils import BaseTestCase
from seahub.views.sso import sso, client_sso_complete
from seahub.urls import urlpatterns

urlpatterns += [
    re_path(r'^client-sso/(?P<uuid>[^/]+)/complete/$', client_sso_complete, name="client_sso_complete"),
]


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

    def test_client_sso_complete(self):
        self.login_as(self.user)

        t = ClientSSOToken.objects.new()
        assert t.api_key is None
        assert t.email is None

        t.accessed()
        resp = self.client.post('/client-sso/%s/complete/' % t.token)
        self.assertEqual(resp.status_code, 302)

        t2 = ClientSSOToken.objects.get(token=t.token)
        assert t2.api_key is not None
        assert t2.email == self.user.username
