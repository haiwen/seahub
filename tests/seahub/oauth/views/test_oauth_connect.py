from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import override_settings
from django.urls import reverse

import seahub.oauth.views as oauth_views
from seahub.auth.models import SocialAuthUser
from seahub.base.accounts import UNUSABLE_PASSWORD, User
from seahub.oauth.backends import OauthRemoteUserBackend
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


ENABLE_OAUTH_SETTINGS = {
    'ENABLE_OAUTH': True,
    'CLIENT_ID': 'client-id',
    'CLIENT_SECRET': 'client-secret',
    'AUTHORIZATION_URL': 'https://idp.example.com/authorize',
    'REDIRECT_URL': 'https://seafile.example.com/oauth/callback/',
    'TOKEN_URL': 'https://idp.example.com/token',
    'USER_INFO_URL': 'https://idp.example.com/userinfo',
    'SCOPE': 'openid',
    'ACCESS_TOKEN_IN_URI': False,
    'INCLUDE_CLIENT_ID': None,
    'OAUTH_PROVIDER': 'oauth',
    'OAUTH_ATTRIBUTE_MAP': {'email': (True, 'email')},
}


class OAuthConnectTest(BaseTestCase):
    def setUp(self):
        self.user = self.create_user('oauth_%s@test.com' % randstring(4),
                                     is_staff=False)
        self.login_as(self.user)
        self.other_user = self.create_user('other_%s@test.com' % randstring(4),
                                           is_staff=False)

    def tearDown(self):
        self.remove_user(self.user.username)
        self.remove_user(self.other_user.username)

    def test_oauth_connect_redirects_to_provider(self):
        mock_session = MagicMock()
        mock_session.authorization_url.return_value = (
            'https://idp.example.com/authorize?state=xyz', 'xyz')

        settings = dict(ENABLE_OAUTH_SETTINGS,
                        OAuth2Session=MagicMock(return_value=mock_session))
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.get(reverse('oauth_connect'), {'next': '/'})

        self.assertEqual(302, resp.status_code)
        self.assertEqual(
            'https://idp.example.com/authorize?state=xyz', resp['Location'])
        self.assertTrue(self.client.session['oauth_connect'])

    def test_oauth_connect_noop_when_already_connected(self):
        SocialAuthUser.objects.add(self.user.username, 'oauth', 'some-uid')
        mock_session_cls = MagicMock()

        settings = dict(ENABLE_OAUTH_SETTINGS, OAuth2Session=mock_session_cls)
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.get(reverse('oauth_connect'),
                                   {'next': '/profile/'})

        self.assertEqual(302, resp.status_code)
        self.assertEqual('/profile/', resp['Location'])
        mock_session_cls.assert_not_called()

    def test_oauth_connect_rejects_external_next(self):
        SocialAuthUser.objects.add(self.user.username, 'oauth', 'some-uid')
        mock_session_cls = MagicMock()

        settings = dict(ENABLE_OAUTH_SETTINGS, OAuth2Session=mock_session_cls)
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.get(reverse('oauth_connect'),
                                   {'next': '//evil.example.com/'})

        self.assertEqual(302, resp.status_code)
        self.assertEqual('/', resp['Location'])

    def _disconnect(self):
        with patch.dict(oauth_views.__dict__, ENABLE_OAUTH_SETTINGS):
            return self.client.post(reverse('oauth_disconnect') + '?next=/')

    def test_oauth_disconnect_removes_binding(self):
        SocialAuthUser.objects.add(self.user.username, 'oauth', 'some-uid')

        resp = self._disconnect()

        self.assertEqual(302, resp.status_code)
        self.assertFalse(SocialAuthUser.objects.filter(
            username=self.user.username, provider='oauth').exists())

    def test_oauth_disconnect_rejects_external_next(self):
        SocialAuthUser.objects.add(self.user.username, 'oauth', 'some-uid')

        with patch.dict(oauth_views.__dict__, ENABLE_OAUTH_SETTINGS):
            resp = self.client.post(
                reverse('oauth_disconnect') + '?next=//evil.example.com/')

        self.assertEqual(302, resp.status_code)
        self.assertEqual('/', resp['Location'])

    def test_oauth_disconnect_rejects_get(self):
        with patch.dict(oauth_views.__dict__, ENABLE_OAUTH_SETTINGS):
            resp = self.client.get(reverse('oauth_disconnect') + '?next=/')

        self.assertEqual(405, resp.status_code)

    def test_oauth_disconnect_refuses_user_without_local_password(self):
        SocialAuthUser.objects.add(self.user.username, 'oauth', 'some-uid')
        user = User.objects.get(self.user.username)

        settings = dict(ENABLE_OAUTH_SETTINGS,
                        UNUSABLE_PASSWORD=user.enc_password)
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.post(reverse('oauth_disconnect') + '?next=/')

        self.assertEqual(200, resp.status_code)
        self.assertTrue(SocialAuthUser.objects.filter(
            username=self.user.username, provider='oauth').exists())

    @patch('seahub.utils.auth.DISABLE_SSO_USER_LOCAL_PWD_LOGIN', True)
    def test_oauth_disconnect_refuses_forced_sso_user(self):
        SocialAuthUser.objects.add(self.user.username, 'oauth', 'some-uid')

        resp = self._disconnect()

        self.assertEqual(200, resp.status_code)
        self.assertTrue(SocialAuthUser.objects.filter(
            username=self.user.username, provider='oauth').exists())

    def test_oauth_disconnect_refuses_virtual_user_without_login_identifier(self):
        user = self.create_user('virtual_%s@auth.local' % randstring(4),
                                is_staff=False)
        self.addCleanup(self.remove_user, user.username)
        self.logout()
        self.login_as(user)
        SocialAuthUser.objects.add(user.username, 'oauth', 'some-uid')

        resp = self._disconnect()

        self.assertEqual(200, resp.status_code)
        self.assertTrue(SocialAuthUser.objects.filter(
            username=user.username, provider='oauth').exists())

    def test_oauth_disconnect_allows_virtual_user_with_contact_email(self):
        user = self.create_user('virtual_%s@auth.local' % randstring(4),
                                is_staff=False)
        self.addCleanup(self.remove_user, user.username)
        Profile.objects.add_or_update(
            username=user.username,
            contact_email='%s@example.com' % randstring(4))
        self.logout()
        self.login_as(user)
        SocialAuthUser.objects.add(user.username, 'oauth', 'some-uid')

        resp = self._disconnect()

        self.assertEqual(302, resp.status_code)
        self.assertFalse(SocialAuthUser.objects.filter(
            username=user.username, provider='oauth').exists())

    def _start_connect(self):
        session = self.client.session
        session['oauth_state'] = 'xyz'
        session['oauth_redirect'] = '/profile/'
        session['oauth_connect'] = True
        session.save()

    def _mock_callback_session(self, user_info):
        mock_response = MagicMock()
        mock_response.json.return_value = user_info
        mock_session = MagicMock()
        mock_session.fetch_token.return_value = {'access_token': 'token'}
        mock_session._client = SimpleNamespace(token={})
        mock_session.get.return_value = mock_response
        return mock_session

    @override_settings(AUTHENTICATION_BACKENDS=[
        'seahub.oauth.backends.OauthRemoteUserBackend'])
    def _login_with_oauth(self, user_info, attribute_map=None,
                           creates_user=True, allow_registration=True,
                           use_same_ldap_uid=False):
        self.logout()
        session = self.client.session
        session['oauth_state'] = 'xyz'
        session['oauth_redirect'] = '/profile/'
        session.save()

        settings = dict(
            ENABLE_OAUTH_SETTINGS,
            SSO_LDAP_USE_SAME_UID=use_same_ldap_uid,
            LDAP_PROVIDER='ldap',
            OAuth2Session=MagicMock(return_value=self._mock_callback_session(user_info)))
        if attribute_map is not None:
            settings['OAUTH_ATTRIBUTE_MAP'] = attribute_map
        with patch.dict(oauth_views.__dict__, settings), \
                patch.object(OauthRemoteUserBackend, 'create_unknown_user', allow_registration), \
                patch.object(OauthRemoteUserBackend, 'activate_after_creation', True), \
                patch.object(User.objects, 'create_oauth_user',
                             wraps=User.objects.create_oauth_user) as mock_create, \
                patch.object(oauth_views, 'get_api_token',
                             return_value=SimpleNamespace(key='token')):
            resp = self.client.get(reverse('oauth_callback'),
                                   {'code': 'abc', 'state': 'xyz'})

        self.assertEqual(302 if allow_registration else 200, resp.status_code)
        if creates_user:
            mock_create.assert_called_once()
            self.addCleanup(self.remove_user,
                            self.client.session[oauth_views.auth.SESSION_KEY])
        else:
            mock_create.assert_not_called()
        return resp

    def test_oauth_login_creates_user_despite_matching_legacy_email(self):
        self._login_with_oauth({'email': self.user.username})

        self.assertNotEqual(self.user.username,
                            self.client.session[oauth_views.auth.SESSION_KEY])
        self.assertTrue(SocialAuthUser.objects.filter(
            username=self.client.session[oauth_views.auth.SESSION_KEY], provider='oauth',
            uid=self.user.username).exists())

    def test_oauth_login_creates_user_despite_matching_contact_email(self):
        user = self.create_user('virtual_%s@auth.local' % randstring(4),
                                is_staff=False)
        self.addCleanup(self.remove_user, user.username)
        contact_email = '%s@example.com' % randstring(8)
        Profile.objects.add_or_update(user.username, contact_email=contact_email)

        self._login_with_oauth({'email': contact_email})

        self.assertNotEqual(user.username,
                            self.client.session[oauth_views.auth.SESSION_KEY])
        self.assertTrue(SocialAuthUser.objects.filter(
            username=self.client.session[oauth_views.auth.SESSION_KEY],
            provider='oauth', uid=contact_email).exists())

    def test_oauth_login_does_not_take_existing_contact_email(self):
        contact_email = '%s@example.com' % randstring(8)
        Profile.objects.add_or_update(self.user.username, contact_email=contact_email)

        self._login_with_oauth(
            {'sub': 'oauth-uid', 'mail': contact_email},
            {'sub': (True, 'uid'), 'mail': (True, 'contact_email')})

        self.assertNotEqual(self.user.username,
                            self.client.session[oauth_views.auth.SESSION_KEY])
        self.assertTrue(SocialAuthUser.objects.filter(
            username=self.client.session[oauth_views.auth.SESSION_KEY],
            provider='oauth', uid='oauth-uid').exists())
        self.assertEqual(self.user.username,
                         Profile.objects.get_profile_by_contact_email(contact_email).user)

    def test_oauth_login_prefers_uid_binding_over_email_match(self):
        SocialAuthUser.objects.add(self.other_user.username, 'oauth', self.user.username)

        self._login_with_oauth({'email': self.user.username}, creates_user=False)

        self.assertEqual(self.other_user.username,
                         self.client.session[oauth_views.auth.SESSION_KEY])

    def test_oauth_login_creates_user_after_disconnect(self):
        contact_email = '%s@example.com' % randstring(8)
        Profile.objects.add_or_update(self.user.username, contact_email=contact_email)
        for oauth_email in (self.user.username, contact_email):
            with self.subTest(oauth_email=oauth_email):
                SocialAuthUser.objects.add(self.user.username, 'oauth', oauth_email)
                resp = self._disconnect()
                self.assertEqual(302, resp.status_code)
                self.assertFalse(SocialAuthUser.objects.filter(
                    username=self.user.username, provider='oauth').exists())

                self._login_with_oauth({'email': oauth_email})

                self.assertNotEqual(self.user.username,
                                    self.client.session[oauth_views.auth.SESSION_KEY])
                self.assertTrue(SocialAuthUser.objects.filter(
                    username=self.client.session[oauth_views.auth.SESSION_KEY],
                    provider='oauth', uid=oauth_email).exists())
                SocialAuthUser.objects.delete_by_username_and_provider(
                    self.client.session[oauth_views.auth.SESSION_KEY], 'oauth')
                self.logout()
                self.login_as(self.user)

    def test_oauth_login_does_not_reuse_ldap_binding(self):
        SocialAuthUser.objects.add(self.user.username, 'ldap', self.user.username)

        self._login_with_oauth({'email': self.user.username})

        self.assertNotEqual(self.user.username,
                            self.client.session[oauth_views.auth.SESSION_KEY])

    def test_oauth_login_reuses_ldap_binding_when_enabled(self):
        SocialAuthUser.objects.add(self.user.username, 'ldap', self.user.username)

        self._login_with_oauth({'email': self.user.username},
                              creates_user=False, use_same_ldap_uid=True)

        self.assertEqual(self.user.username,
                         self.client.session[oauth_views.auth.SESSION_KEY])
        self.assertTrue(SocialAuthUser.objects.filter(
            username=self.user.username, provider='oauth',
            uid=self.user.username).exists())

    def test_oauth_login_rejects_unbound_user_when_registration_disabled(self):
        self._login_with_oauth({'email': self.user.username},
                              creates_user=False, allow_registration=False)

        self.assertNotIn(oauth_views.auth.SESSION_KEY, self.client.session)
        self.assertFalse(SocialAuthUser.objects.filter(
            provider='oauth', uid=self.user.username).exists())

    def test_oauth_callback_requires_state(self):
        mock_session = self._mock_callback_session(
            {'email': 'oauth@example.com'})

        settings = dict(ENABLE_OAUTH_SETTINGS,
                        OAuth2Session=MagicMock(return_value=mock_session))
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.get(reverse('oauth_callback'),
                                   {'code': 'abc', 'state': 'xyz'})

        self.assertEqual(200, resp.status_code)
        mock_session.fetch_token.assert_not_called()

    def test_oauth_callback_connects_current_user(self):
        mock_session = self._mock_callback_session(
            {'email': 'oauth@example.com'})
        self._start_connect()

        settings = dict(ENABLE_OAUTH_SETTINGS,
                        OAuth2Session=MagicMock(return_value=mock_session))
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.get(reverse('oauth_callback'),
                                   {'code': 'abc', 'state': 'xyz'})

        self.assertEqual(302, resp.status_code)
        self.assertEqual('/profile/', resp['Location'])
        self.assertEqual(self.user.username,
                         self.client.session[oauth_views.auth.SESSION_KEY])
        self.assertTrue(SocialAuthUser.objects.filter(
            username=self.user.username, provider='oauth',
            uid='oauth@example.com').exists())

    def test_oauth_callback_connect_does_not_login(self):
        mock_session = self._mock_callback_session(
            {'email': 'oauth@example.com'})
        self._start_connect()

        settings = dict(ENABLE_OAUTH_SETTINGS,
                        OAuth2Session=MagicMock(return_value=mock_session))
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.get(reverse('oauth_callback'),
                                   {'code': 'abc', 'state': 'xyz'})

        self.assertEqual(302, resp.status_code)
        self.assertNotIn('seahub_auth', resp.cookies)

    def test_oauth_callback_connect_rejects_uid_bound_to_other_user(self):
        SocialAuthUser.objects.add(self.other_user.username, 'oauth',
                                   'oauth@example.com')
        mock_session = self._mock_callback_session(
            {'email': 'oauth@example.com'})
        self._start_connect()

        settings = dict(ENABLE_OAUTH_SETTINGS,
                        OAuth2Session=MagicMock(return_value=mock_session))
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.get(reverse('oauth_callback'),
                                   {'code': 'abc', 'state': 'xyz'})

        self.assertEqual(200, resp.status_code)
        self.assertFalse(SocialAuthUser.objects.filter(
            username=self.user.username, provider='oauth').exists())

    @patch.object(SocialAuthUser.objects, 'add', return_value=None)
    def test_oauth_callback_connect_reports_binding_failure(self, mock_add):
        mock_session = self._mock_callback_session(
            {'email': 'oauth@example.com'})
        self._start_connect()

        settings = dict(ENABLE_OAUTH_SETTINGS,
                        OAuth2Session=MagicMock(return_value=mock_session))
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.get(reverse('oauth_callback'),
                                   {'code': 'abc', 'state': 'xyz'})

        self.assertEqual(200, resp.status_code)
        mock_add.assert_called_once_with(
            self.user.username, 'oauth', 'oauth@example.com')
