from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from django.urls import resolve
from rest_framework.test import APIRequestFactory, force_authenticate

from seahub.api2.endpoints.admin import libraries


class LibraryArchiveStatusTest(SimpleTestCase):
    def setUp(self):
        self.user = SimpleNamespace(
            username='admin@example.com', is_authenticated=True, is_staff=True,
            admin_permissions=Mock(),
        )
        self.repos = [SimpleNamespace(
            repo_id='00000000-0000-0000-0000-%012d' % index,
            repo_name='test-library-%s' % index, name='test-library-%s' % index,
            size=0, encrypted=False,
            file_count=0, status=1, last_modified=1, is_virtual=False,
            repo_type='wiki' if index == 3 else None,
        ) for index in range(4)]
        self.repo_ids = [repo.repo_id for repo in self.repos]
        self.statuses = dict(zip(self.repo_ids, (
            'archived', 'in_archiving', 'in_unarchiving', None,
        )))
        self.factory = APIRequestFactory()
        module = 'seahub.api2.endpoints.admin.libraries'
        self.enterContext(patch(module + '.ENABLE_STORAGE_CLASSES', True))
        self.pro_version = self.enterContext(patch(module + '.is_pro_version', return_value=True))
        self.archive_statuses = self.enterContext(patch(
            module + '.RepoArchiveStatus.objects.get_repos_archive_status', return_value=self.statuses))
        self.enterContext(patch(module + '.get_system_default_repo_id', return_value=None))
        self.enterContext(patch(module + '.email2nickname', return_value='Owner'))
        self.enterContext(patch(module + '.email2contact_email', return_value='owner@example.com'))
        for method, result in (
                ('get_repo_list', self.repos), ('search_repos_by_name', self.repos),
                ('get_owned_repo_list', self.repos), ('get_repos_by_id_prefix', []),
                ('get_repo_owner', 'owner@example.com'), ('get_repo', self.repos[0])):
            self.enterContext(patch(module + '.seafile_api.' + method, return_value=result, create=True))
        self.enterContext(patch(module + '.ccnet_api.get_orgs_by_user', return_value=[], create=True))
        self.enterContext(patch(
            'seahub.api2.throttling.UserRateThrottle.allow_request', return_value=True))

    def get(self, path, params=None):
        request = self.factory.get(path, params or {})
        force_authenticate(request, user=self.user)
        match = resolve(path)
        return match.func(request, **match.kwargs)

    def test_lists_return_archive_status_in_one_batch(self):
        for path, key, params in (
                ('/api/v2.1/admin/libraries/', 'repos', {}),
                ('/api/v2.1/admin/libraries/', 'repos', {'name': 'test'}),
                ('/api/v2.1/admin/libraries/', 'repos', {'owner': 'owner@example.com'}),
                ('/api/v2.1/admin/libraries/', 'repos', {'name': 'test', 'owner': 'owner@example.com'}),
                ('/api/v2.1/admin/search-library/', 'repo_list', {'query': 'test'})):
            with self.subTest(path=path, params=params):
                self.archive_statuses.reset_mock()
                response = self.get(path, params)
                self.assertEqual(200, response.status_code)
                self.assertEqual(list(self.statuses.values()), [
                    repo['archive_status'] for repo in response.data[key]
                ])
                self.assertEqual('wiki', response.data[key][-1]['repo_type'])
                self.assertEqual('read-only', response.data[key][-1]['status'])
                self.assertIsNone(response.data[key][-1]['archive_status'])
                self.archive_statuses.assert_called_once_with(self.repo_ids)

    def test_transfer_preserves_archive_status(self):
        module = 'seahub.api2.endpoints.admin.libraries'
        new_owner = 'new-owner@example.com'
        self.enterContext(patch(module + '.MULTI_TENANCY', False))
        get_user = self.enterContext(patch(module + '.User.objects.get'))
        get_user.return_value.permissions.can_add_repo.return_value = True
        self.enterContext(patch(
            module + '.seafile_api.get_repo_owner',
            side_effect=['owner@example.com', new_owner], create=True))
        transfer = self.enterContext(patch(module + '.transfer_repo'))
        for target in (
                'RepoTransfer.objects.create', 'UploadLinkShare.objects.filter',
                'FileShare.objects.filter', 'admin_operation.send'):
            self.enterContext(patch(module + '.' + target))

        path = '/api/v2.1/admin/libraries/%s/' % self.repo_ids[0]
        request = self.factory.put(path, {'owner': new_owner}, format='json')
        request.cloud_mode = True
        force_authenticate(request, user=self.user)
        match = resolve(path)
        response = match.func(request, **match.kwargs)

        self.assertEqual(200, response.status_code)
        self.assertEqual(new_owner, response.data['owner_email'])
        self.assertEqual('archived', response.data['archive_status'])
        transfer.assert_called_once_with(self.repo_ids[0], new_owner, False)
        self.archive_statuses.assert_called_once_with([self.repo_ids[0]])

    def test_no_query_without_storage_classes_or_pro_version(self):
        for setting in ('ENABLE_STORAGE_CLASSES', 'is_pro_version'):
            with self.subTest(setting=setting):
                if setting == 'is_pro_version':
                    self.pro_version.return_value = False
                with patch.object(libraries, 'ENABLE_STORAGE_CLASSES', setting != 'ENABLE_STORAGE_CLASSES'):
                    response = self.get('/api/v2.1/admin/libraries/')
                self.assertEqual(200, response.status_code)
                self.assertNotIn('archive_status', response.data['repos'][0])
                self.archive_statuses.assert_not_called()

    def test_permission_denied_before_status_query(self):
        self.user.admin_permissions.can_manage_library.return_value = False
        response = self.get('/api/v2.1/admin/libraries/')
        self.assertEqual(403, response.status_code)
        self.archive_statuses.assert_not_called()
