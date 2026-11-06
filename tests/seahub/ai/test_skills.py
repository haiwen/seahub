from unittest.mock import patch
from types import SimpleNamespace

from django.test import SimpleTestCase

from seahub.ai.apis import ChatSdocCreateView
from seahub.ai.skills import extract_skill_command


class SkillCommandTest(SimpleTestCase):
    def test_extracts_leading_command_only(self):
        self.assertEqual(extract_skill_command('/sdoc-create Task'), ('sdoc-create', 'Task'))
        self.assertEqual(extract_skill_command('Create an sdoc'), (None, 'Create an sdoc'))
        self.assertEqual(extract_skill_command('Example /sdoc-create Task'), (None, 'Example /sdoc-create Task'))

    @patch('seahub.ai.apis.create_sdoc')
    @patch('seahub.ai.apis.cache.get', return_value={'message_id': 'abcd'})
    @patch('seahub.ai.apis.ChatSessions.objects.get_session_by_uuid')
    def test_creation_endpoint_requires_skill_in_current_task(self, mock_session, mock_cache, mock_create):
        mock_session.return_value = SimpleNamespace(repo_id='repo-id', username='user@example.com')
        request = SimpleNamespace(auth={'repo_id': 'repo-id', 'session_uuid': 'session-id', 'message_id': 'abcd'},
                                  user=SimpleNamespace(username='user@example.com'))
        self.assertEqual(ChatSdocCreateView().post(request).status_code, 403)
        mock_create.assert_not_called()
