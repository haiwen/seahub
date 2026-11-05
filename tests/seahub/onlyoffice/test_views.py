import json
from unittest.mock import patch

import jwt
from django.test import RequestFactory, TestCase

from seahub.onlyoffice.models import OnlyOfficeDocKey
from seahub.onlyoffice.views import onlyoffice_editor_callback

SECRET = 'test-onlyoffice-secret-0123456789abcdef'
CALLBACK_URL = '/onlyoffice/editor-callback/'
DOC_KEY = 'ec294f7760ac3a868c75'
REPO_ID = 'eed2f63b-db58-4df1-957c-ae0b161d1a06'
FILE_PATH = '/oo-jwt-test.xlsx'
USERNAME = 'lian@lian.com'
FILE_URL = 'http://docserver/cache/files/oo-jwt-test.xlsx'
FUTURE_EXP = 4102444800


class OnlyofficeEditorCallbackJwtTest(TestCase):
    """The OnlyOffice callback must only trust a request carrying a valid JWT."""

    def setUp(self):
        self.factory = RequestFactory()
        OnlyOfficeDocKey.objects.create(
            doc_key=DOC_KEY,
            username=USERNAME,
            repo_id=REPO_ID,
            file_path=FILE_PATH,
            repo_id_file_path_md5='repo_id_file_path_md5',
        )

    def _encode(self, secret=SECRET, **overrides):
        payload = {
            'key': DOC_KEY,
            'status': 2,
            'url': FILE_URL,
            'iat': 1,
            'exp': FUTURE_EXP,
        }
        payload.update(overrides)
        return jwt.encode(payload, secret, algorithm='HS256')

    def _post(self, body, token=None, header=True, body_token=True, header_token=None):
        data = dict(body)
        if token is not None and body_token:
            data['token'] = token
        extra = {}
        header_value = header_token if header_token is not None else token
        if header and header_value:
            extra['HTTP_AUTHORIZATION'] = 'Bearer ' + header_value
        # Call the view directly: the callback URL is only registered when
        # OnlyOffice is enabled, which depends on the deployment settings.
        request = self.factory.post(CALLBACK_URL, data=json.dumps(data),
                                    content_type='application/json', **extra)
        return onlyoffice_editor_callback(request)

    @patch('seahub.onlyoffice.views.ONLYOFFICE_JWT_SECRET', SECRET)
    @patch('seahub.onlyoffice.views.requests')
    def test_callback_without_jwt_is_rejected(self, mock_requests):
        resp = self._post({'key': DOC_KEY, 'status': 2, 'url': FILE_URL})

        self.assertEqual(resp.content, b'{"error": 1}')
        mock_requests.get.assert_not_called()
        mock_requests.post.assert_not_called()

    @patch('seahub.onlyoffice.views.ONLYOFFICE_JWT_SECRET', SECRET)
    @patch('seahub.onlyoffice.views.requests')
    def test_callback_with_jwt_signed_by_other_secret_is_rejected(self, mock_requests):
        token = self._encode(secret='another-secret-0123456789abcdefghij')

        resp = self._post({'key': DOC_KEY, 'status': 2, 'url': FILE_URL}, token=token)

        self.assertEqual(resp.content, b'{"error": 1}')
        mock_requests.get.assert_not_called()
        mock_requests.post.assert_not_called()

    @patch('seahub.onlyoffice.views.ONLYOFFICE_JWT_SECRET', '')
    @patch('seahub.onlyoffice.views.gen_inner_file_upload_url', return_value='http://inner/update')
    @patch('seahub.onlyoffice.views.cache')
    @patch('seahub.onlyoffice.views.seafile_api')
    @patch('seahub.onlyoffice.views.requests')
    def test_legacy_callback_saves_when_jwt_secret_is_not_configured(
            self, mock_requests, mock_seafile_api, mock_cache, mock_upload_url):
        mock_seafile_api.get_fileserver_access_token.return_value = 'update_token'
        mock_requests.get.return_value.content = b'saved content'
        mock_requests.post.return_value.status_code = 200

        resp = self._post({'key': DOC_KEY, 'status': 2, 'url': FILE_URL})

        self.assertEqual(resp.content, b'{"error": 0}')
        mock_requests.get.assert_called_once()
        self.assertEqual(mock_requests.get.call_args.args[0], FILE_URL)
        mock_requests.post.assert_called_once()

    @patch('seahub.onlyoffice.views.ONLYOFFICE_JWT_SECRET', SECRET)
    @patch('seahub.onlyoffice.views.requests')
    def test_valid_jwt_for_another_document_is_rejected(self, mock_requests):
        token = self._encode(key='another-doc-key')

        resp = self._post({'key': DOC_KEY, 'status': 2, 'url': FILE_URL}, token=token)

        self.assertEqual(resp.content, b'{"error": 1}')
        mock_requests.get.assert_not_called()
        mock_requests.post.assert_not_called()

    @patch('seahub.onlyoffice.views.gen_inner_file_upload_url', lambda *args: 'http://inner/update')
    @patch('seahub.onlyoffice.views.cache')
    @patch('seahub.onlyoffice.views.seafile_api')
    @patch('seahub.onlyoffice.views.requests')
    @patch('seahub.onlyoffice.views.ONLYOFFICE_JWT_SECRET', SECRET)
    def test_callback_with_valid_jwt_saves_the_file(
            self, mock_requests, mock_seafile_api, mock_cache):
        mock_seafile_api.get_fileserver_access_token.return_value = 'update_token'
        mock_requests.get.return_value.content = b'saved content'
        mock_requests.post.return_value.status_code = 200
        token = self._encode()

        resp = self._post({'key': DOC_KEY, 'status': 2, 'url': FILE_URL}, token=token)

        self.assertEqual(resp.content, b'{"error": 0}')
        mock_requests.get.assert_called_once()
        self.assertEqual(mock_requests.get.call_args[0][0], FILE_URL)
        mock_requests.post.assert_called_once()
        self.assertEqual(mock_requests.post.call_args[0][0], 'http://inner/update')

    @patch('seahub.onlyoffice.views.gen_inner_file_upload_url', lambda *args: 'http://inner/update')
    @patch('seahub.onlyoffice.views.cache')
    @patch('seahub.onlyoffice.views.seafile_api')
    @patch('seahub.onlyoffice.views.requests')
    @patch('seahub.onlyoffice.views.ONLYOFFICE_JWT_SECRET', SECRET)
    def test_jwt_in_request_body_is_accepted(
            self, mock_requests, mock_seafile_api, mock_cache):
        mock_seafile_api.get_fileserver_access_token.return_value = 'update_token'
        mock_requests.get.return_value.content = b'saved content'
        mock_requests.post.return_value.status_code = 200
        token = self._encode()

        resp = self._post({'key': DOC_KEY, 'status': 2, 'url': FILE_URL}, token=token, header=False)

        self.assertEqual(resp.content, b'{"error": 0}')
        mock_requests.get.assert_called_once()

    @patch('seahub.onlyoffice.views.gen_inner_file_upload_url', lambda *args: 'http://inner/update')
    @patch('seahub.onlyoffice.views.cache')
    @patch('seahub.onlyoffice.views.seafile_api')
    @patch('seahub.onlyoffice.views.requests')
    @patch('seahub.onlyoffice.views.ONLYOFFICE_JWT_SECRET', SECRET)
    def test_wrapped_header_token_saves_the_file(
            self, mock_requests, mock_seafile_api, mock_cache):
        # The header token of a real document server wraps the request body in a
        # "payload" field: {"payload": {...}, "iat": ..., "exp": ...}.
        mock_seafile_api.get_fileserver_access_token.return_value = 'update_token'
        mock_requests.get.return_value.content = b'saved content'
        mock_requests.post.return_value.status_code = 200
        body = {'key': DOC_KEY, 'status': 2, 'url': FILE_URL}
        token = jwt.encode({'payload': body, 'iat': 1, 'exp': FUTURE_EXP}, SECRET, algorithm='HS256')

        resp = self._post(body, token=token)

        self.assertEqual(resp.content, b'{"error": 0}')
        mock_requests.get.assert_called_once()

    @patch('seahub.onlyoffice.views.gen_inner_file_upload_url', lambda *args: 'http://inner/update')
    @patch('seahub.onlyoffice.views.cache')
    @patch('seahub.onlyoffice.views.seafile_api')
    @patch('seahub.onlyoffice.views.requests')
    @patch('seahub.onlyoffice.views.ONLYOFFICE_JWT_SECRET', SECRET)
    def test_token_only_body_saves_the_file(
            self, mock_requests, mock_seafile_api, mock_cache):
        # With services.CoAuthoring.token.outbox.inBody enabled the document
        # server sends the callback parameters inside the token only.
        mock_seafile_api.get_fileserver_access_token.return_value = 'update_token'
        mock_requests.get.return_value.content = b'saved content'
        mock_requests.post.return_value.status_code = 200
        token = self._encode()

        resp = self._post({}, token=token, header=False)

        self.assertEqual(resp.content, b'{"error": 0}')
        mock_requests.get.assert_called_once()
        self.assertEqual(mock_requests.get.call_args[0][0], FILE_URL)

    @patch('seahub.onlyoffice.views.gen_inner_file_upload_url', lambda *args: 'http://inner/update')
    @patch('seahub.onlyoffice.views.cache')
    @patch('seahub.onlyoffice.views.seafile_api')
    @patch('seahub.onlyoffice.views.requests')
    @patch('seahub.onlyoffice.views.ONLYOFFICE_JWT_SECRET', SECRET)
    def test_header_token_is_used_when_the_body_has_no_token(
            self, mock_requests, mock_seafile_api, mock_cache):
        # services.CoAuthoring.token.outbox.inBody is false: the token is only
        # in the ONLYOFFICE_JWT_HEADER header.
        mock_seafile_api.get_fileserver_access_token.return_value = 'update_token'
        mock_requests.get.return_value.content = b'saved content'
        mock_requests.post.return_value.status_code = 200
        token = self._encode()

        resp = self._post({'key': DOC_KEY, 'status': 2, 'url': FILE_URL},
                          token=token, body_token=False)

        self.assertEqual(resp.content, b'{"error": 0}')
        mock_requests.get.assert_called_once()

    @patch('seahub.onlyoffice.views.gen_inner_file_upload_url', lambda *args: 'http://inner/update')
    @patch('seahub.onlyoffice.views.cache')
    @patch('seahub.onlyoffice.views.seafile_api')
    @patch('seahub.onlyoffice.views.requests')
    @patch('seahub.onlyoffice.views.ONLYOFFICE_JWT_SECRET', SECRET)
    def test_body_token_is_used_when_both_tokens_are_present(
            self, mock_requests, mock_seafile_api, mock_cache):
        # The document server sends both tokens and they can differ, so the
        # preference between them is observable: a valid body token must be
        # used even when the header token is not signed by our secret.
        mock_seafile_api.get_fileserver_access_token.return_value = 'update_token'
        mock_requests.get.return_value.content = b'saved content'
        mock_requests.post.return_value.status_code = 200
        body = {'key': DOC_KEY, 'status': 2, 'url': FILE_URL}
        valid_token = self._encode()
        bad_token = self._encode(secret='another-secret-0123456789abcdefghij')

        resp = self._post(body, token=valid_token, header_token=bad_token)

        self.assertEqual(resp.content, b'{"error": 0}')
        mock_requests.get.assert_called_once()
