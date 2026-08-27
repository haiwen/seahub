import time
import uuid
from contextlib import nullcontext
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import jwt
from django.test import RequestFactory, SimpleTestCase, override_settings

from seahub.ai.models import ReviewTask
from seahub.ai.review_views import (
    ReviewTaskCancelView, ReviewTasksView, _is_review_worker_request,
)
from seahub.ai.sdoc_intent import route_sdoc_prompt
from seahub.ai.utils import enqueue_sdoc_review_apply_attempt, enqueue_sdoc_review_task


INTERNAL_KEY = 'internal-review-key-at-least-32-bytes-long'


class SDocReviewIntentTest(SimpleTestCase):
    def test_summary_uses_existing_answer_path(self):
        self.assertEqual(route_sdoc_prompt('总结全文'), 'answer')

    def test_explicit_edit_uses_review_path(self):
        self.assertEqual(route_sdoc_prompt('改进设计原则的内容'), 'review')

    def test_english_edit_uses_review_path(self):
        self.assertEqual(route_sdoc_prompt('Improve the design principles section'), 'review')

    def test_mixed_unsupported_write_is_rejected(self):
        self.assertEqual(route_sdoc_prompt('分析并合并单元格'), 'unsupported_write')

    def test_diagnostic_question_does_not_create_review(self):
        self.assertEqual(route_sdoc_prompt('分析哪些地方需要修改'), 'answer')


@override_settings(JWT_PRIVATE_KEY=INTERNAL_KEY)
class SDocReviewWorkerAuthenticationTest(SimpleTestCase):
    def _request(self, **claims):
        payload = {
            'exp': int(time.time()) + 60,
            'is_internal': True,
            'purpose': 'sdoc_review_worker',
            'audience': 'seahub_sdoc_review',
        }
        payload.update(claims)
        token = jwt.encode(payload, INTERNAL_KEY, algorithm='HS256')
        return RequestFactory().post('/', HTTP_AUTHORIZATION='Token %s' % token)

    def test_accepts_scoped_worker_token(self):
        self.assertTrue(_is_review_worker_request(self._request()))

    def test_rejects_token_for_another_purpose(self):
        self.assertFalse(_is_review_worker_request(self._request(purpose='other')))


class SDocReviewEnqueueTest(SimpleTestCase):
    @patch('seahub.ai.utils.requests.post')
    @patch('seahub.ai.utils.SECRET_KEY', INTERNAL_KEY)
    @patch('seahub.ai.utils.SEAFEVENTS_SERVER_URL', 'http://seafevents:8082')
    def test_enqueues_persisted_task_with_existing_seafevents_auth(self, mock_post):
        mock_post.return_value = SimpleNamespace(ok=True, text='')

        enqueue_sdoc_review_task('00000000-0000-4000-8000-000000000001')

        url = mock_post.call_args.args[0]
        kwargs = mock_post.call_args.kwargs
        self.assertEqual(url, 'http://seafevents:8082/add-sdoc-review-task')
        self.assertEqual(kwargs['json']['task_id'], '00000000-0000-4000-8000-000000000001')
        self.assertEqual(kwargs['timeout'], 5)
        token = kwargs['headers']['Authorization'].split()[1]
        jwt.decode(token, INTERNAL_KEY, algorithms=['HS256'])

    @patch('seahub.ai.utils.requests.post')
    @patch('seahub.ai.utils.SECRET_KEY', INTERNAL_KEY)
    @patch('seahub.ai.utils.SEAFEVENTS_SERVER_URL', 'http://seafevents:8082')
    def test_enqueues_apply_reconciliation(self, mock_post):
        mock_post.return_value = SimpleNamespace(ok=True, text='')

        enqueue_sdoc_review_apply_attempt('00000000-0000-4000-8000-000000000002')

        url = mock_post.call_args.args[0]
        kwargs = mock_post.call_args.kwargs
        self.assertEqual(url, 'http://seafevents:8082/add-sdoc-review-apply-attempt')
        self.assertEqual(
            kwargs['json']['apply_attempt_id'],
            '00000000-0000-4000-8000-000000000002')


