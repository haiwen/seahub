from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.urls import reverse

import seahub.oauth.views as oauth_views
from seahub.auth.models import SocialAuthUser
from seahub.base.accounts import UNUSABLE_PASSWORD, User
from seahub.options.models import UserOptions
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

    def _disconnect(self):
        with patch.dict(oauth_views.__dict__, ENABLE_OAUTH_SETTINGS):
            return self.client.post(reverse('oauth_disconnect') + '?next=/')

    def test_oauth_disconnect_removes_binding_and_marks_unbind(self):
        SocialAuthUser.objects.add(self.user.username, 'oauth', 'some-uid')

        resp = self._disconnect()

        self.assertEqual(302, resp.status_code)
        self.assertFalse(SocialAuthUser.objects.filter(
            username=self.user.username, provider='oauth').exists())
        self.assertEqual(
            oauth_views._oauth_uid_hash('some-uid'),
            UserOptions.objects.get_user_option(
                self.user.username, oauth_views.OAUTH_UNBIND_OPTION_KEY))

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

    def test_oauth_callback_does_not_relink_after_disconnect(self):
        # An explicit disconnect removes the mapping and records the identity;
        # a later OAuth login must not re-link it by email.
        uid = self.user.username
        SocialAuthUser.objects.add(self.user.username, 'oauth', uid)
        self._disconnect()

        session = self.client.session
        session['oauth_state'] = 'xyz'
        session['oauth_redirect'] = '/profile/'
        session.save()

        mock_session = self._mock_callback_session({'email': uid})
        settings = dict(ENABLE_OAUTH_SETTINGS,
                        OAuth2Session=MagicMock(return_value=mock_session))
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.get(reverse('oauth_callback'),
                                   {'code': 'abc', 'state': 'xyz'})

        self.assertEqual(200, resp.status_code)
        self.assertFalse(SocialAuthUser.objects.filter(
            username=self.user.username, provider='oauth').exists())

    def test_oauth_callback_does_not_relink_ldap_uid_after_disconnect(self):
        # SSO_LDAP_USE_SAME_UID must not restore an identity that was
        # explicitly disconnected.
        uid = 'shared-uid'
        SocialAuthUser.objects.add(self.user.username, 'ldap', uid)
        SocialAuthUser.objects.add(self.user.username, 'oauth', uid)
        self._disconnect()

        session = self.client.session
        session['oauth_state'] = 'xyz'
        session['oauth_redirect'] = '/profile/'
        session.save()

        mock_session = self._mock_callback_session({'uid': uid})
        settings = dict(ENABLE_OAUTH_SETTINGS,
                        OAUTH_ATTRIBUTE_MAP={'uid': (True, 'uid')},
                        SSO_LDAP_USE_SAME_UID=True,
                        OAuth2Session=MagicMock(return_value=mock_session))
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.get(reverse('oauth_callback'),
                                   {'code': 'abc', 'state': 'xyz'})

        self.assertEqual(200, resp.status_code)
        self.assertFalse(SocialAuthUser.objects.filter(
            username=self.user.username, provider='oauth').exists())

    def test_oauth_callback_connect_clears_unbind_marker(self):
        uid = 'oauth@example.com'
        SocialAuthUser.objects.add(self.user.username, 'oauth', uid)
        self._disconnect()
        self.assertTrue(oauth_views._oauth_identity_disconnected(uid))

        mock_session = self._mock_callback_session({'email': uid})
        self._start_connect()

        settings = dict(ENABLE_OAUTH_SETTINGS,
                        OAuth2Session=MagicMock(return_value=mock_session))
        with patch.dict(oauth_views.__dict__, settings):
            resp = self.client.get(reverse('oauth_callback'),
                                   {'code': 'abc', 'state': 'xyz'})

        self.assertEqual(302, resp.status_code)
        self.assertIsNone(UserOptions.objects.get_user_option(
            self.user.username, oauth_views.OAUTH_UNBIND_OPTION_KEY))
