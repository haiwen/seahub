from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import call, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory, force_authenticate

from seahub.seadoc import apis as endpoint


class SeadocRevisionPutTest(TestCase):
    def setUp(self):
        for patcher in (patch.object(endpoint.SeadocRevisionView, 'throttle_classes', ()),
                        patch('seahub.utils.repo.is_pro_version', return_value=True)):
            patcher.start()
            self.addCleanup(patcher.stop)
        self.factory = APIRequestFactory()
        self.repo_id = '11111111-2222-4333-8444-555555555555'
        self.revision_uuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
        self.origin_uuid = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff'
        self.user = SimpleNamespace(username='editor@example.com', is_authenticated=True)
        self.repo = SimpleNamespace(is_virtual=False)
        self.revision_map = SimpleNamespace(
            repo_id=self.repo_id, parent_path='/revisions', filename='revision.sdoc')
        self.origin_map = SimpleNamespace(
            repo_id=self.repo_id, parent_path='/documents', filename='original.sdoc')
        self.revision = SimpleNamespace(
            repo_id=self.repo_id, origin_doc_uuid=self.origin_uuid, is_published=False)

        for name in ('FileUUIDMap', 'SeadocRevision', 'seafile_api',
                     'check_folder_permission', 'get_seadoc_upload_link',
                     'requests', 'SdocServerAPI', 'is_valid_seadoc_access_token'):
            patcher = patch.object(endpoint, name)
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

        self.FileUUIDMap.objects.get_fileuuidmap_by_uuid.side_effect = (
            lambda value: {self.revision_uuid: self.revision_map,
                           self.origin_uuid: self.origin_map}.get(value))
        self.SeadocRevision.objects.get_by_doc_uuid.return_value = self.revision
        self.seafile_api.get_repo.return_value = self.repo
        self.seafile_api.get_file_id_by_path.side_effect = (
            lambda repo_id, path: 'origin-version' if path.endswith('original.sdoc')
            else 'revision-version')
        self.check_folder_permission.return_value = 'rw'
        self.get_seadoc_upload_link.return_value = 'https://fileserver.test/update'
        self.requests.post.return_value.ok = True

    def put(self, permission=None, with_file=True):
        data = {}
        if with_file:
            data['file'] = SimpleUploadedFile(
                'revision.sdoc', b'{"elements": []}', content_type='application/json')
        request = self.factory.put('/revision/', data, format='multipart')
        if permission is None:
            # Exercise DRF's normal dispatch and multipart parsing without RPC authentication.
            force_authenticate(request, user=self.user)
        else:
            # Keep the actual JWT authenticator type so its capability check is exercised.
            request.META['HTTP_AUTHORIZATION'] = 'Token revision-jwt'
            self.is_valid_seadoc_access_token.return_value = (
                True, {'username': self.user.username, 'permission': permission})
            patcher = patch.object(
                endpoint.SdocJWTTokenAuthentication, 'authenticate',
                return_value=(self.user, 'revision-jwt'))
            patcher.start()
            self.addCleanup(patcher.stop)
        return endpoint.SeadocRevisionView.as_view()(request, file_uuid=self.revision_uuid)

    def assert_no_writes(self):
        self.seafile_api.post_empty_file.assert_not_called()
        self.get_seadoc_upload_link.assert_not_called()
        self.requests.post.assert_not_called()
        self.SeadocRevision.objects.update_origin_file_version.assert_not_called()
        self.SdocServerAPI.assert_not_called()

    def test_missing_upload_is_rejected_without_writes(self):
        self.assertEqual(self.put(with_file=False).status_code, 400)
        self.assert_no_writes()

    def test_published_revision_cannot_be_overwritten(self):
        self.revision.is_published = True
        self.assertEqual(self.put().status_code, 400)
        self.assert_no_writes()

    def test_revision_or_original_without_edit_permission_is_rejected(self):
        for path in ('/revisions', '/documents'):
            for permission in (None, 'r', 'preview', 'invisible'):
                with self.subTest(path=path, permission=permission):
                    self.check_folder_permission.side_effect = (
                        lambda request, repo_id, parent_path:
                        permission if parent_path == path else 'rw')
                    self.assertEqual(self.put().status_code, 403)
                    self.assert_no_writes()

    def test_foreign_revision_or_original_library_is_rejected(self):
        for mapping in (self.revision_map, self.origin_map):
            with self.subTest(mapping=mapping):
                mapping.repo_id = 'foreign-library'
                self.assertEqual(self.put().status_code, 403)
                self.assert_no_writes()
                mapping.repo_id = self.repo_id

    def test_readonly_jwt_cannot_rebase_even_when_user_has_write_permission(self):
        self.assertEqual(self.put(permission='r').status_code, 403)
        self.is_valid_seadoc_access_token.assert_called_once_with(
            ['Token', 'revision-jwt'], self.revision_uuid, return_payload=True)
        self.assert_no_writes()

    def test_missing_original_file_is_rejected_without_writes(self):
        self.seafile_api.get_file_id_by_path.return_value = None
        self.seafile_api.get_file_id_by_path.side_effect = None
        self.assertEqual(self.put().status_code, 404)
        self.assert_no_writes()

    def assert_rebase_succeeded(self, response):
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'origin_file_version': 'origin-version'})
        self.get_seadoc_upload_link.assert_called_once_with(
            self.revision_map, self.user.username)
        self.requests.post.assert_called_once()
        upload = self.requests.post.call_args
        self.assertEqual(upload.args, ('https://fileserver.test/update',))
        self.assertEqual(upload.kwargs['data'], {
            'filename': 'revision.sdoc', 'target_file': '/revisions/revision.sdoc'})
        self.assertEqual(upload.kwargs['files']['file'].read(), b'{"elements": []}')
        self.SeadocRevision.objects.update_origin_file_version.assert_called_once_with(
            self.revision_uuid, 'origin-version')
        self.SdocServerAPI.assert_called_once_with(
            self.revision_uuid, 'revision.sdoc', self.user.username)
        self.SdocServerAPI.return_value.replace_doc.assert_called_once_with()

    def test_authorized_user_can_rebase(self):
        self.assert_rebase_succeeded(self.put())
        request = self.check_folder_permission.call_args_list[0].args[0]
        self.assertEqual(self.check_folder_permission.call_args_list, [
            call(request, self.repo_id, '/revisions'),
            call(request, self.repo_id, '/documents')])

    def test_editable_jwt_can_rebase(self):
        self.assert_rebase_succeeded(self.put(permission='rw'))

    def configure_virtual_library(self, origin_parent_path):
        self.repo.is_virtual = True
        self.repo.origin_repo_id = 'source-library'
        self.repo.origin_path = '/shared'
        self.origin_map.repo_id = 'source-library'
        self.origin_map.parent_path = origin_parent_path

    def test_virtual_library_checks_relative_original_path(self):
        self.configure_virtual_library('/shared/documents')
        self.assert_rebase_succeeded(self.put())
        self.assertEqual(
            [item.args[2] for item in self.check_folder_permission.call_args_list],
            ['/revisions', '/documents'])
        self.seafile_api.get_file_id_by_path.assert_any_call(
            'source-library', '/shared/documents/original.sdoc')

    def test_original_outside_virtual_library_is_rejected(self):
        self.configure_virtual_library('/shared-other/documents')
        self.assertEqual(self.put().status_code, 403)
        self.assert_no_writes()

    def test_missing_revision_file_is_recreated_after_authorization(self):
        self.seafile_api.get_file_id_by_path.side_effect = (
            lambda repo_id, path: 'origin-version' if path.endswith('original.sdoc') else None)
        self.assert_rebase_succeeded(self.put())
        self.seafile_api.post_empty_file.assert_called_once_with(
            self.repo_id, '/revisions', 'revision.sdoc', '')

    def test_upload_failure_does_not_update_revision_version_or_editor(self):
        self.requests.post.return_value.ok = False
        self.requests.post.return_value.text = 'upload failed'
        with self.assertLogs(endpoint.logger, level='ERROR'):
            self.assertEqual(self.put().status_code, 500)
        self.SeadocRevision.objects.update_origin_file_version.assert_not_called()
        self.SdocServerAPI.assert_not_called()