class SDocReviewChunkReceiptTest(SimpleTestCase):
    @patch('seahub.ai.review_views.ReviewTask.objects.filter')
    @patch('seahub.ai.review_views.ReviewChangeItem.objects.filter')
    @patch('seahub.ai.review_views.ReviewGenerationChunk.objects.get_or_create')
    @patch('seahub.ai.review_views.transaction.atomic', return_value=nullcontext())
    def test_duplicate_chunk_does_not_advance_progress_twice(
            self, _mock_atomic, mock_get_or_create, mock_items_filter,
            mock_task_filter):
        receipt = MagicMock(created_item_count=0)
        mock_get_or_create.side_effect = [(receipt, True), (receipt, False)]
        existing_items = MagicMock()
        existing_items.count.return_value = 0
        existing_items.aggregate.return_value = {'max_order': None}
        existing_items.values_list.return_value = []
        mock_items_filter.return_value = existing_items

        task = SimpleNamespace(
            id=uuid.uuid4(), file_uuid=str(uuid.uuid4()),
            generation_attempt_id=uuid.uuid4())
        changeset = SimpleNamespace()
        card = SimpleNamespace()
        document_context = {'document_incarnation': str(uuid.uuid4())}
        view = ReviewTasksView()

        first = view._persist_chunk(
            task, changeset, card, document_context, 0, 2, [])
        second = view._persist_chunk(
            task, changeset, card, document_context, 0, 2, [])

        self.assertEqual(first['created_count'], 0)
        self.assertTrue(second['duplicate'])
        mock_task_filter.return_value.update.assert_called_once()


class SDocReviewCancelTest(SimpleTestCase):
    @patch('seahub.ai.review_views.ChatSessions.objects.filter')
    @patch('seahub.ai.review_views.ReviewGenerationChunk.objects.filter')
    @patch('seahub.ai.review_views.ReviewChangeSetRevision.objects.filter')
    @patch('seahub.ai.review_views.ReviewCardRevision.objects.filter')
    @patch('seahub.ai.review_views.ReviewTask.objects.select_for_update')
    @patch('seahub.ai.review_views.get_sdoc_review_target')
    @patch('seahub.ai.review_views._get_review_task')
    @patch('seahub.ai.review_views.transaction.atomic', return_value=nullcontext())
    def test_cancel_discards_draft_and_marks_task_cancelled(
            self, _mock_atomic, mock_get_task, mock_get_target,
            mock_select_for_update, mock_card_filter, mock_changeset_filter,
            mock_chunk_filter, mock_session_filter):
        assistant_message = MagicMock(content='Reviewing the document…')
        task = SimpleNamespace(
            id=uuid.uuid4(), requester='reviewer@example.com',
            repo_id='repo-id', path='/document.sdoc',
            chat_session_id=str(uuid.uuid4()), assistant_message_id=1,
            assistant_message=assistant_message,
            generation_status=ReviewTask.GENERATION_READING,
            save=MagicMock(), to_dict=MagicMock(),
        )
        task.to_dict.return_value = {'generation_status': ReviewTask.GENERATION_CANCELLED}
        mock_get_task.return_value = task
        mock_get_target.return_value = (MagicMock(), None)
        mock_select_for_update.return_value.select_related.return_value.filter.return_value.first.return_value = task
        mock_card_filter.return_value.values_list.return_value = []
        mock_changeset_filter.return_value.values_list.return_value = []

        request = RequestFactory().post('/')
        request.user = SimpleNamespace(username='reviewer@example.com')
        response = ReviewTaskCancelView().post(request, task.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(task.generation_status, ReviewTask.GENERATION_CANCELLED)
        self.assertIsNone(task.generation_attempt_id)
        self.assertEqual(task.generation_stop_reason, 'cancelled_by_user')
        self.assertEqual(assistant_message.content, 'Review stopped.')
        assistant_message.save.assert_called_once()
        mock_chunk_filter.return_value.delete.assert_called_once()
        mock_session_filter.return_value.update.assert_called_once()
