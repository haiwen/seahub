import re
import time
import uuid
from contextlib import ExitStack, nullcontext
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import jwt
from django.test import RequestFactory, SimpleTestCase, override_settings
from django.utils import timezone

from seahub.ai.models import ApplyAttempt, ChatMessages, ReviewDecisionSelection, ReviewTask
from seahub.ai.review_views import (
    ReviewTaskApproveView, ReviewTaskCancelView, ReviewTaskRejectView,
    ReviewTasksView, _filter_document_context_to_scope,
    _document_context_matches_task_snapshot,
    _is_valid_revision_brief, _is_review_worker_request,
    _suggestion_is_within_task_scope, _review_target_key,
    _filter_unique_review_items, _has_duplicate_item_ids,
    _has_too_many_decision_items, _renew_review_worker_lease,
    _review_generation_expired, _is_safe_review_finish,
    _sdoc_apply_result_from_error,
    _update_apply_persistence,
    _build_card_dict, _map_suggestions, ReviewWorkerPendingView,
    ReviewWorkerApplyReconcileView, _decided_item_ids,
    _release_undispatched_apply, _claim_apply_dispatch,
)
from seahub.ai.utils import (
    enqueue_sdoc_review_apply_attempt, enqueue_sdoc_review_task,
    understand_sdoc_request, SdocRequestUnderstandingError,
)
from seahub.seadoc.sdoc_server_api import SdocServerAPI


INTERNAL_KEY = 'internal-review-key-at-least-32-bytes-long'


class SDocReviewLibraryCapabilityTest(SimpleTestCase):
    def setUp(self):
        stack = ExitStack()
        self.addCleanup(stack.close)

        def mock(name, value=None):
            return stack.enter_context(patch(
                'seahub.ai.review_views.' + name, return_value=value))

        mock('get_sdoc_review_target', (SimpleNamespace(uuid='doc', filename='test.sdoc'), None))
        mock('verify_chat_ai_config', True)
        mock('user_passes_ai_chat_folder_permissions', True)
        mock('_get_session', SimpleNamespace(pk=1))
        mock('get_running_sdoc_review_task')
        mock('resolve_repo_ai_usage_context', {'repo_owner': 'owner', 'org_id': None})
        mock('is_ai_usage_over_limit', False)
        mock('gen_message_id', 'message')
        cache_mock = stack.enter_context(patch('seahub.ai.review_views.cache'))
        cache_mock.get.return_value = None
        self.fetch = mock('_fetch_document_context', {
            'snapshot_id': 'snapshot', 'document_incarnation': 'incarnation',
            'exact_sdoc_version': 1,
            'blocks': [{'block_id': 'p1', 'text_node_id': 't1', 'supported': True}],
            'lists': [],
        })
        self.understand = mock('understand_sdoc_request', {
            'route': 'review', 'instruction': 'Revise the first paragraph.',
            'scope': {'allowed_block_ids': ['p1'], 'allowed_text_targets': [
                {'block_id': 'p1', 'text_node_id': 't1', 'operation': {'kind': 'rewrite'}}]},
        })
        self.tasks = stack.enter_context(patch('seahub.ai.review_views.ReviewTask.objects'))
        self.tasks.filter.return_value.exists.return_value = False
        self.attempts = stack.enter_context(patch('seahub.ai.review_views.ApplyAttempt.objects'))
        self.attempts.filter.return_value.exists.return_value = False
        self.messages = stack.enter_context(patch('seahub.ai.review_views.ChatMessages.objects'))
        stack.enter_context(patch('seahub.ai.review_views.ChatSessions.objects'))
        stack.enter_context(patch(
            'seahub.ai.review_views.transaction.atomic', side_effect=lambda: nullcontext()))
        self.enqueue = mock('enqueue_sdoc_review_task')
        stack.enter_context(patch('seahub.ai.apis.verify_chat_ai_config', return_value=True))
        self.metadata = stack.enter_context(patch('seahub.ai.apis.RepoMetadata.objects.filter'))
        self.metadata.return_value.first.return_value = SimpleNamespace(
            enabled=True, summary_enabled=True)

    def _request(self):
        request = SimpleNamespace(
            data={'repo_id': 'repo', 'path': '/test.sdoc', 'prompt': 'Revise this paragraph.',
                  'session_uuid': 'existing-session'},
            user=SimpleNamespace(username='reviewer@example.com', org=None))
        return ReviewTasksView().post(request)

    def test_disabled_library_blocks_existing_session_before_document_or_model(self):
        for metadata in (None, SimpleNamespace(enabled=False, summary_enabled=True),
                         SimpleNamespace(enabled=True, summary_enabled=False)):
            with self.subTest(metadata=metadata):
                self.metadata.return_value.first.return_value = metadata
                response = self._request()
                self.assertEqual(response.status_code, 403)
                self.fetch.assert_not_called()
                self.understand.assert_not_called()
                self.tasks.create.assert_not_called()
                self.messages.create_message.assert_not_called()
                self.enqueue.assert_not_called()

    def test_enabled_library_allows_existing_session_to_create_review(self):
        self.assertEqual(self._request().status_code, 202)
        self.metadata.assert_called_once_with(repo_id='repo')
        self.fetch.assert_called_once()
        self.understand.assert_called_once()
        self.tasks.create.assert_called_once()
        self.enqueue.assert_called_once_with(self.tasks.create.return_value.id)


