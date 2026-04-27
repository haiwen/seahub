# Copyright (c) 2012-2016 Seafile Ltd.
from django.test import SimpleTestCase, RequestFactory, override_settings
from django.http import HttpResponse
from unittest.mock import Mock, patch, MagicMock

from seahub.base.middleware import (
    BaseMiddleware,
    InfobarMiddleware,
    ForcePasswdChangeMiddleware,
    UserAgentMiddleWare,
)


def dummy_get_response(request):
    return HttpResponse('OK')


# ======================================================================
# BaseMiddleware
# ======================================================================

class BaseMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def _make_request(self, username=''):
        request = self.factory.get('/')
        request.user = Mock(username=username, org=None)
        return request

    @patch('seahub.base.middleware.CLOUD_MODE', False)
    def test_passes_through_when_cloud_mode_off(self):
        mw = BaseMiddleware(dummy_get_response)
        request = self._make_request()
        response = mw(request)
        self.assertEqual(response.status_code, 200)

    @patch('seahub.base.middleware.MULTI_TENANCY', False)
    @patch('seahub.base.middleware.CLOUD_MODE', True)
    def test_passes_through_when_multi_tenancy_off(self):
        mw = BaseMiddleware(dummy_get_response)
        request = self._make_request()
        response = mw(request)
        self.assertEqual(response.status_code, 200)

    @patch('seahub.base.middleware.ccnet_api')
    @patch('seahub.base.middleware.MULTI_TENANCY', True)
    @patch('seahub.base.middleware.CLOUD_MODE', True)
    def test_passes_through_when_no_org(self, mock_ccnet):
        mock_ccnet.get_orgs_by_user.return_value = []
        mw = BaseMiddleware(dummy_get_response)
        request = self._make_request(username='user@test.com')
        response = mw(request)
        self.assertIsNone(request.user.org)
        self.assertEqual(response.status_code, 200)

    @patch('seahub.base.middleware.OrgSettings')
    @patch('seahub.base.middleware.ccnet_api')
    @patch('seahub.base.middleware.MULTI_TENANCY', True)
    @patch('seahub.base.middleware.CLOUD_MODE', True)
    def test_passes_through_when_org_is_active(self, mock_ccnet, mock_org_settings):
        org = Mock()
        mock_ccnet.get_orgs_by_user.return_value = [org]
        mock_org_settings.objects.get_is_active_by_org.return_value = True

        mw = BaseMiddleware(dummy_get_response)
        request = self._make_request(username='user@test.com')
        response = mw(request)
        self.assertEqual(response.status_code, 200)

    @patch('seahub.base.middleware.render_error', return_value=HttpResponse('ERR'))
    @patch('seahub.base.middleware.logout')
    @patch('seahub.base.middleware.OrgSettings')
    @patch('seahub.base.middleware.ccnet_api')
    @patch('seahub.base.middleware.MULTI_TENANCY', True)
    @patch('seahub.base.middleware.CLOUD_MODE', True)
    def test_logs_out_and_renders_error_when_org_inactive(
            self, mock_ccnet, mock_org_settings, mock_logout, mock_render_error):
        org = Mock(org_id=1, org_name='TestOrg', is_staff=False)
        mock_ccnet.get_orgs_by_user.return_value = [org]
        mock_org_settings.objects.get_is_active_by_org.return_value = False

        mw = BaseMiddleware(dummy_get_response)
        request = self._make_request(username='user@test.com')
        request.path = '/home/'
        response = mw(request)

        mock_logout.assert_called_once_with(request)
        mock_render_error.assert_called_once()
        self.assertEqual(response.status_code, 200)  # render_error returns 200


# ======================================================================
# InfobarMiddleware
# ======================================================================

class InfobarMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def _make_request(self, path='/', ajax=False):
        request = self.factory.get(path)
        if ajax:
            request.headers = {'x-requested-with': 'XMLHttpRequest'}
        else:
            request.headers = {}
        request.COOKIES = {}
        return request

    def test_skips_ajax_requests(self):
        get_response = Mock(return_value=HttpResponse())
        mw = InfobarMiddleware(get_response)
        request = self._make_request(ajax=True)
        mw(request)
        get_response.assert_called_once_with(request)
        self.assertFalse(hasattr(request, 'cur_note'))

    def test_skips_api_requests(self):
        get_response = Mock(return_value=HttpResponse())
        mw = InfobarMiddleware(get_response)
        request = self._make_request(path='/api2/ping/')
        mw(request)
        self.assertFalse(hasattr(request, 'cur_note'))

    @patch('seahub.base.middleware.refresh_cache')
    @patch('seahub.base.middleware.cache')
    @patch('seahub.base.middleware.Notification')
    def test_sets_cur_note_to_none_when_no_notification(
            self, mock_notif, mock_cache, mock_refresh_cache):
        mock_cache.get.return_value = None
        mock_notif.objects.all.return_value.filter.return_value = []

        mw = InfobarMiddleware(dummy_get_response)
        request = self._make_request()
        mw(request)
        self.assertIsNone(request.cur_note)

    @patch('seahub.base.middleware.cache')
    @patch('seahub.base.middleware.Notification')
    def test_sets_cur_note_when_notification_present(
            self, mock_notif, mock_cache):
        note = Mock(id=42)
        mock_cache.get.return_value = [note]

        mw = InfobarMiddleware(dummy_get_response)
        request = self._make_request()
        mw(request)
        self.assertEqual(request.cur_note, note)

    @patch('seahub.base.middleware.cache')
    @patch('seahub.base.middleware.Notification')
    def test_sets_cur_note_none_when_cookie_dismissed(
            self, mock_notif, mock_cache):
        note = Mock(id=42)
        mock_cache.get.return_value = [note]

        mw = InfobarMiddleware(dummy_get_response)
        request = self._make_request()
        request.COOKIES = {'info_id': '42'}
        mw(request)
        self.assertIsNone(request.cur_note)


# ======================================================================
# ForcePasswdChangeMiddleware
# ======================================================================

class ForcePasswdChangeMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def _make_request(self, path='/', force_change=False):
        request = self.factory.get(path)
        request.session = {'force_passwd_change': force_change}
        return request

    def test_passes_through_when_no_force_flag(self):
        get_response = Mock(return_value=HttpResponse())
        mw = ForcePasswdChangeMiddleware(get_response)
        request = self._make_request(path='/home/files/', force_change=False)
        mw(request)
        get_response.assert_called_once_with(request)

    def test_passes_through_safe_path_even_with_force_flag(self):
        get_response = Mock(return_value=HttpResponse())
        mw = ForcePasswdChangeMiddleware(get_response)
        request = self._make_request(path='/accounts/login/', force_change=True)
        mw(request)
        get_response.assert_called_once_with(request)

    def test_redirects_blacklisted_path_when_force_flag_set(self):
        get_response = Mock(return_value=HttpResponse())
        mw = ForcePasswdChangeMiddleware(get_response)
        request = self._make_request(path='/home/files/', force_change=True)
        response = mw(request)
        self.assertEqual(response.status_code, 302)
        get_response.assert_not_called()


# ======================================================================
# UserAgentMiddleWare
# ======================================================================

class UserAgentMiddleWareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()
        self.mw = UserAgentMiddleWare(dummy_get_response)

    def _make_request(self, user_agent=''):
        request = self.factory.get('/')
        if user_agent:
            request.META['HTTP_USER_AGENT'] = user_agent
        return request

    def test_desktop_browser_not_mobile_not_tablet(self):
        request = self._make_request(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 Chrome/120.0 Safari/537.36'
        )
        self.mw(request)
        self.assertFalse(request.is_mobile)
        self.assertFalse(request.is_tablet)

    def test_android_phone_detected_as_mobile(self):
        request = self._make_request(
            'Mozilla/5.0 (Linux; Android 10; Pixel 3) '
            'AppleWebKit/537.36 Mobile Safari/537.36'
        )
        self.mw(request)
        self.assertTrue(request.is_mobile)
        self.assertFalse(request.is_tablet)

    def test_ipad_detected_as_tablet_not_mobile(self):
        request = self._make_request(
            'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) '
            'AppleWebKit/605.1 Mobile/15A372 Safari/604.1'
        )
        self.mw(request)
        self.assertTrue(request.is_tablet)

    def test_android_tablet_no_mobile_keyword(self):
        request = self._make_request(
            'Mozilla/5.0 (Linux; Android 9; SM-T510) '
            'AppleWebKit/537.36 Safari/537.36'
        )
        self.mw(request)
        self.assertTrue(request.is_tablet)

    def test_no_user_agent_header(self):
        request = self.factory.get('/')
        self.mw(request)
        self.assertFalse(request.is_mobile)
        self.assertFalse(request.is_tablet)
