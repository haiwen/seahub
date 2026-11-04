from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from seahub.ai.models import ChatMessages
from seahub.ai.utils import record_message_to_db


class ToolMessageTest(SimpleTestCase):
    content = ('Before\n\n<seadoc status="created" name="Plan.sdoc" '
               'path="/AI Generated/Plan.sdoc" doc_uuid="doc-id" />\n\nAfter')

    def test_message_serialization_preserves_inline_tool_result(self):
        message = ChatMessages(role='assistant', content=self.content, sources='[]', attachments='[]')

        result = message.to_dict()

        self.assertEqual(result['content'], self.content)
        self.assertNotIn('artifacts', result)
        self.assertNotIn('artifacts', [field.name for field in ChatMessages._meta.fields])

    @patch('seahub.ai.utils.ChatSessions.objects.filter')
    @patch('seahub.ai.utils.ChatMessages.objects.create_message')
    def test_records_tool_result_as_content_only(self, mock_create, mock_filter):
        mock_create.side_effect = [SimpleNamespace(id=1), SimpleNamespace(id=2)]

        result = record_message_to_db(
            {'ai_reply': self.content, 'sources': []}, 'session-id', 'abcd', 'Create a document', [])

        self.assertEqual(result['ai_reply'], self.content)
        self.assertEqual(result['ai_reply_message_id'], 2)
        self.assertNotIn('artifacts', result)
        self.assertEqual(mock_create.call_args.args, ('session-id', 'abcd', 'assistant', self.content))
        self.assertEqual(mock_create.call_args.kwargs, {'sources': '[]'})
        mock_filter.return_value.update.assert_called_once()
