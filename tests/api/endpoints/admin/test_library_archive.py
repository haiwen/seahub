from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from django.urls import resolve, reverse
from rest_framework.test import APIRequestFactory, force_authenticate

from seahub.api2.endpoints.admin import libraries


class AdminLibraryArchiveTest(SimpleTestCase):
    def setUp(self):
        self.repo_id = '00000000-0000-0000-0000-000000000001'
        self.url = reverse('api-v2.1-admin-library-archive', args=[self.repo_id])
        self.factory = APIRequestFactory()
        self.user = SimpleNamespace(
            username='admin@example.com', is_authenticated=True, is_staff=True,
            admin_permissions=Mock(),
        )
        self.user.admin_permissions.can_manage_library.return_value = True
        self.repo = SimpleNamespace(
            repo_id=self.repo_id, repo_type=None, is_virtual=False, storage_id=None,
        )
        module = 'seahub.api2.endpoints.admin.libraries'
        self.feature_check = self.enterContext(patch(module + '.feature_check', return_value=(True, '')))
        self.enterContext(patch(module + '.get_archive_storage_id', return_value='archive'))
        self.enterContext(patch(module + '.get_default_storage_id', return_value='primary'))
        self.get_repo = self.enterContext(patch(
            module + '.seafile_api.get_repo', return_value=self.repo, create=True))
        self.archive_status = self.enterContext(patch(
            module + '.RepoArchiveStatus.objects.get_archive_status', return_value=None))
        self.add_task = self.enterContext(patch(
            module + '.add_repo_archive_task_request', return_value='task-id'))
        self.enterContext(patch(
            'seahub.api2.throttling.UserRateThrottle.allow_request', return_value=True))

    def post(self, op_type='archive'):
        request = self.factory.post(self.url, {'op_type': op_type}, format='json')
        force_authenticate(request, user=self.user)
        match = resolve(self.url)
        return match.func(request, **match.kwargs)

    def test_archive_and_unarchive(self):
        for op_type, storage_id, archive_status, origin, destination in (
                ('archive', None, None, 'primary', 'archive'),
                ('archive', 'secondary', None, 'secondary', 'archive'),
                ('unarchive', 'archive', 'archived', 'archive', 'primary')):
            with self.subTest(op_type=op_type, storage_id=storage_id):
                self.repo.storage_id = storage_id
                self.archive_status.return_value = archive_status
                self.add_task.reset_mock()
                response = self.post(op_type)
                self.assertEqual(200, response.status_code)
                self.assertEqual({'task_id': 'task-id'}, response.data)
                self.add_task.assert_called_once_with(
                    self.repo_id, origin, destination, op_type, self.user.username)

    def test_requires_authentication(self):
        request = self.factory.post(self.url, {'op_type': 'archive'}, format='json')
        match = resolve(self.url)
        response = match.func(request, **match.kwargs)
        self.assertEqual(403, response.status_code)
        self.feature_check.assert_not_called()
        self.add_task.assert_not_called()

    def test_requires_admin_and_library_management_permission(self):
        for is_staff, can_manage_library in ((False, True), (True, False)):
            with self.subTest(is_staff=is_staff, can_manage_library=can_manage_library):
                self.user.is_staff = is_staff
                self.user.admin_permissions.can_manage_library.return_value = can_manage_library
                response = self.post()
                self.assertEqual(403, response.status_code)
                self.feature_check.assert_not_called()
                self.add_task.assert_not_called()

    def test_feature_disabled(self):
        self.feature_check.return_value = False, 'Storage classes not enabled.'
        response = self.post()
        self.assertEqual(403, response.status_code)
        self.assertEqual('Storage classes not enabled.', response.data['error_msg'])
        self.add_task.assert_not_called()

    def test_missing_storage_configuration(self):
        for getter in ('get_archive_storage_id', 'get_default_storage_id'):
            with self.subTest(getter=getter):
                with patch.object(libraries, getter, return_value=None):
                    response = self.post()
                self.assertEqual(404, response.status_code)
                self.add_task.assert_not_called()

    def test_library_not_found(self):
        self.get_repo.return_value = None
        response = self.post()
        self.assertEqual(404, response.status_code)
        self.add_task.assert_not_called()

    def test_rejects_wiki_and_virtual_libraries(self):
        for field, value in (('repo_type', 'wiki'), ('is_virtual', True)):
            with self.subTest(field=field):
                with patch.object(self.repo, field, value):
                    response = self.post()
                self.assertEqual(403, response.status_code)
                self.add_task.assert_not_called()

    def test_invalid_operation(self):
        for op_type in (None, 'invalid'):
            with self.subTest(op_type=op_type):
                response = self.post(op_type)
                self.assertEqual(400, response.status_code)
                self.add_task.assert_not_called()

    def test_rejects_library_being_processed(self):
        for archive_status in ('in_archiving', 'in_unarchiving'):
            with self.subTest(archive_status=archive_status):
                self.archive_status.return_value = archive_status
                response = self.post()
                self.assertEqual(400, response.status_code)
                self.add_task.assert_not_called()

    def test_rejects_library_already_in_target_storage(self):
        for op_type, storage_id in (('archive', 'archive'), ('unarchive', 'primary')):
            with self.subTest(op_type=op_type):
                self.repo.storage_id = storage_id
                response = self.post(op_type)
                self.assertEqual(400, response.status_code)
                self.add_task.assert_not_called()

    def test_task_submission_failure(self):
        self.add_task.side_effect = RuntimeError('Task service unavailable')
        response = self.post()
        self.assertEqual(500, response.status_code)
        self.assertEqual('Internal Server Error', response.data['error_msg'])
