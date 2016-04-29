from mock import patch

from django.core.cache import cache
from django.contrib.auth.models import AnonymousUser
from django.http import HttpResponse, Http404
from django.test import override_settings
from django.test.client import RequestFactory

from seahub.test_utils import BaseTestCase
from seahub.share.decorators import share_link_audit
from seahub.share.models import FileShare
from seahub.utils import gen_token, normalize_cache_key

class ShareLinkAuditTest(BaseTestCase):
    def setUp(self):
        share_file_info = {
            'username': self.user.username,
            'repo_id': self.repo.id,
            'path': self.file,
            'password': None,
            'expire_date': None,
        }
        self.fs = FileShare.objects.create_file_link(**share_file_info)

        # Every test needs access to the request factory.
        self.factory = RequestFactory()

    @property
    def _request(self, session={}):
        request = self.factory.get('/rand')
        request.user = self.user
        request.session = session
        return request

    def _anon_request(self, session={}):
        request = self.factory.get('/rand')
        request.user = AnonymousUser()
        request.session = session
        request.cloud_mode = False
        return request

    def _anon_post_request(self, data={}, session={}):
        request = self.factory.post('/rand', data)
        request.user = AnonymousUser()
        request.session = session
        request.cloud_mode = False
        return request

    def _fake_view_shared_file(self, request, token):
        @share_link_audit
        def fake_view_shared_file(request, fileshare):
            return HttpResponse()
        return fake_view_shared_file(request, token)

    def test_bad_share_token(self):
        @share_link_audit
        def a_view(request, fileshare):
            return HttpResponse()

        request = self.factory.get('/rand')
        request.user = self.user

        self.assertRaises(Http404, a_view, request, 'xxx')

    def test_non_pro_version(self):
        """
        Check that share_link_audit works as nomal view_shared_file on
        non-pro version.
        """
        resp = self._fake_view_shared_file(self._request, self.fs.token)
        self.assertEqual(resp.status_code, 200)

    def test_shared_link_audit_not_enabled(self):
        resp = self._fake_view_shared_file(self._request, self.fs.token)
        self.assertEqual(resp.status_code, 200)

    @override_settings(ENABLE_SHARE_LINK_AUDIT=True)
    @patch('seahub.share.decorators.is_pro_version')
    def test_audit_authenticated_user(self, mock_is_pro_version):
        mock_is_pro_version.return_value = True

        resp = self._fake_view_shared_file(self._request, self.fs.token)
        self.assertEqual(resp.status_code, 200)

    @override_settings(ENABLE_SHARE_LINK_AUDIT=True)
    @patch('seahub.share.decorators.is_pro_version')
    def test_audit_anonymous_user_with_mail_in_session(self, mock_is_pro_version):
        mock_is_pro_version.return_value = True

        anon_req = self._anon_request(session={'anonymous_email': 'a@a.com'})
        resp = self._fake_view_shared_file(anon_req, self.fs.token)
        self.assertEqual(resp.status_code, 200)

    @override_settings(ENABLE_SHARE_LINK_AUDIT=True)
    @patch('seahub.share.decorators.is_pro_version')
    def test_audit_anonymous_user_without_mail_in_session(self, mock_is_pro_version):
        """
        Check that share_link_audit works on pro version and setting enabled,
        which show a page that let user input email and verification code.
        """
        mock_is_pro_version.return_value = True

        anon_req = self._anon_request()
        resp = self._fake_view_shared_file(anon_req, self.fs.token)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('<p class="tip">Please provide your email address to continue.</p>', resp.content)

    @override_settings(ENABLE_SHARE_LINK_AUDIT=True)
    @patch('seahub.share.decorators.is_pro_version')
    def test_anonymous_user_post_wrong_token(self, mock_is_pro_version):
        """
        Check that anonnymous user input email and wrong verification code.
        """
        mock_is_pro_version.return_value = True

        anon_req = self._anon_post_request(data={'code': 'xx'}, session={})
        self.assertEqual(anon_req.session.get('anonymous_email'), None)
        resp = self._fake_view_shared_file(anon_req, self.fs.token)

        self.assertEqual(resp.status_code, 200)
        self.assertIn('Invalid token, please try again.', resp.content)

    @override_settings(ENABLE_SHARE_LINK_AUDIT=True)
    @patch('seahub.share.decorators.is_pro_version')
    def test_anonymous_user_post_correct_token(self, mock_is_pro_version):
        """
        Check that anonnymous user input email and correct verification code.
        """
        mock_is_pro_version.return_value = True

        code = gen_token(max_length=6)
        email = 'a@a.com'
        cache_key = normalize_cache_key(email, 'share_link_audit_')
        cache.set(cache_key, code, timeout=60)
        assert cache.get(cache_key) == code

        anon_req = self._anon_post_request(data={'code': code, 'email': email})
        self.assertEqual(anon_req.session.get('anonymous_email'), None)
        resp = self._fake_view_shared_file(anon_req, self.fs.token)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(anon_req.session.get('anonymous_email'), email)  # email is set in session
        assert cache.get(cache_key) is None  # token is delete after used
