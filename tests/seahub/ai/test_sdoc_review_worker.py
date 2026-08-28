import re
import time
import uuid
from contextlib import nullcontext
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import jwt
from django.test import RequestFactory, SimpleTestCase, override_settings
from django.utils import timezone

from seahub.ai.models import ReviewDecisionSelection, ReviewTask
from seahub.ai.review_views import (
    ReviewTaskApproveView, ReviewTaskCancelView, ReviewTaskRejectView,
    ReviewTasksView, _filter_document_context_to_scope,
    _is_valid_revision_brief, _is_review_worker_request,
    _suggestion_is_within_task_scope, _review_target_key,
    _filter_unique_review_items, _has_duplicate_item_ids,
    _has_too_many_decision_items, _renew_review_worker_lease,
    _review_generation_expired, _is_safe_review_finish,
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


class SDocReviewDecisionStateTest(SimpleTestCase):
    def _request(self):
        request = RequestFactory().post('/')
        request.user = SimpleNamespace(username='reviewer@example.com')
        return request

    def _task(self, generation_status):
        return SimpleNamespace(
            id=uuid.uuid4(), requester='reviewer@example.com',
            generation_status=generation_status,
        )

    @patch('seahub.ai.review_views._get_review_task')
    def test_failed_task_cannot_be_approved(self, mock_get_task):
        task = self._task(ReviewTask.GENERATION_FAILED)
        mock_get_task.return_value = task

        response = ReviewTaskApproveView().post(self._request(), task.id)

        self.assertEqual(response.status_code, 409)

    @patch('seahub.ai.review_views._get_review_task')
    def test_cancelled_task_cannot_be_rejected(self, mock_get_task):
        task = self._task(ReviewTask.GENERATION_CANCELLED)
        mock_get_task.return_value = task

        response = ReviewTaskRejectView().post(self._request(), task.id)

        self.assertEqual(response.status_code, 409)

    def test_duplicate_selected_item_ids_are_rejected_before_creating_a_decision(self):
        self.assertTrue(_has_duplicate_item_ids(['item-1', 'item-1']))
        self.assertFalse(_has_duplicate_item_ids(['item-1', 'item-2']))

    def test_approval_batch_is_limited_to_ten_items(self):
        self.assertFalse(_has_too_many_decision_items(['item-%s' % index for index in range(10)]))
        self.assertTrue(_has_too_many_decision_items(['item-%s' % index for index in range(11)]))

    def test_card_item_can_only_belong_to_one_decision(self):
        self.assertIn(
            ('card_revision_item',),
            ReviewDecisionSelection._meta.unique_together,
        )

    def test_oracle_review_schema_has_the_orm_scope_and_target_fields(self):
        project_root = Path(__file__).resolve().parents[3]
        schema = (project_root / 'sql' / 'oracle.sql').read_text()
        task_match = re.search(
            r'CREATE TABLE "AI_REVIEW_TASK" \((.*?)\);', schema, re.DOTALL)
        item_match = re.search(
            r'CREATE TABLE "AI_REVIEW_CHANGE_ITEM" \((.*?)\);', schema, re.DOTALL)

        self.assertIsNotNone(task_match)
        self.assertIsNotNone(item_match)
        for field in (
                '"ALLOWED_BLOCK_IDS"', '"ALLOWED_TEXT_TARGETS"', '"SCOPE_SUMMARY"',
                '"SCOPE_SNAPSHOT_ID"', '"SCOPE_DOCUMENT_INCARNATION"', '"SCOPE_SDOC_VERSION"'):
            self.assertIn(field, task_match.group(1))
        self.assertIn('"TARGET_KEY"', item_match.group(1))
        self.assertIn('AI_REV_ITEM_REV_TARGET', item_match.group(1))


class SDocReviewScopeTest(SimpleTestCase):
    def setUp(self):
        self.task = SimpleNamespace(
            allowed_block_ids=['section-1', 'block-1', 'list-1'],
            allowed_text_targets=[{'block_id': 'block-1', 'text_node_id': 'text-1'}],
            scope_summary='Section 1',
        )
        self.context = {
            'blocks': [
                {'block_id': 'block-1', 'text_node_id': 'text-1'},
                {'block_id': 'block-2', 'text_node_id': 'text-2'},
            ],
            'lists': [
                {'block_id': 'list-1'},
                {'block_id': 'list-2'},
            ],
            'outline': [
                {'block_id': 'section-1', 'text': 'Section 1'},
                {'block_id': 'section-2', 'text': 'Section 2'},
            ],
        }

    def test_worker_context_is_limited_to_the_frozen_scope(self):
        context = _filter_document_context_to_scope(self.context, self.task)

        self.assertEqual(context['blocks'], [{'block_id': 'block-1', 'text_node_id': 'text-1'}])
        self.assertEqual(context['lists'], [{'block_id': 'list-1'}])
        self.assertEqual(context['outline'], [{'block_id': 'section-1', 'text': 'Section 1'}])

    def test_out_of_scope_text_suggestion_is_rejected(self):
        self.assertFalse(_suggestion_is_within_task_scope({
            'kind': 'replace_block_text', 'block_id': 'block-2', 'text_node_id': 'text-2',
        }, self.task))

    def test_long_review_requires_a_complete_brief(self):
        self.assertFalse(_is_valid_revision_brief({}))
        self.assertTrue(_is_valid_revision_brief({
            'goal': 'Improve clarity', 'tone': 'Concise', 'length': 'Preserve length',
            'terminology': ['SDoc'], 'heading_strategy': 'Preserve headings',
            'do_not_modify': 'Facts',
        }))

    def test_text_suggestions_for_the_same_node_share_a_global_target_key(self):
        first = _review_target_key('replace_block_text', {
            'block_id': 'block-1', 'text_node_id': 'text-1',
        })
        second = _review_target_key('replace_block_text', {
            'block_id': 'block-1', 'text_node_id': 'text-1',
        })

        self.assertEqual(first, second)

    def test_only_the_first_cross_chunk_suggestion_for_a_target_is_kept(self):
        first = SimpleNamespace(logical_item_id='first', target_key='text:block-1:text-1')
        second = SimpleNamespace(logical_item_id='second', target_key='text:block-1:text-1')

        items = _filter_unique_review_items([first, second], set(), set())

        self.assertEqual(items, [first])

    def test_expired_generation_rejects_late_worker_events(self):
        task = SimpleNamespace(
            generation_deadline_at=timezone.now() - timezone.timedelta(seconds=1))
        self.assertTrue(_review_generation_expired(task))

    def test_worker_lease_is_renewed_by_activity(self):
        task = MagicMock()
        now = timezone.now()

        _renew_review_worker_lease(task, now=now)

        self.assertGreater(task.generation_deadline_at, now)
        task.save.assert_called_once_with(
            update_fields=['generation_deadline_at', 'updated_at'])

    def test_finish_requires_all_chunks_unless_the_suggestion_limit_stopped_it(self):
        self.assertFalse(_is_safe_review_finish(3, 2, False, None))
        self.assertFalse(_is_safe_review_finish(3, 2, True, 'generation_timeout'))
        self.assertTrue(_is_safe_review_finish(3, 2, True, 'suggestion_limit_reached'))
        self.assertTrue(_is_safe_review_finish(3, 3, False, None))
