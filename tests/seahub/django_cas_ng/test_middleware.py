"""Tests for seahub/django_cas_ng/middleware.py"""
from django.test import SimpleTestCase, RequestFactory
from django.http import HttpResponse, HttpResponseRedirect
from django.core.exceptions import PermissionDenied
from unittest.mock import Mock, patch

from seahub.django_cas_ng.middleware import CASMiddleware


def dummy_get_response(request):
    return HttpResponse('OK')


class CASMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = CASMiddleware(dummy_get_response)

    def _make_request(self, path='/'):
        request = self.factory.get(path)
        request.user = Mock(is_authenticated=True, is_staff=True)
        request.session = {}
        return request

    def test_raises_assertion_if_no_user_attribute(self):
        request = self.factory.get('/')
        # request.user is intentionally missing.
        with self.assertRaises(AssertionError):
            self.middleware(request)

    def test_passes_through_authenticated_request(self):
        request = self._make_request()
        response = self.middleware(request)
        self.assertEqual(response.status_code, 200)

    # ---- process_view: non-admin path -> None (continue normal handling) ----

    @patch('seahub.django_cas_ng.middleware.settings')
    def test_process_view_non_admin_path_returns_none(self, mock_settings):
        mock_settings.CAS_ADMIN_PREFIX = '/admin/'
        request = self._make_request(path='/home/')
        result = self.middleware.process_view(request, lambda r: None, [], {})
        self.assertIsNone(result)

    # ---- process_view: authenticated staff -> None (allow through) ----

    @patch('seahub.django_cas_ng.middleware.settings')
    def test_process_view_admin_staff_passes(self, mock_settings):
        mock_settings.CAS_ADMIN_PREFIX = '/admin/'
        request = self._make_request(path='/admin/')
        result = self.middleware.process_view(request, lambda r: None, [], {})
        self.assertIsNone(result)

    # ---- process_view: authenticated non-staff -> PermissionDenied ----

    @patch('seahub.django_cas_ng.middleware.settings')
    def test_process_view_admin_non_staff_raises_permission_denied(
            self, mock_settings):
        mock_settings.CAS_ADMIN_PREFIX = '/admin/'
        request = self._make_request(path='/admin/')
        request.user.is_staff = False
        with self.assertRaises(PermissionDenied):
            self.middleware.process_view(request, lambda r: None, [], {})

    # ---- process_view: unauthenticated admin path -> redirect to CAS login ----

    @patch('seahub.django_cas_ng.middleware.reverse', return_value='/cas/login/')
    @patch('seahub.django_cas_ng.middleware.settings')
    def test_process_view_unauthenticated_admin_redirects(self, mock_settings, mock_reverse):
        mock_settings.CAS_ADMIN_PREFIX = '/admin/'
        request = self._make_request(path='/admin/')
        request.user.is_authenticated = False
        result = self.middleware.process_view(request, lambda r: None, [], {})
        self.assertIsInstance(result, HttpResponseRedirect)
        self.assertTrue(result.url.startswith('/cas/login/'))
