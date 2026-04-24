# Copyright (c) 2012-2016 Seafile Ltd.
from django.test import SimpleTestCase, RequestFactory
from django.http import HttpResponse, HttpResponseRedirect
from django.core.exceptions import ImproperlyConfigured
from unittest.mock import Mock, patch

from seahub.krb5_auth.middleware import RemoteKrbMiddleware


def dummy_get_response(request):
    return HttpResponse('OK')


class RemoteKrbMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def _make_request(self, meta=None, user=None):
        request = self.factory.get('/')
        request.user = user or Mock(is_authenticated=False)
        request.META = meta or {}
        request.session = {}
        return request

    def test_raises_if_no_user_attribute(self):
        mw = RemoteKrbMiddleware(dummy_get_response)
        request = self.factory.get('/')
        request.META = {'REMOTE_USER': 'alice'}
        with self.assertRaises(ImproperlyConfigured):
            mw(request)

    def test_passes_through_when_remote_user_header_missing(self):
        get_response = Mock(return_value=HttpResponse())
        mw = RemoteKrbMiddleware(get_response)
        request = self._make_request()  # no REMOTE_USER in META
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('seahub.krb5_auth.middleware.auth')
    @patch('seahub.krb5_auth.middleware.settings')
    def test_passes_through_and_sets_flag_for_authenticated_matching_user(
            self, mock_settings, mock_auth):
        mock_settings.KRB5_USERNAME_SUFFIX = ''
        mock_settings.LOGIN_URL = '/login/'

        user = Mock(is_authenticated=True, username='alice')
        mw = RemoteKrbMiddleware(dummy_get_response)
        mw.clean_username = Mock(return_value='alice')

        request = self._make_request(
            meta={'REMOTE_USER': 'alice'}, user=user)
        request.session = {mock_auth.BACKEND_SESSION_KEY: 'backend'}

        mw(request)
        self.assertTrue(request.krb5_login)

    @patch('seahub.krb5_auth.middleware.auth')
    @patch('seahub.krb5_auth.middleware.settings')
    def test_logs_out_when_authenticated_user_mismatch(
            self, mock_settings, mock_auth):
        mock_settings.KRB5_USERNAME_SUFFIX = ''
        mock_settings.LOGIN_URL = '/login/'

        user = Mock(is_authenticated=True, username='alice')
        mw = RemoteKrbMiddleware(dummy_get_response)
        mw.clean_username = Mock(return_value='bob')  # header says bob

        request = self._make_request(
            meta={'REMOTE_USER': 'bob'}, user=user)
        request.session = {mock_auth.BACKEND_SESSION_KEY: 'backend'}

        mw(request)
        mock_auth.logout.assert_called_once_with(request)

    @patch('seahub.krb5_auth.middleware.auth')
    @patch('seahub.krb5_auth.middleware.settings')
    def test_authenticates_and_logs_in_new_user(
            self, mock_settings, mock_auth):
        mock_settings.KRB5_USERNAME_SUFFIX = ''
        mock_settings.LOGIN_URL = '/login/'

        new_user = Mock(is_active=True)
        mock_auth.authenticate.return_value = new_user

        get_response = Mock(return_value=HttpResponse())
        mw = RemoteKrbMiddleware(get_response)

        request = self._make_request(
            meta={'REMOTE_USER': 'alice'},
            user=Mock(is_authenticated=False))
        mw(request)

        mock_auth.login.assert_called_once_with(request, new_user)
        self.assertTrue(request.krb5_login)
        get_response.assert_called_once_with(request)

    @patch('seahub.krb5_auth.middleware.auth')
    @patch('seahub.krb5_auth.middleware.settings')
    def test_redirects_when_new_user_auth_fails(
            self, mock_settings, mock_auth):
        mock_settings.KRB5_USERNAME_SUFFIX = ''
        mock_settings.LOGIN_URL = '/login/'
        mock_auth.authenticate.return_value = None

        get_response = Mock(return_value=HttpResponse())
        mw = RemoteKrbMiddleware(get_response)

        request = self._make_request(
            meta={'REMOTE_USER': 'alice'},
            user=Mock(is_authenticated=False))
        response = mw(request)

        self.assertIsInstance(response, HttpResponseRedirect)
        self.assertEqual(response.url, '/login/')
        get_response.assert_not_called()

    @patch('seahub.krb5_auth.middleware.auth')
    @patch('seahub.krb5_auth.middleware.settings')
    def test_applies_username_suffix_when_configured(
            self, mock_settings, mock_auth):
        mock_settings.KRB5_USERNAME_SUFFIX = '@example.com'
        mock_settings.LOGIN_URL = '/login/'
        mock_auth.authenticate.return_value = None

        mw = RemoteKrbMiddleware(dummy_get_response)
        request = self._make_request(
            meta={'REMOTE_USER': 'alice@REALM'},
            user=Mock(is_authenticated=False))
        mw(request)

        mock_auth.authenticate.assert_called_once_with(
            remote_user='alice@example.com')
