# Copyright (c) 2012-2016 Seafile Ltd.
from django.test import SimpleTestCase, RequestFactory
from django.http import HttpResponse
from unittest.mock import Mock, patch, call

from seahub.password_session.middleware import CheckPasswordHash


def dummy_get_response(request):
    return HttpResponse('OK')


class CheckPasswordHashTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def _make_request(self, user=None):
        request = self.factory.get('/')
        request.user = user or Mock(
            is_authenticated=True, enc_password='hashed', email='u@test.com')
        request.session = {}
        return request

    def test_calls_get_response(self):
        get_response = Mock(return_value=HttpResponse())
        mw = CheckPasswordHash(get_response)
        request = self._make_request()
        mw(request)
        get_response.assert_called_once_with(request)

    # ---- process_view: unauthenticated user -> allow through immediately ----

    @patch('seahub.password_session.middleware.get_password_hash')
    def test_process_view_skips_unauthenticated_user(self, mock_hash):
        mw = CheckPasswordHash(dummy_get_response)
        user = Mock(is_authenticated=False)
        request = self._make_request(user=user)
        result = mw.process_view(request, None, None, None)
        self.assertIsNone(result)
        mock_hash.assert_not_called()

    # ---- process_view: LDAP user (enc_password='!') -> skip the check ----

    @patch('seahub.password_session.middleware.get_password_hash')
    def test_process_view_skips_ldap_user(self, mock_hash):
        mw = CheckPasswordHash(dummy_get_response)
        user = Mock(is_authenticated=True, enc_password='!')
        request = self._make_request(user=user)
        result = mw.process_view(request, None, None, None)
        self.assertIsNone(result)
        mock_hash.assert_not_called()

    # ---- process_view: session hash matches -> allow through ----

    @patch('seahub.password_session.middleware.get_password_hash',
           return_value='abc123')
    @patch('seahub.password_session.middleware.PASSWORD_HASH_KEY', 'pwd_hash')
    def test_process_view_passes_when_hash_matches(self, mock_hash):
        mw = CheckPasswordHash(dummy_get_response)
        user = Mock(is_authenticated=True, enc_password='hashed')
        request = self._make_request(user=user)
        request.session = {'pwd_hash': 'abc123'}
        result = mw.process_view(request, None, None, None)
        self.assertIsNone(result)

    # ---- process_view: session hash mismatch -> logout ----

    @patch('seahub.password_session.middleware.logout')
    @patch('seahub.password_session.middleware.get_password_hash',
           return_value='newHash')
    @patch('seahub.password_session.middleware.PASSWORD_HASH_KEY', 'pwd_hash')
    def test_process_view_logs_out_on_hash_mismatch(self, mock_hash, mock_logout):
        mw = CheckPasswordHash(dummy_get_response)
        user = Mock(is_authenticated=True, enc_password='hashed')
        request = self._make_request(user=user)
        request.session = {'pwd_hash': 'oldHash'}
        mw.process_view(request, None, None, None)
        mock_logout.assert_called_once_with(request)
