# Copyright (c) 2012-2016 Seafile Ltd.
from django.test import SimpleTestCase, RequestFactory
from django.http import HttpResponse
from django.core.exceptions import ImproperlyConfigured
from unittest.mock import Mock, patch, MagicMock
from types import SimpleNamespace

from seahub.auth.middleware import (
    AuthenticationMiddleware,
    LazyUser,
    SeafileRemoteUserMiddleware,
)


def make_get_response():
    return Mock(return_value=HttpResponse('OK'))


# ======================================================================
# AuthenticationMiddleware
# ======================================================================

class AuthenticationMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.get_response = make_get_response()
        self.middleware = AuthenticationMiddleware(self.get_response)
        self.factory = RequestFactory()

    def _make_request(self, user=None):
        request = self.factory.get('/')
        request.session = {}
        request.user = user or Mock(is_authenticated=False, is_active=True)
        return request

    def test_missing_session_raises_assertion(self):
        request = self.factory.get('/')
        with self.assertRaises(AssertionError):
            self.middleware(request)

    def test_sets_lazy_user_descriptor(self):
        request = self._make_request()
        self.middleware(request)
        self.assertIsInstance(request.__class__.__dict__['user'], LazyUser)

    def test_calls_get_response(self):
        request = self._make_request()
        self.middleware(request)
        self.get_response.assert_called_once_with(request)

    def test_returns_get_response_result(self):
        request = self._make_request()
        response = self.middleware(request)
        self.assertEqual(response, self.get_response.return_value)

    def test_clears_session_for_inactive_authenticated_user(self):
        user = Mock(is_authenticated=True, is_active=False)
        request = self._make_request(user=user)
        request.session = Mock()
        self.middleware(request)
        request.session.clear.assert_called_once()
        request.session.delete.assert_called_once()

    def test_does_not_clear_session_for_active_authenticated_user(self):
        user = Mock(is_authenticated=True, is_active=True)
        request = self._make_request(user=user)
        request.session = Mock()
        self.middleware(request)
        request.session.clear.assert_not_called()
        request.session.delete.assert_not_called()

    def test_does_not_clear_session_for_anonymous_user(self):
        user = Mock(is_authenticated=False)
        request = self._make_request(user=user)
        request.session = Mock()
        self.middleware(request)
        request.session.clear.assert_not_called()


# ======================================================================
# SeafileRemoteUserMiddleware
# ======================================================================

class SeafileRemoteUserMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.get_response = make_get_response()
        self.factory = RequestFactory()

    def _make_middleware(self, **kwargs):
        mw = SeafileRemoteUserMiddleware(self.get_response)
        for k, v in kwargs.items():
            setattr(mw, k, v)
        return mw

    def _make_request(self, path='/other/', user=None, meta=None):
        request = self.factory.get(path)
        request.session = {}
        request.user = user or Mock(is_authenticated=False)
        request.META = meta or {}
        return request

    def test_passes_through_non_protected_path(self):
        mw = self._make_middleware(protected_paths=['sso'])
        request = self._make_request(path='/home/')
        request.user = Mock(is_authenticated=False)
        mw(request)
        self.get_response.assert_called_once_with(request)

    def test_raises_if_no_user_attribute(self):
        mw = self._make_middleware(protected_paths=['sso'])
        request = SimpleNamespace(
            path='/sso/',
            session={},
            META={'HTTP_REMOTE_USER': 'alice'},
        )
        # Do not set request.user.
        with self.assertRaises(ImproperlyConfigured):
            mw(request)

    # ---- header missing + force_logout_if_no_header = True -> pass through ---

    @patch('seahub.auth.middleware.auth')
    def test_passes_through_when_header_missing(self, mock_auth):
        mw = self._make_middleware(
            protected_paths=['sso'],
            header='HTTP_REMOTE_USER',
            force_logout_if_no_header=False,
        )
        request = self._make_request(path='/sso/')
        mw(request)
        self.get_response.assert_called_once_with(request)

    # ---- authenticated user with matching username -> set remote_user_authentication ---

    @patch.object(SeafileRemoteUserMiddleware, '_set_auth_cookie')
    @patch('seahub.auth.middleware.auth')
    def test_authenticated_matching_user_sets_flag(self, mock_auth, mock_set_auth_cookie):
        mw = self._make_middleware(
            protected_paths=['sso'],
            header='HTTP_REMOTE_USER',
            remote_user_domain='',
        )
        user = Mock(is_authenticated=True, is_staff=False, username='alice')
        user.get_username.return_value = 'alice'
        mw.clean_username = Mock(return_value='alice')

        request = self._make_request(path='/sso/', user=user,
                                     meta={'HTTP_REMOTE_USER': 'alice'})
        request.session = {mock_auth.BACKEND_SESSION_KEY: 'backend'}
        mw(request)
        self.assertTrue(getattr(request, 'remote_user_authentication', False))
        mock_set_auth_cookie.assert_called_once()

    # ---- unauthenticated user, auth fails -> return error page without calling get_response ---

    @patch('seahub.auth.middleware.render')
    @patch('seahub.auth.middleware.auth')
    @patch('seahub.auth.middleware.settings')
    def test_unauthenticated_user_auth_failure_returns_error(
            self, mock_settings, mock_auth, mock_render):
        mock_settings.DEBUG = False
        mock_settings.REMOTE_USER_CREATE_UNKNOWN_USER = True
        mock_auth.authenticate.return_value = None

        mw = self._make_middleware(
            protected_paths=['sso'],
            header='HTTP_REMOTE_USER',
            remote_user_domain='',
        )
        request = self._make_request(
            path='/sso/',
            user=Mock(is_authenticated=False),
            meta={'HTTP_REMOTE_USER': 'unknown'},
        )
        mw(request)
        mock_render.assert_called_once()
        self.get_response.assert_not_called()

    # ---- auth succeeds -> set remote_user_authentication and call get_response ---

    @patch.object(SeafileRemoteUserMiddleware, '_set_auth_cookie')
    @patch('seahub.auth.middleware.auth')
    @patch('seahub.auth.middleware.settings')
    def test_authenticated_user_sets_flag_and_calls_get_response(
            self, mock_settings, mock_auth, mock_set_auth_cookie):
        mock_settings.DEBUG = False
        user = Mock(is_active=True, username='alice')
        mock_auth.authenticate.return_value = user

        mw = self._make_middleware(
            protected_paths=['sso'],
            header='HTTP_REMOTE_USER',
            remote_user_domain='',
        )
        request = self._make_request(
            path='/sso/',
            user=Mock(is_authenticated=False),
            meta={'HTTP_REMOTE_USER': 'alice'},
        )
        mw(request)
        self.assertTrue(getattr(request, 'remote_user_authentication', False))
        self.get_response.assert_called_once_with(request)
        mock_set_auth_cookie.assert_called_once()
