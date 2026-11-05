import json
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APIRequestFactory, force_authenticate

from seahub.api2.endpoints import wiki2 as endpoint


class Wiki2WritePermissionTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.wiki_id = '11111111-2222-4333-8444-555555555555'
        self.user = SimpleNamespace(username='member@example.com', is_authenticated=True)
        self.wiki = SimpleNamespace(repo_id=self.wiki_id)
        self.operations = {
            'page_config': (endpoint.Wiki2PageConfigView, 'put',
                            'api-v2.1-wiki2-page-config', {'page_id': 'AAAA'},
                            {'page_name': 'Changed', 'page_icon': 'icon', 'page_cover': 'cover'}),
        }
        patcher = patch.object(endpoint.Wiki2PageConfigView, 'throttle_classes', ())
        patcher.start()
        self.addCleanup(patcher.stop)

        for name in ('Wiki', 'get_repo_owner', 'check_wiki_permission',
                     'seafile_api', 'get_wiki_config', 'save_wiki_config'):
            patcher = patch.object(endpoint, name)
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

        self.Wiki.objects.get.return_value = self.wiki
        self.get_repo_owner.return_value = 'owner@example.com'
        self.check_wiki_permission.return_value = 'rw'
        self.get_wiki_config.return_value = {
            'pages': [{'id': 'AAAA', 'name': 'Original', 'icon': '', 'cover_img_url': ''}],
        }

    def request(self, operation, authenticated=True):
        for mocked in (self.Wiki, self.check_wiki_permission, self.save_wiki_config):
            mocked.reset_mock()
        view, method, url_name, kwargs, data = self.operations[operation]
        kwargs = dict(kwargs, wiki_id=self.wiki_id)
        request = getattr(self.factory, method)(reverse(url_name, kwargs=kwargs), data, format='json')
        if authenticated:
            force_authenticate(request, user=self.user)
        return view.as_view()(request, **kwargs)

    def assert_no_writes(self):
        self.save_wiki_config.assert_not_called()

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