class SDocReviewRequestSizeTest(SimpleTestCase):
    @patch('seahub.ai.review_views.transaction.atomic', return_value=nullcontext())
    @patch('seahub.ai.review_views.ReviewDecisionSelection.objects.filter')
    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    def test_expired_undispatched_claim_releases_selection_atomically(self, attempts, selections, _atomic):
        attempt = SimpleNamespace(id=uuid.uuid4(), review_decision_id=uuid.uuid4())
        now = timezone.now()
        attempts.return_value.update.return_value = 1
        self.assertTrue(_release_undispatched_apply(attempt, now))
        attempts.assert_called_once_with(
            id=attempt.id, status=ApplyAttempt.STATUS_PENDING,
            created_at__lt=now - timezone.timedelta(seconds=60))
        selections.assert_called_once_with(decision_id=attempt.review_decision_id)
        selections.return_value.delete.assert_called_once()

    @patch('seahub.ai.review_views.transaction.atomic', return_value=nullcontext())
    @patch('seahub.ai.review_views.ReviewDecisionSelection.objects.filter')
    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    def test_dispatch_winner_prevents_release(self, attempts, selections, _atomic):
        attempts.return_value.update.return_value = 0
        self.assertFalse(_release_undispatched_apply(
            SimpleNamespace(id=uuid.uuid4(), review_decision_id=uuid.uuid4()), timezone.now()))
        selections.assert_not_called()

    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    def test_released_claim_cannot_dispatch(self, attempts):
        attempts.return_value.update.return_value = 0
        attempt = SimpleNamespace(id=uuid.uuid4())
        self.assertFalse(_claim_apply_dispatch(attempt))
        attempts.assert_called_once_with(id=attempt.id, status=ApplyAttempt.STATUS_PENDING)
        attempts.return_value.update.return_value = 1
        self.assertTrue(_claim_apply_dispatch(attempt))

    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    def test_dispatch_atomically_starts_the_reconciliation_deadline(self, attempts):
        now = timezone.now()
        with patch('seahub.ai.review_views.timezone.now', return_value=now):
            self.assertTrue(_claim_apply_dispatch(SimpleNamespace(id='attempt')))
        fields = attempts.return_value.update.call_args.kwargs
        self.assertEqual(fields['status'], ApplyAttempt.STATUS_COMMITTING)
        self.assertEqual(fields['result_query_deadline_at'], now + timezone.timedelta(seconds=60))

    def test_frozen_scope_carries_literal_operation(self):
        operation = {'kind': 'remove_text', 'old_text': '*', 'new_text': '', 'occurrences': 'all'}
        task = SimpleNamespace(
            allowed_block_ids=['p2'], scope_summary='Paragraphs: 2',
            allowed_text_targets=[{'block_id': 'p2', 'text_node_id': 't2', 'operation': operation}])
        context = _filter_document_context_to_scope({
            'blocks': [{'block_id': 'p1', 'text_node_id': 't1'},
                       {'block_id': 'p2', 'text_node_id': 't2'}],
            'lists': [], 'outline': [],
        }, task)
        self.assertTrue(context['review_scope_frozen'])
        self.assertEqual(context['review_operation'], operation)
        self.assertEqual([block['block_id'] for block in context['blocks']], ['p2'])

    def test_literal_operation_rejects_unrequested_prose_changes(self):
        task = SimpleNamespace(allowed_block_ids=['p2'], allowed_text_targets=[{
            'block_id': 'p2', 'text_node_id': 't2',
            'operation': {'kind': 'remove_text', 'old_text': '*', 'new_text': '', 'occurrences': 'all'},
        }])
        suggestion = {
            'kind': 'replace_block_text', 'block_id': 'p2', 'text_node_id': 't2',
            'before_leaf_text': '**Keep** 2026.\nNext line.',
            'after_text': 'Keep 2026.\nNext line.',
        }
        self.assertTrue(_suggestion_is_within_task_scope(suggestion, task))
        self.assertFalse(_suggestion_is_within_task_scope(
            dict(suggestion, after_text='Rewritten prose.'), task))
        self.assertFalse(_suggestion_is_within_task_scope(
            dict(suggestion, block_id='p1'), task))

    def _body(self, texts):
        return SdocServerAPI.build_review_request({
            'selected_items': [
                {'kind': 'replace_block_text', 'target': {'block_id': str(index)},
                 'after_text': text}
                for index, text in enumerate(texts)
            ],
        })

    def test_rejects_escaped_wire_body_but_accepts_smaller_batches(self):
        texts = ['中' * 9000] * 10
        self.assertEqual(SdocServerAPI.validate_review_request(self._body(texts)),
                         'review_request_too_large')
        self.assertIsNone(SdocServerAPI.validate_review_request(self._body(texts[:5])))

    def test_checks_utf8_text_limit(self):
        self.assertEqual(
            SdocServerAPI.validate_review_request(self._body(['中' * 87382])),
            'review_text_too_large')
        self.assertIsNone(SdocServerAPI.validate_review_request(self._body(['a' * (256 * 1024)])))

    def test_counts_review_metadata_in_request_limit(self):
        body = self._body(['small'])
        body['review']['metadata'] = 'a' * (1024 * 1024)
        self.assertEqual(SdocServerAPI.validate_review_request(body),
                         'review_request_too_large')

    def test_accepts_attribute_commands(self):
        body = SdocServerAPI.build_review_request({'selected_items': [
            {'kind': 'set_block_type', 'target': {'block_id': 'block'},
             'after_type': 'header2'},
        ]})
        self.assertIsNone(SdocServerAPI.validate_review_request(body))

    def test_accepts_delete_and_mixed_commands(self):
        deleted = {'kind': 'delete_block', 'target': {'block_id': 'block'}}
        for items in ([deleted], [deleted, {
                'kind': 'replace_block_text', 'target': {'block_id': 'other'},
                'after_text': 'Updated'}]):
            body = SdocServerAPI.build_review_request({'selected_items': items})
            self.assertNotIn('payload', body['commands'][0])
            self.assertIsNone(SdocServerAPI.validate_review_request(body))

    def test_frozen_text_operations_accept_cell_kind(self):
        for operation in (
                {'kind': 'rewrite'},
                {'kind': 'remove_text', 'old_text': '*', 'new_text': '', 'occurrences': 'all'},
                {'kind': 'replace_text', 'old_text': '*', 'new_text': '', 'occurrences': 'all'}):
            task = SimpleNamespace(allowed_block_ids=['cell'], allowed_text_targets=[{
                'block_id': 'cell', 'text_node_id': 'text', 'operation': operation}])
            suggestion = {'kind': 'replace_table_cell_text', 'block_id': 'cell',
                          'text_node_id': 'text', 'before_leaf_text': '*Text*',
                          'after_text': 'Text'}
            self.assertTrue(_suggestion_is_within_task_scope(suggestion, task))
            self.assertFalse(_suggestion_is_within_task_scope(
                dict(suggestion, kind='delete_block'), task))


