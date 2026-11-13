import unittest
from types import SimpleNamespace
from unittest.mock import patch

from seahub.views import file as file_views
from seahub.share.models import check_share_link_access_by_scope


class ShareImageScopeTest(unittest.TestCase):
    def test_login_required_rejects_before_share_lookup(self):
        request = SimpleNamespace(
            GET={'path': '/image.png', 'token': 'share'},
            user=SimpleNamespace(username='', is_authenticated=False))
        with patch.object(file_views.settings, 'SHARE_LINK_LOGIN_REQUIRED', True), \
                patch.object(file_views, 'FileShare') as shares, \
                patch.object(file_views, 'render_permission_error', return_value='denied'):
            self.assertEqual(file_views.view_media_file_via_share_link(request), 'denied')
            shares.objects.get_valid_file_link_by_token.assert_not_called()

    def test_email_scope_requires_current_allowed_email(self):
        share = SimpleNamespace(username='owner', user_scope='specific_emails',
                                token='share', authed_details='{"authed_emails": ["allowed@example.com"]}')
        request = SimpleNamespace(user=SimpleNamespace(username=''), session={})
        self.assertFalse(check_share_link_access_by_scope(request, share))
        request.session['link_authed_email_share'] = 'other@example.com'
        self.assertFalse(check_share_link_access_by_scope(request, share))
        request.session['link_authed_email_share'] = 'allowed@example.com'
        self.assertTrue(check_share_link_access_by_scope(request, share))

    def test_image_endpoint_rejects_unauthenticated_email_scope(self):
        share = SimpleNamespace(username='owner', user_scope='specific_emails', token='share',
                                authed_details='{"authed_emails": ["allowed@example.com"]}',
                                is_expired=lambda: False)
        request = SimpleNamespace(GET={'path': '/image.png', 'token': 'share'},
                                  user=SimpleNamespace(username='', is_authenticated=False), session={})
        with patch.object(file_views.settings, 'SHARE_LINK_LOGIN_REQUIRED', False), \
                patch.object(file_views, 'FileShare') as shares, \
                patch.object(file_views, 'render_error', return_value='denied'), \
                patch.object(file_views, 'check_share_link_common') as password:
            shares.objects.get_valid_file_link_by_token.return_value = share
            self.assertEqual(file_views.view_media_file_via_share_link(request), 'denied')
            password.assert_not_called()
