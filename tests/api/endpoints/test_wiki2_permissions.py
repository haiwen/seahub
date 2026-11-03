import json
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

from django.urls import reverse
from rest_framework.test import APIRequestFactory, force_authenticate

from seahub.api2.endpoints import wiki2 as endpoint


class Wiki2WritePermissionTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.wiki_id = '11111111-2222-4333-8444-555555555555'
        self.linked_repo_id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
        self.user = SimpleNamespace(username='member@example.com', is_authenticated=True)
        self.wiki = SimpleNamespace(repo_id=self.wiki_id)
        self.file_view = Mock()
        self.file_view.to_dict.return_value = {'id': 1, 'name': 'View'}
        self.operations = {
            'page_config': (endpoint.Wiki2PageConfigView, 'put',
                            'api-v2.1-wiki2-page-config', {'page_id': 'AAAA'},
                            {'page_name': 'Changed', 'page_icon': 'icon', 'page_cover': 'cover'}),
            'rename': (endpoint.Wiki2FileView, 'put', 'api-v2.1-wiki2-file-view',
                       {'file_view_id': 1}, {'name': 'Changed'}),
            'delete': (endpoint.Wiki2FileView, 'delete', 'api-v2.1-wiki2-file-view',
                       {'file_view_id': 1}, {}),
            'duplicate': (endpoint.Wiki2FileViewDuplicateView, 'post',
                          'api-v2.1-wiki2-file-view-duplicate', {'file_view_id': 1}, {}),
            'create': (endpoint.Wiki2FileViews, 'post', 'api-v2.1-wiki2-file-views', {},
                       {'name': 'New view', 'linked_repo_id': self.linked_repo_id}),
        }
        for view in (endpoint.Wiki2PageConfigView, endpoint.Wiki2FileView,
                     endpoint.Wiki2FileViewDuplicateView, endpoint.Wiki2FileViews):
            patcher = patch.object(view, 'throttle_classes', ())
            patcher.start()
            self.addCleanup(patcher.stop)

        for name in ('Wiki', 'Wiki2Settings', 'WikiFileViews', 'get_repo_owner',
                     'check_wiki_permission', 'seafile_api', 'get_wiki_config',
                     'save_wiki_config'):
            patcher = patch.object(endpoint, name)
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

        self.Wiki.objects.get.return_value = self.wiki
        self.get_repo_owner.return_value = 'owner@example.com'
        self.check_wiki_permission.return_value = 'rw'
        self.Wiki2Settings.objects.filter.return_value.first.return_value = SimpleNamespace(
            enable_link_repos=True, get_linked_repos=lambda: [self.linked_repo_id])
        self.WikiFileViews.objects.filter.return_value.first.return_value = self.file_view
        self.WikiFileViews.objects.filter.return_value.exclude.return_value.exists.return_value = False
        self.WikiFileViews.objects.create_file_view.return_value = self.file_view
        self.WikiFileViews.objects.duplicate_file_view.return_value = self.file_view
        self.get_wiki_config.return_value = {
            'pages': [{'id': 'AAAA', 'name': 'Original', 'icon': '', 'cover_img_url': ''}],
        }

    def request(self, operation, authenticated=True):
        for mocked in (self.Wiki, self.WikiFileViews, self.file_view,
                       self.check_wiki_permission, self.save_wiki_config):
            mocked.reset_mock()
        view, method, url_name, kwargs, data = self.operations[operation]
        kwargs = dict(kwargs, wiki_id=self.wiki_id)
        request = getattr(self.factory, method)(reverse(url_name, kwargs=kwargs), data, format='json')
        if authenticated:
            force_authenticate(request, user=self.user)
        return view.as_view()(request, **kwargs)

    def assert_no_writes(self):
        self.save_wiki_config.assert_not_called()
        self.file_view.save.assert_not_called()
        self.file_view.delete.assert_not_called()
        self.WikiFileViews.objects.create_file_view.assert_not_called()
        self.WikiFileViews.objects.duplicate_file_view.assert_not_called()
        self.WikiFileViews.objects.update_view.assert_not_called()

    def test_readonly_member_cannot_write(self):
        self.check_wiki_permission.return_value = 'r'
        for operation in self.operations:
            with self.subTest(operation=operation):
                self.assertEqual(self.request(operation).status_code, 403)
                self.assert_no_writes()

    def test_user_without_wiki_access_cannot_write(self):
        self.check_wiki_permission.return_value = None
        for operation in self.operations:
            with self.subTest(operation=operation):
                self.assertEqual(self.request(operation).status_code, 403)
                self.assert_no_writes()

    def test_anonymous_user_cannot_write(self):
        for operation in self.operations:
            with self.subTest(operation=operation):
                self.assertIn(self.request(operation, authenticated=False).status_code, (401, 403))
                self.Wiki.objects.get.assert_not_called()
                self.assert_no_writes()

    def test_writer_and_owner_can_write(self):
        writes = {
            'page_config': self.save_wiki_config,
            'rename': self.file_view.save,
            'delete': self.file_view.delete,
            'duplicate': self.WikiFileViews.objects.duplicate_file_view,
            'create': self.WikiFileViews.objects.create_file_view,
        }
        for username in ('member@example.com', 'owner@example.com'):
            self.user.username = username
            for operation in self.operations:
                with self.subTest(username=username, operation=operation):
                    self.assertEqual(self.request(operation).status_code, 200)
                    self.check_wiki_permission.assert_called_once_with(self.wiki, username)
                    writes[operation].assert_called_once()
                    if operation == 'page_config':
                        page = json.loads(self.save_wiki_config.call_args.args[2])['pages'][0]
                        self.assertEqual((page['name'], page['icon'], page['cover_img_url']),
                                         ('Changed', 'icon', 'cover'))
                    elif operation == 'rename':
                        self.assertEqual(self.file_view.name, 'Changed')
                    elif operation == 'create':
                        writes[operation].assert_called_once_with(
                            self.wiki_id, 'New view', self.linked_repo_id, 'table')

    def test_file_view_creation_requires_existing_wiki(self):
        self.Wiki.objects.get.return_value = None
        self.assertEqual(self.request('create').status_code, 404)
        self.assert_no_writes()

    def test_readonly_member_can_read_file_views(self):
        self.check_wiki_permission.return_value = 'r'
        self.WikiFileViews.objects.filter.return_value.__iter__.return_value = iter([self.file_view])
        for view, url_name, kwargs in (
                (endpoint.Wiki2FileViews, 'api-v2.1-wiki2-file-views', {}),
                (endpoint.Wiki2FileView, 'api-v2.1-wiki2-file-view', {'file_view_id': 1})):
            with self.subTest(view=view.__name__):
                kwargs = dict(kwargs, wiki_id=self.wiki_id)
                request = self.factory.get(reverse(url_name, kwargs=kwargs))
                force_authenticate(request, user=self.user)
                self.assertEqual(view.as_view()(request, **kwargs).status_code, 200)
                self.assert_no_writes()