class SDocReviewApplyStateTest(SimpleTestCase):
    @patch('seahub.ai.review_views.transaction.atomic', return_value=nullcontext())
    @patch('seahub.ai.review_views.ReviewDecisionSelection.objects.filter')
    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    def test_confirmed_abort_releases_selections_only_on_active_attempt(self, attempts, selections, _atomic):
        attempt = SimpleNamespace(id='attempt', review_decision_id='decision')
        attempts.return_value.update.return_value = 1
        ReviewTaskApproveView()._map_apply_result(attempt, {
            'status': 'failed_precommit', 'error_code': 'apply_interrupted'})
        selections.assert_called_once_with(decision_id='decision')
        selections.return_value.delete.assert_called_once()
        self.assertEqual(attempts.call_args.kwargs['status__in'], ('committing', 'outcome_unknown'))
        selections.reset_mock()
        attempts.return_value.update.return_value = 0
        ReviewTaskApproveView()._map_apply_result(attempt, {
            'status': 'failed_precommit', 'error_code': 'apply_interrupted'})
        selections.assert_not_called()

    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    def test_late_unknown_cannot_overwrite_a_terminal_result(self, attempts):
        ReviewTaskApproveView()._mark_outcome_unknown(SimpleNamespace(id='attempt'))
        self.assertEqual(attempts.call_args.kwargs['status__in'], ('committing', 'outcome_unknown'))

    @patch('seahub.seadoc.sdoc_server_api.requests.post')
    def test_abort_client_sends_no_modification_commands(self, post):
        post.return_value = SimpleNamespace(status_code=200, text='{"status":"failed_precommit"}')
        api = SdocServerAPI('doc', 'test.sdoc', 'reviewer', access_token='token')
        self.assertEqual(api.abort_review_apply('abort-token', 'attempt')['status'], 'failed_precommit')
        self.assertTrue(post.call_args.args[0].endswith('/element-commands/attempt/abort/?from=seahub'))
        self.assertEqual(post.call_args.kwargs['json'], {})
        self.assertEqual(post.call_args.kwargs['timeout'], 5)

    @patch('seahub.ai.review_views.generate_sdoc_service_token', return_value='token')
    @patch('seahub.ai.review_views.SdocServerAPI')
    def test_abort_checks_receipt_identity_and_keeps_original_file_identity(self, api, token):
        task = SimpleNamespace(file_uuid='original-file', path='/test.sdoc')
        attempt = SimpleNamespace(apply_attempt_id='attempt', apply_payload_digest='digest',
                                  approved_by='reviewer', review_decision=SimpleNamespace(
                                      card_revision=SimpleNamespace(review_task=task)))
        receipt = {'apply_attempt_id': 'attempt', 'apply_payload_digest': 'digest',
                   'doc_uuid': 'original-file', 'status': 'failed_precommit', 'error_code': 'apply_interrupted'}
        api.return_value.abort_review_apply.return_value = receipt
        self.assertEqual(ReviewTaskApproveView()._abort_apply(attempt), receipt)
        self.assertEqual(token.call_args.args[0], 'original-file')
        api.return_value.abort_review_apply.return_value = dict(receipt, doc_uuid='new-file')
        self.assertIsNone(ReviewTaskApproveView()._abort_apply(attempt))

    @patch('seahub.ai.review_views.transaction.atomic', return_value=nullcontext())
    @patch('seahub.ai.review_views.ApplyAttempt.objects.select_for_update')
    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    def test_save_transitions_are_monotonic(self, mock_filter, mock_lock, _atomic):
        cases = (
            ('not_requested', 'save_pending', 'save_pending'),
            ('save_pending', 'not_requested', 'save_pending'),
            ('save_pending', 'persisted', 'persisted'),
            ('persisted', 'save_pending', 'persisted'),
            ('file_unavailable', 'not_requested', 'file_unavailable'),
            ('persisted', 'persisted', 'persisted'),
        )
        for current, incoming, expected in cases:
            mock_lock.return_value.filter.return_value.first.return_value = SimpleNamespace(
                persistence_status=current, applied_sdoc_version=5)
            self.assertTrue(_update_apply_persistence('attempt', incoming, applied_sdoc_version=5))
            self.assertEqual(mock_filter.return_value.update.call_args.kwargs[
                'persistence_status'], expected)
        mock_filter.reset_mock()
        self.assertFalse(_update_apply_persistence('attempt', 'file_unavailable', applied_sdoc_version=5))
        self.assertFalse(_update_apply_persistence('attempt', 'persisted', applied_sdoc_version=6))
        self.assertFalse(_update_apply_persistence('attempt', 'unknown'))
        mock_filter.return_value.update.assert_not_called()

    @patch('seahub.ai.review_views.transaction.atomic', return_value=nullcontext())
    @patch('seahub.ai.review_views.ApplyAttempt.objects.select_for_update')
    def test_late_apply_response_preserves_save_terminal(self, mock_lock, _atomic):
        for terminal in (ApplyAttempt.PERSISTENCE_PERSISTED,
                         ApplyAttempt.PERSISTENCE_FILE_UNAVAILABLE):
            row = SimpleNamespace(id=uuid.uuid4(), persistence_status=terminal,
                                  applied_sdoc_version=5)
            mock_lock.return_value.filter.return_value.first.return_value = row
            with patch('seahub.ai.review_views.ApplyAttempt.objects.filter') as mock_filter:
                ReviewTaskApproveView()._map_apply_result(row, {
                    'status': 'applied', 'applied_sdoc_version': 5,
                    'persistence_status': 'not_requested'})
                self.assertEqual(mock_filter.return_value.update.call_args.kwargs[
                    'persistence_status'], terminal)

    def test_missing_document_retains_structured_failure(self):
        result = _sdoc_apply_result_from_error(ConnectionError(
            404, '{"status":"failed_precommit","error_code":"document_unavailable"}'))
        self.assertEqual(result['error_code'], 'document_unavailable')

    @patch('seahub.ai.review_views._update_apply_persistence')
    def test_durable_pending_receipt_maps_to_save_pending(self, mock_update):
        ReviewTaskApproveView()._map_apply_result(SimpleNamespace(id='attempt'), {
            'status': 'applied', 'persistence_status': 'pending', 'applied_sdoc_version': 5})
        self.assertEqual(mock_update.call_args.args, ('attempt', ApplyAttempt.PERSISTENCE_SAVE_PENDING))

    @patch('seahub.ai.review_views.transaction.atomic', return_value=nullcontext())
    @patch('seahub.ai.review_views.ApplyAttempt.objects.select_for_update')
    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    def test_verified_save_promotes_only_indeterminate_attempts(
            self, mock_filter, mock_lock, _atomic):
        unknown = SimpleNamespace(
            persistence_status='not_requested', applied_sdoc_version=None,
            status=ApplyAttempt.STATUS_OUTCOME_UNKNOWN)
        mock_lock.return_value.filter.return_value.first.return_value = unknown
        self.assertTrue(_update_apply_persistence(
            'attempt', 'persisted', applied_sdoc_version=8,
            status=ApplyAttempt.STATUS_APPLIED, error_code=None))
        self.assertEqual(mock_filter.return_value.update.call_args.kwargs['status'], 'applied')
        self.assertIsNone(mock_filter.return_value.update.call_args.kwargs['error_code'])

        failed = SimpleNamespace(
            persistence_status='not_requested', applied_sdoc_version=None,
            status=ApplyAttempt.STATUS_FAILED_PRECOMMIT)
        mock_lock.return_value.filter.return_value.first.return_value = failed
        mock_filter.reset_mock()
        self.assertTrue(_update_apply_persistence(
            'attempt', 'persisted', applied_sdoc_version=8,
            status=ApplyAttempt.STATUS_APPLIED, error_code=None))
        self.assertNotIn('status', mock_filter.return_value.update.call_args.kwargs)


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
    def test_new_receipt_at_item_limit_still_advances_progress(
            self, _atomic, mock_receipt, mock_items, mock_task):
        mock_receipt.return_value = (MagicMock(), True)
        mock_items.return_value.count.return_value = 50
        mock_items.return_value.aggregate.return_value = {'max_order': 49}
        task = SimpleNamespace(id=uuid.uuid4(), generation_attempt_id=uuid.uuid4())

        result = ReviewTasksView()._persist_chunk(task, MagicMock(), MagicMock(), {}, 2, 3, [{}])

        self.assertTrue(result['limit_reached'])
        self.assertEqual(result['created_count'], 0)
        mock_task.return_value.update.assert_called_once()

    @patch('seahub.ai.review_views.ReviewTask.objects.filter')
    @patch('seahub.ai.review_views.ReviewChangeItem.objects.filter')
    @patch('seahub.ai.review_views._map_suggestions')
    @patch('seahub.ai.review_views.ReviewGenerationChunk.objects.get_or_create')
    @patch('seahub.ai.review_views.transaction.atomic', return_value=nullcontext())
    def test_new_receipt_advances_progress_even_when_all_targets_exist(
            self, _atomic, mock_receipt, mock_map, mock_items, mock_task):
        mock_receipt.return_value = (MagicMock(), True)
        mock_items.return_value.count.return_value = 1
        mock_items.return_value.aggregate.return_value = {'max_order': 0}
        mock_items.return_value.values_list.return_value = ['existing-target']
        mock_map.return_value = [SimpleNamespace(
            target_key='existing-target')]
        task = SimpleNamespace(id=uuid.uuid4(), file_uuid=uuid.uuid4(),
                               generation_attempt_id=uuid.uuid4())

        result = ReviewTasksView()._persist_chunk(task, MagicMock(), MagicMock(), {}, 1, 2, [{}])

        self.assertEqual(result['created_count'], 0)
        self.assertFalse(result.get('duplicate', False))
        mock_task.return_value.update.assert_called_once()

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
    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    @patch('seahub.ai.review_views.ReviewDecisionSelection.objects.filter')
    @patch('seahub.ai.review_views.ReviewCardRevisionItem.objects.filter')
    def test_card_conflict_without_decision_preserves_terminal_decisions(
            self, mock_memberships, mock_selections, mock_attempts):
        memberships = []
        selections = []
        attempts = []
        for state in ('conflicted', 'applied', 'rejected'):
            item = SimpleNamespace(item_id=uuid.uuid4(), kind='replace_block_text',
                                   target={}, preview={}, precondition={}, after_text='after',
                                   after_type=None, rationale='')
            membership = SimpleNamespace(change_item=item, conflicted=True,
                                         selectable=False, conflict_summary='stale')
            memberships.append(membership)
            if state != 'conflicted':
                decision = SimpleNamespace(id=uuid.uuid4(), decision_kind=(
                    'rejected' if state == 'rejected' else 'approved'))
                selections.append(SimpleNamespace(card_revision_item=membership, decision=decision))
                if state == 'applied':
                    attempts.append(SimpleNamespace(review_decision_id=decision.id, status='applied'))
        mock_memberships.return_value.select_related.return_value.order_by.return_value = memberships
        mock_selections.return_value.select_related.return_value.order_by.return_value = selections
        mock_attempts.return_value = attempts
        task = SimpleNamespace(id=uuid.uuid4(), generation_status='review_ready',
                               current_card_revision=SimpleNamespace(card_revision=1))

        card = _build_card_dict(task)

        self.assertEqual([item['state'] for item in card['items']],
                         ['conflicted', 'applied', 'rejected'])
        self.assertEqual(card['batch_conflict']['conflict_item_count'], 1)

    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    @patch('seahub.ai.review_views.ReviewDecisionSelection.objects.filter')
    @patch('seahub.ai.review_views.ReviewCardRevisionItem.objects.filter')
    def test_saved_unknown_attempt_displays_applied_but_stays_decided(
            self, mock_memberships, mock_selections, mock_attempts):
        item = SimpleNamespace(item_id=uuid.uuid4(), kind='replace_block_text', target={},
                               preview={}, precondition={}, after_text='after',
                               after_type=None, rationale='')
        membership = SimpleNamespace(change_item=item, conflicted=False, selectable=True,
                                     conflict_summary='')
        decision = SimpleNamespace(id=uuid.uuid4(), decision_kind='approved')
        attempt = SimpleNamespace(
            review_decision_id=decision.id, status='outcome_unknown',
            persistence_status='persisted')
        selection = SimpleNamespace(
            card_revision_item=membership, decision=decision, decision_id=decision.id)
        selections = MagicMock()
        selections.order_by.return_value = [selection]
        selections.__iter__.return_value = iter([selection])
        mock_memberships.return_value.select_related.return_value.order_by.return_value = [membership]
        mock_selections.return_value.select_related.return_value = selections
        mock_attempts.return_value = [attempt]
        task = SimpleNamespace(id=uuid.uuid4(), generation_status='review_ready',
                               current_card_revision=SimpleNamespace(card_revision=1))

        self.assertEqual(_build_card_dict(task)['items'][0]['state'], 'applied')
        self.assertEqual(_decided_item_ids(task.current_card_revision), {str(item.item_id)})

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

    @patch('seahub.ai.review_views.ReviewCardRevisionItem.objects.filter')
    @patch('seahub.ai.review_views.ReviewDecisionSelection.objects.filter')
    def test_partial_preflight_conflict_releases_unconflicted_item_selections(
            self, mock_selection_filter, mock_membership_filter):
        mock_membership_filter.return_value = []
        decision = SimpleNamespace(card_revision=SimpleNamespace())
        attempt = SimpleNamespace(review_decision=decision)

        ReviewTaskApproveView()._record_preflight_conflicts(attempt, [{
            'item_id': 'conflicted-item', 'conflict_code': 'before_hash_mismatch',
        }])

        mock_selection_filter.assert_called_once_with(decision=decision)
        mock_selection_filter.return_value.exclude.assert_called_once_with(
            card_revision_item__change_item__item_id__in={'conflicted-item'})
        mock_selection_filter.return_value.exclude.return_value.delete.assert_called_once()


