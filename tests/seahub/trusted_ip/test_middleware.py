# Copyright (c) 2012-2016 Seafile Ltd.
from django.test import SimpleTestCase, RequestFactory
from django.http import HttpResponse
from unittest.mock import Mock, patch
from django.http import HttpResponseForbidden

from seahub.trusted_ip.middleware import LimitIpMiddleware


def dummy_get_response(request):
    return HttpResponse('OK')


class LimitIpMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def _make_request(self, path='/'):
        request = self.factory.get(path)
        request.session = {}
        return request

    @patch('seahub.trusted_ip.middleware.ENABLE_LIMIT_IPADDRESS', False)
    def test_passes_through_when_feature_disabled(self):
        get_response = Mock(return_value=HttpResponse())
        mw = LimitIpMiddleware(get_response)
        request = self._make_request()
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('seahub.trusted_ip.middleware.TRUSTED_IP_LIST', ['1.2.3.4'])
    @patch('seahub.trusted_ip.middleware.TrustedIP')
    @patch('seahub.trusted_ip.middleware.get_remote_ip', return_value='1.2.3.4')
    @patch('seahub.trusted_ip.middleware.ENABLE_LIMIT_IPADDRESS', True)
    def test_passes_through_for_explicitly_trusted_ip(
            self, mock_get_ip, mock_trusted_ip):
        mock_trusted_ip.objects.match_ip.return_value = False  # not in DB
        get_response = Mock(return_value=HttpResponse())
        mw = LimitIpMiddleware(get_response)
        request = self._make_request()
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('seahub.trusted_ip.middleware.TRUSTED_IP_LIST', [])
    @patch('seahub.trusted_ip.middleware.TrustedIP')
    @patch('seahub.trusted_ip.middleware.get_remote_ip', return_value='9.9.9.9')
    @patch('seahub.trusted_ip.middleware.ENABLE_LIMIT_IPADDRESS', True)
    def test_passes_through_for_db_matched_ip(
            self, mock_get_ip, mock_trusted_ip):
        mock_trusted_ip.objects.match_ip.return_value = True  # in DB
        get_response = Mock(return_value=HttpResponse())
        mw = LimitIpMiddleware(get_response)
        request = self._make_request()
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('seahub.trusted_ip.middleware.render', return_value=HttpResponseForbidden())
    @patch('seahub.trusted_ip.middleware.TRUSTED_IP_LIST', [])
    @patch('seahub.trusted_ip.middleware.TrustedIP')
    @patch('seahub.trusted_ip.middleware.get_remote_ip', return_value='6.6.6.6')
    @patch('seahub.trusted_ip.middleware.ENABLE_LIMIT_IPADDRESS', True)
    def test_returns_403_html_for_untrusted_ip(
            self, mock_get_ip, mock_trusted_ip, mock_render):
        mock_trusted_ip.objects.match_ip.return_value = False
        get_response = Mock(return_value=HttpResponse())
        mw = LimitIpMiddleware(get_response)
        request = self._make_request(path='/home/')
        response = mw(request)
        self.assertEqual(response.status_code, 403)
        get_response.assert_not_called()
        mock_render.assert_called_once()

    @patch('seahub.trusted_ip.middleware.TRUSTED_IP_LIST', [])
    @patch('seahub.trusted_ip.middleware.TrustedIP')
    @patch('seahub.trusted_ip.middleware.get_remote_ip', return_value='6.6.6.6')
    @patch('seahub.trusted_ip.middleware.ENABLE_LIMIT_IPADDRESS', True)
    def test_returns_403_json_for_untrusted_ip_api_request(
            self, mock_get_ip, mock_trusted_ip):
        mock_trusted_ip.objects.match_ip.return_value = False
        get_response = Mock(return_value=HttpResponse())
        mw = LimitIpMiddleware(get_response)
        request = self._make_request(path='/api2/repos/')
        response = mw(request)
        self.assertEqual(response.status_code, 403)
        self.assertIn('application/json', response['Content-Type'])
        get_response.assert_not_called()
