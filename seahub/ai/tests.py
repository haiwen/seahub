from types import SimpleNamespace
from unittest.mock import Mock, patch

import requests
from django.test import SimpleTestCase

from seahub.ai.apis import GenerateCoverImage
from seahub.api2.endpoints.wiki2 import Wiki2PageConfigView
from seahub.ai.utils import generate_cover_image


class GenerateCoverImageTest(SimpleTestCase):
    def setUp(self):
        self.request = SimpleNamespace(
            user=SimpleNamespace(username='editor@example.test'),
            data={'wiki_id': '00000000-0000-0000-0000-000000000001',
                  'page_id': 'page', 'prompt': 'landscape'},
        )
        targets = {
            'configured': 'seahub.ai.apis.verify_ai_config',
            'repo': 'seahub.ai.apis.seafile_api.get_repo',
            'wiki_repo': 'seahub.ai.apis.is_wiki_repo',
            'wiki': 'seahub.wiki2.models.Wiki2.objects.get',
            'permission': 'seahub.wiki2.utils.check_wiki_permission',
            'config': 'seahub.wiki2.utils.get_wiki_config',
            'generate': 'seahub.ai.utils.generate_cover_image',
        }
        for name, target in targets.items():
            patcher = patch(target)
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)
        self.configured.return_value = True
        self.wiki_repo.return_value = True
        self.wiki.return_value = SimpleNamespace(repo_id=self.request.data['wiki_id'])
        self.permission.return_value = 'rw'
        self.config.return_value = {'pages': [{'id': 'page', 'docUuid': 'doc'}]}
        self.generate.return_value = Mock(
            status_code=200, headers={'Content-Type': 'image/png'},
            content=b'\x89PNG\r\n\x1a\nvalidated-by-ai-service',
        )

    def test_success_returns_private_binary(self):
        response = GenerateCoverImage().post(self.request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Cache-Control'], 'no-store')
        self.generate.assert_called_once_with({'prompt': 'landscape'})

    def test_read_only_or_cross_library_access_does_not_generate(self):
        for permission in ('r', None):
            self.permission.return_value = permission
            response = GenerateCoverImage().post(self.request)
            self.assertEqual(response.status_code, 403)
        self.generate.assert_not_called()

    def test_missing_page_does_not_generate(self):
        self.config.return_value = {'pages': []}
        self.assertEqual(GenerateCoverImage().post(self.request).status_code, 404)
        self.generate.assert_not_called()

    def test_unconfigured_and_invalid_prompt(self):
        self.configured.return_value = False
        self.assertEqual(GenerateCoverImage().post(self.request).status_code, 503)
        self.configured.return_value = True
        self.request.data['prompt'] = ' '
        self.assertEqual(GenerateCoverImage().post(self.request).status_code, 400)
        self.generate.assert_not_called()

    def test_timeout_rate_limit_and_invalid_binary(self):
        self.generate.side_effect = requests.Timeout
        self.assertEqual(GenerateCoverImage().post(self.request).status_code, 504)
        self.generate.side_effect = None
        self.generate.return_value.status_code = 429
        self.assertEqual(GenerateCoverImage().post(self.request).status_code, 429)
        self.generate.return_value.status_code = 200
        self.generate.return_value.content = b'not png'
        self.assertEqual(GenerateCoverImage().post(self.request).status_code, 502)

    def test_access_revoked_during_generation(self):
        self.permission.side_effect = ['rw', 'r']
        self.assertEqual(GenerateCoverImage().post(self.request).status_code, 403)

    def test_read_only_cannot_save_cover_config(self):
        self.permission.return_value = 'r'
        self.request.data = {'page_cover': '/cover.png'}
        with patch('seahub.api2.endpoints.wiki2.get_repo_owner', return_value='owner'), \
                patch('seahub.api2.endpoints.wiki2.check_wiki_permission', return_value='r'), \
                patch('seahub.api2.endpoints.wiki2.save_wiki_config') as save:
            response = Wiki2PageConfigView().put(self.request, self.wiki.return_value.repo_id, 'page')
        self.assertEqual(response.status_code, 403)
        save.assert_not_called()


class CoverImageForwardingTest(SimpleTestCase):
    def test_bounded_binary_forwarding_without_retry(self):
        response = Mock(status_code=200)
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.iter_content.return_value = [b'png']
        with patch('seahub.ai.utils.gen_headers', return_value={}), \
                patch('seahub.ai.utils.requests.post', return_value=response) as post:
            result = generate_cover_image({'prompt': 'mountains'})
        self.assertEqual(result._content, b'png')
        post.assert_called_once()
        self.assertFalse(post.call_args.kwargs['allow_redirects'])
        self.assertTrue(post.call_args.kwargs['stream'])

    def test_oversized_response_is_rejected(self):
        response = Mock(status_code=200)
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.iter_content.return_value = [b'x' * (16 * 1024 * 1024 + 1)]
        with patch('seahub.ai.utils.gen_headers', return_value={}), \
                patch('seahub.ai.utils.requests.post', return_value=response):
            with self.assertRaises(requests.RequestException):
                generate_cover_image({'prompt': 'mountains'})
