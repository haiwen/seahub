from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from seahub.ai.apis import Translate, WritingAssistant
from seahub.ai.utils import is_ai_usage_over_limit, resolve_repo_ai_usage_context
from seahub.base.accounts import User


class AIUsageLimitTest(SimpleTestCase):

    @patch('seahub.ai.utils.get_ai_cost_by_repo_owner', return_value=0.11)
    @patch('seahub.ai.utils.get_ai_credit_by_repo_owner', return_value=10)
    def test_non_org_usage_is_checked_by_repo_owner(self, mock_get_credit, mock_get_cost):
        self.assertTrue(is_ai_usage_over_limit(None, 'owner@example.com', None))
        mock_get_credit.assert_called_once_with('owner@example.com')
        mock_get_cost.assert_called_once_with('owner@example.com')

    @patch('seahub.ai.utils.get_ai_cost_by_org', return_value=0.11)
    @patch('seahub.ai.utils.get_ai_credit_by_repo_owner')
    @patch('seahub.ai.utils.get_ai_credit_by_user', return_value=10)
    def test_org_usage_keeps_shared_credit_pool(self, mock_get_org_credit, mock_get_owner_credit, mock_get_cost):
        user = object()

        self.assertTrue(is_ai_usage_over_limit(user, 'owner@example.com', 42))
        mock_get_org_credit.assert_called_once_with(user, 42)
        mock_get_owner_credit.assert_not_called()
        mock_get_cost.assert_called_once_with(42)


class AIUsageContextTest(SimpleTestCase):

    @patch('seahub.ai.utils._get_group_creator', return_value='creator@example.com')
    @patch('seahub.ai.utils._get_repo_owner', return_value='7@seafile_group')
    @patch('seahub.ai.utils.get_org_id_by_repo_id', return_value=-1)
    def test_group_owned_repo_is_attributed_to_group_creator(self, mock_get_org_id, mock_get_owner, mock_get_creator):
        context = resolve_repo_ai_usage_context('caller@example.com', 'repo-id')

        self.assertEqual(context['repo_owner'], 'creator@example.com')
        self.assertEqual(context['group_id'], 7)
        self.assertIsNone(context['org_id'])

    @patch('seahub.ai.utils._get_repo_owner', return_value='owner@example.com')
    @patch('seahub.ai.utils.get_org_id_by_repo_id', return_value=-1)
    def test_repo_context_overrides_callers_org(self, mock_get_org_id, mock_get_owner):
        context = resolve_repo_ai_usage_context('caller@example.com', 'repo-id', org_id=42)

        self.assertIsNone(context['org_id'])


class AIRepoContextAPITest(SimpleTestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User('caller@example.com')
        self.user.id = 1

    @patch('seahub.ai.apis.verify_ai_config', return_value=True)
    def test_translate_requires_repo_id(self, mock_verify_ai_config):
        request = self.factory.post('/api/v2.1/ai/translate/', {
            'text': 'hello',
            'lang': 'zh-cn',
        }, format='json')
        force_authenticate(request, user=self.user)

        response = Translate.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, {'error_msg': 'repo_id invalid'})

    @patch('seahub.ai.apis.verify_ai_config', return_value=True)
    def test_writing_assistant_requires_repo_id(self, mock_verify_ai_config):
        request = self.factory.post('/api/v2.1/ai/writing-assistant/', {
            'text': 'hello',
            'writing_type': 'continue_writing',
        }, format='json')
        force_authenticate(request, user=self.user)

        response = WritingAssistant.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, {'error_msg': 'repo_id invalid'})
