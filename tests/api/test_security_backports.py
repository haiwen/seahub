from types import SimpleNamespace
from unittest.mock import patch

import jwt
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from seahub.api2.endpoints import internal_api
from seahub.onlyoffice import views as onlyoffice
from seahub.seadoc import apis as seadoc
from seahub.wopi import views as wopi


class FileAccessPermissionBackportTest(SimpleTestCase):
    def test_preview_types_require_actual_access(self):
        for filename, permission, expected in (
                ('test.pdf', None, 403), ('test.md', None, 403),
                ('test.mp4', None, 403), ('test.pdf', 'invisible', 403),
                ('test.pdf', 'preview', 200), ('test.txt', 'preview', 403),
                ('test.txt', 'r', 200)):
            with self.subTest(filename=filename, permission=permission):
                request = SimpleNamespace(
                    META={}, user=SimpleNamespace(username='user@example.com'),
                    data={'path': '/private/' + filename, 'op': 'download'})
                with patch.object(internal_api, 'is_valid_internal_jwt', return_value=True), \
                        patch.object(internal_api, 'get_file_type_and_ext', return_value=(
                            {'pdf': 'PDF', 'md': 'Markdown', 'mp4': 'Video'}.get(
                                filename.split('.')[-1], 'Text'), filename.split('.')[-1])), \
                        patch.object(internal_api, 'seafile_api') as api, \
                        patch.object(internal_api, 'send_file_access_msg'), \
                        patch('seahub.utils.repo.is_pro_version', return_value=True):
                    api.check_permission_by_path.return_value = permission
                    response = internal_api.InternalCheckFileOperationAccess().post(request, 'repo')
                    self.assertEqual(response.status_code, expected)
                    api.check_permission_by_path.assert_called_once_with(
                        'repo', '/private', 'user@example.com')


class OfficePermissionBackportTest(SimpleTestCase):
    def test_wopi_readonly_or_missing_capability_is_denied(self):
        request = APIRequestFactory().get('/wopi/', {'access_token': 'token'})
        for info in (None, {}, {'can_edit': False}, {'can_edit': True}):
            with self.subTest(info=info), patch.object(
                    wopi, 'get_file_info_by_token', return_value=info):
                response = wopi.check_edit_permission(request)
                if info and info.get('can_edit'):
                    self.assertIsNone(response)
                else:
                    self.assertEqual(response.status_code, 403)

    def test_onlyoffice_requires_signature_when_secret_is_configured(self):
        secret = 'test-secret-0123456789abcdef0123456789'
        signed = {'key': 'document', 'status': 6, 'url': 'https://office.example/file'}
        request = APIRequestFactory().post('/callback/')
        with patch.object(onlyoffice, 'ONLYOFFICE_JWT_SECRET', secret):
            self.assertIsNone(onlyoffice.get_verified_callback_payload(request, signed))
            token = jwt.encode(signed, secret, algorithm='HS256')
            result = onlyoffice.get_verified_callback_payload(
                request, {'token': token, 'url': 'https://untrusted.example/file'})
            self.assertEqual(result, signed)

    def test_onlyoffice_keeps_legacy_callback_without_secret(self):
        body = {'key': 'document', 'status': 4}
        with patch.object(onlyoffice, 'ONLYOFFICE_JWT_SECRET', ''):
            self.assertEqual(onlyoffice.get_verified_callback_payload(
                APIRequestFactory().post('/callback/'), body), body)


class RevisionContentBackportTest(SimpleTestCase):
    def test_revision_content_requires_preview_before_issuing_token(self):
        request = SimpleNamespace(user=SimpleNamespace(username='user@example.com'))
        mapping = SimpleNamespace(repo_id='repo', parent_path='/private')
        revision = SimpleNamespace(
            origin_doc_path='/private/original.sdoc', origin_file_version='base-version',
            origin_doc_uuid='original', publish_file_version='published-version',
            is_published=True)
        for view in (seadoc.SdocRevisionBaseVersionContent,
                     seadoc.SeadocPublishedRevisionContent):
            for permission in (None, 'r'):
                with self.subTest(view=view.__name__, permission=permission), \
                        patch.object(seadoc, 'FileUUIDMap') as maps, \
                        patch.object(seadoc, 'SeadocRevision') as revisions, \
                        patch.object(seadoc, 'check_folder_permission', return_value=permission), \
                        patch.object(seadoc, 'seafile_api') as api, \
                        patch.object(seadoc, 'requests') as http, \
                        patch.object(seadoc, 'gen_inner_file_get_url', return_value='http://fileserver/file'):
                    maps.objects.get_fileuuidmap_by_uuid.return_value = mapping
                    revisions.objects.get_by_doc_uuid.return_value = revision
                    http.get.return_value.ok = True
                    http.get.return_value.content = b'document'
                    response = view().get(request, 'revision')
                    self.assertEqual(response.status_code, 200 if permission else 403)
                    if permission:
                        self.assertEqual(response.data, {'content': b'document'})
                    else:
                        api.get_fileserver_access_token.assert_not_called()
                        http.get.assert_not_called()
