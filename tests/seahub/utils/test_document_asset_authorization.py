import copy
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.http import HttpResponse

from seahub.share import models
from seahub.utils import document_assets as assets


class PasswordSessionVersionTest(unittest.TestCase):
    def setUp(self):
        self.share = SimpleNamespace(token='share', password='old-password-hash')
        self.request = SimpleNamespace(session={})

    def test_password_change_invalidates_session(self):
        with patch.object(models, 'FileShare') as shares:
            shares.objects.filter.return_value.first.return_value = self.share
            models.set_share_link_access(self.request, 'share')
            self.assertTrue(models.check_share_link_access(self.request, 'share'))
            self.share.password = 'new-password-hash'
            self.assertFalse(models.check_share_link_access(self.request, 'share'))
            models.set_share_link_access(self.request, 'share')
            self.assertTrue(models.check_share_link_access(self.request, 'share'))

    def test_legacy_boolean_session_is_rejected(self):
        self.request.session['visited_fs_share'] = True
        self.assertFalse(models.check_share_link_access(self.request, 'share'))

    def test_deleted_share_is_rejected(self):
        with patch.object(models, 'FileShare') as shares:
            shares.objects.filter.return_value.first.return_value = self.share
            models.set_share_link_access(self.request, 'share')
            shares.objects.filter.return_value.first.return_value = None
            self.assertFalse(models.check_share_link_access(self.request, 'share'))

    def test_upload_link_has_separate_versioned_session(self):
        with patch.object(models, 'UploadLinkShare') as shares:
            shares.objects.filter.return_value.first.return_value = self.share
            models.set_share_link_access(self.request, 'share', is_upload_link=True)
            self.assertTrue(models.check_share_link_access(self.request, 'share', is_upload_link=True))
            self.assertNotIn('visited_fs_share', self.request.session)
            self.share.password = 'new-password-hash'
            self.assertFalse(models.check_share_link_access(self.request, 'share', is_upload_link=True))


class DocumentUploadAuthorizationTest(unittest.TestCase):
    def setUp(self):
        self.share = Mock(token='share', password='password-hash', user_scope='all_users',
                          authed_details='{}', path='/document.sdoc', repo_id='repo')
        self.share.is_dir_share_link.return_value = False
        self.share.get_permissions.return_value = {'can_edit': True}
        self.request = SimpleNamespace(user=SimpleNamespace(username='', is_authenticated=False), session={})
        self.payload = {'permission': 'rw', 'file_uuid': 'doc', 'username': 'guest',
                        'share_access': assets.get_share_upload_access(self.request, self.share, self.share.path)}
        self.uuid_map = SimpleNamespace(repo_id='repo', parent_path='/', filename='document.sdoc')
        self.api = Mock()
        self.api.get_repo_status.return_value = 0
        self.api.get_file_id_by_path.return_value = 'object'

    def allowed(self, payload=None, login_required=False):
        with patch('seaserv.seafile_api', self.api), \
                patch.object(models, 'FileShare') as shares, \
                patch('seahub.settings.SHARE_LINK_LOGIN_REQUIRED', login_required):
            shares.objects.get_valid_file_link_by_token.return_value = self.share
            return assets.can_upload_document_asset(
                payload or self.payload, self.uuid_map, lambda repo, path: 'doc')

    def test_valid_share_upload(self):
        self.assertTrue(self.allowed())

    def test_deleted_or_expired_share(self):
        self.share = None
        self.assertFalse(self.allowed())

    def test_downgraded_share(self):
        self.share.get_permissions.return_value = {'can_edit': False}
        self.assertFalse(self.allowed())

    def test_changed_password(self):
        self.share.password = 'changed-password'
        self.assertFalse(self.allowed())

    def test_changed_scope(self):
        self.share.authed_details = '{"authed_users": ["other"]}'
        self.assertFalse(self.allowed())

    def test_moved_share_target(self):
        self.share.path = '/other.sdoc'
        self.assertFalse(self.allowed())

    def test_readonly_repository(self):
        self.api.get_repo_status.return_value = 1
        self.assertFalse(self.allowed())

    def test_directory_boundary(self):
        self.share.is_dir_share_link.return_value = True
        self.share.path = '/shared/'
        payload = copy.deepcopy(self.payload)
        payload['share_access']['path'] = '/shared-other/document.sdoc'
        self.assertFalse(self.allowed(payload))
        payload['share_access']['path'] = '/shared/document.sdoc'
        self.assertTrue(self.allowed(payload))

    def test_login_user_permission_is_rechecked(self):
        payload = {'permission': 'rw', 'username': 'user', 'file_uuid': 'doc'}
        self.api.check_permission_by_path.return_value = None
        self.assertFalse(self.allowed(payload))
        self.api.check_permission_by_path.return_value = 'r'
        self.assertFalse(self.allowed(payload))
        self.api.check_permission_by_path.return_value = 'rw'
        self.assertTrue(self.allowed(payload))

    def test_legacy_guest_token_cannot_upload(self):
        self.api.check_permission_by_path.return_value = None
        self.assertFalse(self.allowed({'permission': 'rw', 'username': 'old-guest', 'file_uuid': 'doc'}))

    def test_login_required_rejects_anonymous_share_token(self):
        self.assertFalse(self.allowed(login_required=True))
        self.request.user = SimpleNamespace(username='user', is_authenticated=True)
        self.payload['share_access'] = assets.get_share_upload_access(self.request, self.share, self.share.path)
        self.assertTrue(self.allowed(login_required=True))

    def test_email_share_requires_verified_allowed_email(self):
        self.share.user_scope = 'specific_emails'
        self.share.authed_details = '{"authed_emails": ["allowed@example.com"]}'
        self.payload['share_access'] = assets.get_share_upload_access(self.request, self.share, self.share.path)
        self.assertFalse(self.allowed())
        self.request.session['link_authed_email_share'] = 'allowed@example.com'
        self.payload['share_access'] = assets.get_share_upload_access(self.request, self.share, self.share.path)
        self.assertTrue(self.allowed())


class SvgResponseSecurityTest(unittest.TestCase):
    def test_svg_is_sandboxed_without_scripts_or_same_origin(self):
        response = assets.secure_svg_response(HttpResponse(content_type='image/svg+xml'))
        self.assertIn("default-src 'none'", response['Content-Security-Policy'])
        self.assertIn('sandbox;', response['Content-Security-Policy'])
        self.assertNotIn('allow-scripts', response['Content-Security-Policy'])
        self.assertNotIn('allow-same-origin', response['Content-Security-Policy'])
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