class SDocReviewMessageExtensionTest(SimpleTestCase):
    @patch('seahub.ai.models.ReviewTask.objects.filter')
    def test_message_serialization_uses_prefetched_review_tasks(self, mock_review_tasks):
        review_task = SimpleNamespace(
            id=uuid.uuid4(), generation_status=ReviewTask.GENERATION_REVIEW_READY)
        message = ChatMessages(id=17, session_uuid='session', message_id='1', role='assistant')

        data = message.to_dict({17: review_task})

        self.assertEqual(data['extensions'], [{
            'type': 'sdoc_review', 'review_task_id': str(review_task.id),
        }])
        mock_review_tasks.assert_not_called()

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
    @patch('seahub.ai.utils.requests.post')
    def test_understanding_always_uses_the_current_request_protocol(self, mock_post):
        understanding = {'route': 'clarify', 'clarification': 'Which section?'}
        mock_post.return_value = SimpleNamespace(
            ok=True, json=lambda: {'understanding': understanding})

        self.assertEqual(understand_sdoc_request('edit', {}, {'username': 'user'}), understanding)
        self.assertTrue(mock_post.call_args.kwargs['json']['understand_request'])
        self.assertEqual(mock_post.call_args.kwargs['timeout'], 45)
        mock_post.return_value = SimpleNamespace(ok=True, json=lambda: {'scope': {}})
        with self.assertRaises(SdocRequestUnderstandingError):
            understand_sdoc_request('edit', {}, {})

    def test_mapping_requires_an_explicit_kind(self):
        block = {'block_id': 'p1', 'text_node_id': 't1', 'type': 'paragraph',
                 'supported': True, 'before_leaf_text': 'before'}
        suggestion = {'block_id': 'p1', 'text_node_id': 't1', 'block_type': 'paragraph',
                      'before_leaf_text': 'before', 'after_text': 'after'}
        context = {'blocks': [block]}
        self.assertEqual(_map_suggestions(context, None, [suggestion], 0), [])
        self.assertEqual(len(_map_suggestions(
            context, None, [dict(suggestion, kind='replace_block_text')], 0)), 1)

    @patch('seahub.ai.review_views._review_worker_forbidden', return_value=None)
    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    @patch('seahub.ai.review_views.ReviewTask.objects.filter')
    def test_timeout_update_rechecks_the_scanned_deadline(
            self, mock_tasks, _attempts, _auth):
        now = timezone.now()
        stale = SimpleNamespace(id=uuid.uuid4(), generation_attempt_id=uuid.uuid4(),
                                generation_deadline_at=now - timezone.timedelta(seconds=1))
        mock_tasks.side_effect = [
            [stale], MagicMock(update=MagicMock(return_value=0)), MagicMock()]

        with patch('seahub.ai.review_views.timezone.now', return_value=now):
            response = ReviewWorkerPendingView().post(RequestFactory().post('/'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(mock_tasks.call_args_list[1].kwargs.get('generation_deadline_at__lt'), now)

    @patch('seahub.ai.review_views._review_worker_forbidden', return_value=None)
    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    @patch('seahub.ai.review_views.ReviewTask.objects.filter')
    def test_pending_keeps_unknown_apply_attempts_until_confirmed(
            self, mock_tasks, mock_attempts, _auth):
        now = timezone.now()
        mock_tasks.side_effect = [[], MagicMock()]

        def attempts(**kwargs):
            result = MagicMock()
            status = kwargs.get('status')
            if status == ApplyAttempt.STATUS_COMMITTING and 'result_query_deadline_at__lt' not in kwargs:
                result.order_by.return_value.values_list.return_value.__getitem__.return_value = ['commit']
            elif status == ApplyAttempt.STATUS_OUTCOME_UNKNOWN:
                self.assertNotIn('created_at__gte', kwargs)
                result.order_by.return_value.values_list.return_value.__getitem__.return_value = ['unknown']
            return result

        mock_attempts.side_effect = attempts
        with patch('seahub.ai.review_views.timezone.now', return_value=now):
            response = ReviewWorkerPendingView().post(RequestFactory().post('/'))
        self.assertEqual(response.data['apply_attempt_ids'], ['commit', 'unknown'])

    @patch('seahub.ai.review_views._release_undispatched_apply')
    @patch('seahub.ai.review_views._review_worker_forbidden', return_value=None)
    @patch('seahub.ai.review_views.ApplyAttempt.objects.filter')
    @patch('seahub.ai.review_views.ReviewTask.objects.filter')
    def test_pending_sweep_recovers_undispatched_claims(self, tasks, attempts, _auth, release):
        row = SimpleNamespace(id=uuid.uuid4())
        tasks.side_effect = [[], MagicMock()]
        attempts.return_value.order_by.return_value.__getitem__.return_value = [row]
        response = ReviewWorkerPendingView().post(RequestFactory().post('/'))
        self.assertEqual(response.status_code, 200)
        release.assert_called_once()
        self.assertEqual(release.call_args.args[0], row)

    @patch('seahub.ai.review_views._release_undispatched_apply')
    @patch('seahub.ai.review_views._review_worker_forbidden', return_value=None)
    @patch('seahub.ai.review_views.ApplyAttempt.objects.select_related')
    def test_pending_reconcile_waits_then_releases(self, select, _auth, release):
        row = SimpleNamespace(status=ApplyAttempt.STATUS_PENDING,
                              refresh_from_db=lambda: None, to_dict=lambda: {'status': row.status})
        select.return_value.filter.return_value.first.return_value = row
        response = ReviewWorkerApplyReconcileView().post(RequestFactory().post('/'), uuid.uuid4())
        self.assertFalse(response.data['terminal'])
        release.assert_called_once()
        release.side_effect = lambda *args: setattr(row, 'status', ApplyAttempt.STATUS_FAILED_PRECOMMIT)
        response = ReviewWorkerApplyReconcileView().post(RequestFactory().post('/'), uuid.uuid4())
        self.assertTrue(response.data['terminal'])

    @patch('seahub.ai.review_views._review_worker_forbidden', return_value=None)
    @patch('seahub.ai.review_views.ApplyAttempt.objects.select_related')
    def test_expired_reconcile_reads_the_receipt_before_giving_up(self, mock_select, _auth):
        attempt = SimpleNamespace(
            status=ApplyAttempt.STATUS_COMMITTING,
            result_query_deadline_at=timezone.now() - timezone.timedelta(seconds=1),
            to_dict=lambda: {'status': attempt.status},
            refresh_from_db=lambda: None,
        )
        mock_select.return_value.filter.return_value.first.return_value = attempt
        with patch.object(ReviewTaskApproveView, '_query_apply_result', return_value={'status': 'applied'}), \
                patch.object(ReviewTaskApproveView, '_map_apply_result',
                             side_effect=lambda row, result: setattr(row, 'status', 'applied')):
            response = ReviewWorkerApplyReconcileView().post(RequestFactory().post('/'), uuid.uuid4())
        self.assertTrue(response.data['terminal'])
        self.assertEqual(attempt.status, 'applied')

        attempt.status = ApplyAttempt.STATUS_COMMITTING
        with patch.object(ReviewTaskApproveView, '_query_apply_result', return_value=None), \
                patch.object(ReviewTaskApproveView, '_abort_apply', return_value=None), \
                patch.object(ReviewTaskApproveView, '_mark_outcome_unknown',
                             side_effect=lambda row: setattr(row, 'status', 'outcome_unknown')):
            response = ReviewWorkerApplyReconcileView().post(RequestFactory().post('/'), uuid.uuid4())
        self.assertFalse(response.data['terminal'])
        self.assertEqual(attempt.status, 'outcome_unknown')

    @patch('seahub.ai.review_views._review_worker_forbidden', return_value=None)
    @patch('seahub.ai.review_views.ApplyAttempt.objects.select_related')
    def test_expired_reconcile_aborts_and_remains_retryable_until_confirmed(self, select, _auth):
        attempt = SimpleNamespace(
            status='committing', result_query_deadline_at=timezone.now() - timezone.timedelta(seconds=1),
            to_dict=lambda: {'status': attempt.status}, refresh_from_db=lambda: None)
        select.return_value.filter.return_value.first.return_value = attempt
        aborted = {'status': 'failed_precommit', 'error_code': 'apply_interrupted'}
        with patch.object(ReviewTaskApproveView, '_query_apply_result', return_value={'status': 'outcome_unknown'}), \
                patch.object(ReviewTaskApproveView, '_abort_apply', return_value=aborted) as abort, \
                patch.object(ReviewTaskApproveView, '_map_apply_result',
                             side_effect=lambda row, result: setattr(row, 'status', result['status'])):
            response = ReviewWorkerApplyReconcileView().post(RequestFactory().post('/'), uuid.uuid4())
        self.assertTrue(response.data['terminal'])
        abort.assert_called_once_with(attempt)
        self.assertEqual(attempt.status, 'failed_precommit')

        attempt.status = 'outcome_unknown'
        with patch.object(ReviewTaskApproveView, '_query_apply_result', return_value={'status': 'outcome_unknown'}), \
                patch.object(ReviewTaskApproveView, '_abort_apply', return_value=None), \
                patch.object(ReviewTaskApproveView, '_mark_outcome_unknown'), \
                patch.object(ReviewTaskApproveView, '_map_apply_result') as map_result:
            response = ReviewWorkerApplyReconcileView().post(RequestFactory().post('/'), uuid.uuid4())
        self.assertFalse(response.data['terminal'])
        map_result.assert_not_called()

    def setUp(self):
        self.task = SimpleNamespace(
            file_uuid='file-uuid',
            scope_snapshot_id='snapshot-id',
            scope_document_incarnation='incarnation-id',
            scope_sdoc_version=7,
            allowed_block_ids=['section-1', 'block-1', 'list-1'],
            allowed_text_targets=[{'block_id': 'block-1', 'text_node_id': 'text-1'}],
            scope_summary='Section 1',
        )
        self.context = {
            'file_uuid': 'file-uuid',
            'snapshot_id': 'snapshot-id',
            'document_incarnation': 'incarnation-id',
            'exact_sdoc_version': 7,
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

    def test_unknown_suggestion_kind_is_rejected(self):
        self.assertFalse(_suggestion_is_within_task_scope({
            'kind': 'rename_block', 'block_id': 'block-1',
        }, self.task))
        self.assertFalse(_suggestion_is_within_task_scope({
            'block_id': 'block-1', 'text_node_id': 'text-1',
        }, self.task))

    def test_worker_context_must_match_the_creation_snapshot(self):
        self.assertTrue(_document_context_matches_task_snapshot(self.task, self.context))
        changed = dict(self.context, exact_sdoc_version=8, snapshot_id='new-snapshot')
        self.assertFalse(_document_context_matches_task_snapshot(self.task, changed))

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
        first = SimpleNamespace(target_key='text:block-1:text-1')
        second = SimpleNamespace(target_key='text:block-1:text-1')

        items = _filter_unique_review_items([first, second], set())

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
