# Copyright (c) 2012-2016 Seafile Ltd.
from django.test import SimpleTestCase, RequestFactory
from django.http import HttpResponse, HttpResponseRedirect
from unittest.mock import Mock, patch, PropertyMock

from seahub.two_factor.middleware import OTPMiddleware, ForceTwoFactorAuthMiddleware


def dummy_get_response(request):
    return HttpResponse('OK')


# ======================================================================
# OTPMiddleware
# ======================================================================

class OTPMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def _make_request(self, user=None):
        request = self.factory.get('/')
        request.user = user or Mock(is_anonymous=False, email='u@test.com')
        request.session = {}
        return request

    @patch('seahub.two_factor.middleware.config')
    def test_passes_through_when_2fa_disabled(self, mock_config):
        mock_config.ENABLE_TWO_FACTOR_AUTH = False
        get_response = Mock(return_value=HttpResponse())
        mw = OTPMiddleware(get_response)
        request = self._make_request()
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('seahub.two_factor.middleware.config')
    def test_passes_through_when_no_user(self, mock_config):
        mock_config.ENABLE_TWO_FACTOR_AUTH = True
        get_response = Mock(return_value=HttpResponse())
        mw = OTPMiddleware(get_response)
        request = self.factory.get('/')
        # Do not set request.user.
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('seahub.two_factor.middleware.config')
    def test_sets_otp_device_none_for_anonymous_user(self, mock_config):
        mock_config.ENABLE_TWO_FACTOR_AUTH = True
        mw = OTPMiddleware(dummy_get_response)
        request = self._make_request(user=Mock(is_anonymous=True))
        mw(request)
        self.assertIsNone(request.user.otp_device)

    @patch('seahub.two_factor.middleware.Device')
    @patch('seahub.two_factor.middleware.DEVICE_ID_SESSION_KEY', 'otp_device_id')
    @patch('seahub.two_factor.middleware.config')
    def test_sets_otp_device_from_session(self, mock_config, mock_device):
        mock_config.ENABLE_TWO_FACTOR_AUTH = True
        device = Mock()
        device.user = 'u@test.com'
        mock_device.from_persistent_id.return_value = device

        mw = OTPMiddleware(dummy_get_response)
        user = Mock(is_anonymous=False, email='u@test.com')
        request = self._make_request(user=user)
        request.session = {'otp_device_id': 'totp/1'}
        mw(request)

        self.assertEqual(request.user.otp_device, device)

    @patch('seahub.two_factor.middleware.Device')
    @patch('seahub.two_factor.middleware.DEVICE_ID_SESSION_KEY', 'otp_device_id')
    @patch('seahub.two_factor.middleware.config')
    def test_clears_invalid_session_device(self, mock_config, mock_device):
        """Clear the session key when the device belongs to another user."""
        mock_config.ENABLE_TWO_FACTOR_AUTH = True
        device = Mock()
        device.user = 'other@test.com'  # Does not match the current user.
        mock_device.from_persistent_id.return_value = device

        mw = OTPMiddleware(dummy_get_response)
        user = Mock(is_anonymous=False, email='u@test.com')
        request = self._make_request(user=user)
        request.session = {'otp_device_id': 'totp/1'}
        mw(request)

        self.assertIsNone(request.user.otp_device)
        self.assertNotIn('otp_device_id', request.session)


# ======================================================================
# ForceTwoFactorAuthMiddleware
# ======================================================================

class ForceTwoFactorAuthMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def _make_request(self, path='/', user=None):
        request = self.factory.get(path)
        request.user = user or Mock(is_anonymous=False, otp_device=None)
        request.session = {}
        return request

    @patch('seahub.two_factor.middleware.config')
    def test_passes_through_when_2fa_disabled(self, mock_config):
        mock_config.ENABLE_TWO_FACTOR_AUTH = False
        get_response = Mock(return_value=HttpResponse())
        mw = ForceTwoFactorAuthMiddleware(get_response)
        request = self._make_request()
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('seahub.two_factor.middleware.config')
    def test_passes_through_for_anonymous_user(self, mock_config):
        mock_config.ENABLE_TWO_FACTOR_AUTH = True
        get_response = Mock(return_value=HttpResponse())
        mw = ForceTwoFactorAuthMiddleware(get_response)
        request = self._make_request(user=Mock(is_anonymous=True))
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('seahub.two_factor.middleware.config')
    def test_passes_through_for_non_blacklisted_path(self, mock_config):
        mock_config.ENABLE_TWO_FACTOR_AUTH = True
        get_response = Mock(return_value=HttpResponse())
        mw = ForceTwoFactorAuthMiddleware(get_response)
        request = self._make_request(path='/api2/ping/')
        request.user = Mock(is_anonymous=False, otp_device=None)
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('seahub.two_factor.middleware.config')
    def test_passes_through_when_device_verified(self, mock_config):
        mock_config.ENABLE_TWO_FACTOR_AUTH = True
        get_response = Mock(return_value=HttpResponse())
        mw = ForceTwoFactorAuthMiddleware(get_response)
        request = self._make_request(path='/home/')
        request.user = Mock(is_anonymous=False, otp_device=Mock())  # Already verified.
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('seahub.two_factor.middleware.reverse', return_value='/profile/two_factor_authentication/setup/')
    @patch('seahub.two_factor.middleware.UserOptions')
    @patch('seahub.two_factor.middleware.ENABLE_FORCE_2FA_TO_ALL_USERS', True)
    @patch('seahub.two_factor.middleware.config')
    def test_redirects_to_setup_when_force_all_users_enabled(
            self, mock_config, mock_user_opts, mock_reverse):
        mock_config.ENABLE_TWO_FACTOR_AUTH = True
        get_response = Mock(return_value=HttpResponse())
        mw = ForceTwoFactorAuthMiddleware(get_response)
        user = Mock(is_anonymous=False, otp_device=None,
                    username='u@test.com')
        request = self._make_request(path='/repo/123/', user=user)
        response = mw(request)
        self.assertIsInstance(response, HttpResponseRedirect)
        get_response.assert_not_called()

    @patch('seahub.two_factor.middleware.UserOptions')
    @patch('seahub.two_factor.middleware.ENABLE_FORCE_2FA_TO_ALL_USERS', False)
    @patch('seahub.two_factor.middleware.config')
    def test_passes_through_sso_user_even_if_force_per_user_enabled(
            self, mock_config, mock_user_opts):
        """SSO users bypass forced 2FA."""
        mock_config.ENABLE_TWO_FACTOR_AUTH = True
        mock_user_opts.objects.is_force_2fa.return_value = True
        get_response = Mock(return_value=HttpResponse())
        mw = ForceTwoFactorAuthMiddleware(get_response)
        user = Mock(is_anonymous=False, otp_device=None, username='u@test.com')
        request = self._make_request(path='/home/files/', user=user)
        request.session = {'is_sso_user': True}
        mw(request)
        get_response.assert_called_once_with(request)
