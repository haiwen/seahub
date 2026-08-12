from urllib.parse import parse_qsl, urlsplit

from django.test import override_settings
from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.utils import get_service_url


class LogoutTest(BaseTestCase):
    def test_can_logout(self):
        resp = self.client.get(reverse('auth_logout'))

        self.assertEqual(200, resp.status_code)
        self.assertContains(resp, 'Log in again')


    @override_settings(
        ENABLE_OAUTH=True,
        OAUTH_LOGOUT_URL=(
            'https://idp.example.com/oidc/logout?client_id=seafile'
            '&ui_locales=en&id_token_hint=stale-token'
            '&post_logout_redirect_uri=https%3A%2F%2Fold.example.com%2Flogout'
        ),
    )
    def test_oauth_logout_includes_oidc_logout_parameters(self):
        oauth_id_token = 'header.payload.signature'
        session = self.client.session
        session['oauth_id_token'] = oauth_id_token
        session.save()
        self.client.cookies['via_oauth'] = 'true'

        resp = self.client.get(reverse('auth_logout'))

        self.assertEqual(302, resp.status_code)
        parsed_url = urlsplit(resp['Location'])
        self.assertEqual('https', parsed_url.scheme)
        self.assertEqual('idp.example.com', parsed_url.netloc)
        self.assertEqual('/oidc/logout', parsed_url.path)
        self.assertEqual([
            ('client_id', 'seafile'),
            ('ui_locales', 'en'),
            ('id_token_hint', oauth_id_token),
            ('post_logout_redirect_uri', get_service_url()),
        ], parse_qsl(parsed_url.query, keep_blank_values=True))
