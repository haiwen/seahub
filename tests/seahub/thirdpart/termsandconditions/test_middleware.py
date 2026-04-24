"""Tests for thirdpart/termsandconditions/middleware.py"""
from django.test import SimpleTestCase, RequestFactory
from django.http import HttpResponse, HttpResponseRedirect
from unittest.mock import Mock, patch, call

from termsandconditions.middleware import (
    TermsAndConditionsRedirectMiddleware,
    is_path_protected,
)


def dummy_get_response(request):
    return HttpResponse('OK')


# ======================================================================
# is_path_protected helper
# ======================================================================

class IsPathProtectedTest(SimpleTestCase):

    def test_excluded_prefix_not_protected(self):
        self.assertFalse(is_path_protected('/admin/users/'))
        self.assertFalse(is_path_protected('/terms/accept/'))
        self.assertFalse(is_path_protected('/static/app.js'))
        self.assertFalse(is_path_protected('/api2/repos/'))

    def test_excluded_exact_url_not_protected(self):
        self.assertFalse(is_path_protected('/accounts/logout/'))
        self.assertFalse(is_path_protected('/termsrequired/'))

    def test_regular_path_is_protected(self):
        self.assertTrue(is_path_protected('/home/'))
        self.assertTrue(is_path_protected('/secure/'))
        self.assertTrue(is_path_protected('/dashboard/'))


# ======================================================================
# TermsAndConditionsRedirectMiddleware
# ======================================================================

class TermsAndConditionsRedirectMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def _make_request(self, path='/home/', authenticated=True):
        request = self.factory.get(path)
        request.user = Mock(is_authenticated=authenticated)
        request.META['PATH_INFO'] = path
        return request

    @patch('termsandconditions.middleware.config')
    def test_passes_through_when_feature_disabled(self, mock_config):
        mock_config.ENABLE_TERMS_AND_CONDITIONS = False
        get_response = Mock(return_value=HttpResponse())
        mw = TermsAndConditionsRedirectMiddleware(get_response)
        request = self._make_request()
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('termsandconditions.middleware.config')
    def test_passes_through_for_anonymous_user(self, mock_config):
        mock_config.ENABLE_TERMS_AND_CONDITIONS = True
        get_response = Mock(return_value=HttpResponse())
        mw = TermsAndConditionsRedirectMiddleware(get_response)
        request = self._make_request(authenticated=False)
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('termsandconditions.middleware.config')
    def test_passes_through_for_excluded_path(self, mock_config):
        mock_config.ENABLE_TERMS_AND_CONDITIONS = True
        get_response = Mock(return_value=HttpResponse())
        mw = TermsAndConditionsRedirectMiddleware(get_response)
        request = self._make_request(path='/terms/accept/')
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('termsandconditions.middleware.TermsAndConditions')
    @patch('termsandconditions.middleware.config')
    def test_passes_through_when_user_has_agreed_to_all_terms(
            self, mock_config, mock_terms):
        mock_config.ENABLE_TERMS_AND_CONDITIONS = True
        term = Mock()
        mock_terms.get_active_list.return_value = [term]
        mock_terms.agreed_to_latest.return_value = True

        get_response = Mock(return_value=HttpResponse())
        mw = TermsAndConditionsRedirectMiddleware(get_response)
        request = self._make_request(path='/home/')
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('termsandconditions.middleware.redirect_to_terms_accept')
    @patch('termsandconditions.middleware.TermsAndConditions')
    @patch('termsandconditions.middleware.config')
    def test_redirects_when_user_has_not_agreed(
            self, mock_config, mock_terms, mock_redirect):
        mock_config.ENABLE_TERMS_AND_CONDITIONS = True
        term = Mock()
        mock_terms.get_active_list.return_value = [term]
        mock_terms.agreed_to_latest.return_value = False
        mock_redirect.return_value = HttpResponseRedirect('/terms/accept/')

        get_response = Mock(return_value=HttpResponse())
        mw = TermsAndConditionsRedirectMiddleware(get_response)
        request = self._make_request(path='/home/')
        response = mw(request)

        mock_redirect.assert_called_once_with('/home/', term)
        self.assertIsInstance(response, HttpResponseRedirect)
        get_response.assert_not_called()

    @patch('termsandconditions.middleware.TermsAndConditions')
    @patch('termsandconditions.middleware.config')
    def test_passes_through_when_no_active_terms(
            self, mock_config, mock_terms):
        mock_config.ENABLE_TERMS_AND_CONDITIONS = True
        mock_terms.get_active_list.return_value = []  # No active terms.

        get_response = Mock(return_value=HttpResponse())
        mw = TermsAndConditionsRedirectMiddleware(get_response)
        request = self._make_request(path='/home/')
        mw(request)
        get_response.assert_called_once_with(request)
