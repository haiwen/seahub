import json
import logging
import os
import time
import uuid

import jwt
from django.conf import settings
from django.db import transaction
from django.db.models import F, Max
from django.utils import timezone
from django.utils.translation import gettext as _

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.seadoc.sdoc_server_api import SdocServerAPI
from seahub.utils.repo import parse_repo_perm
from seahub.views import check_folder_permission
from seahub.tags.models import FileUUIDMap

from seahub.ai.models import (
    ChatMessages, ChatSessions, ReviewTask, ReviewChangeSetRevision,
    ReviewChangeItem, ReviewCardRevision, ReviewCardRevisionItem,
    ReviewDecision, ReviewDecisionSelection, ApplyAttempt,
    ensure_review_tables,
)
from seahub.ai.sdoc_intent import route_sdoc_prompt
from seahub.ai.sdoc_canonical import (
    CanonicalizationError,
    selection_digest as compute_selection_digest,
    apply_payload_digest as compute_apply_payload_digest,
    set_block_type_hash as compute_set_block_type_hash,
    set_list_type_hash as compute_set_list_type_hash,
)
from seahub.ai.utils import (
    generate_sdoc_review, generate_sdoc_analyze, gen_message_id,
    generate_sdoc_review_plan, generate_sdoc_review_chunk,
    REVIEW_TOTAL_TIMEOUT_SECONDS,
)
from seahub.ai.apis import (
    get_sdoc_review_target, generate_sdoc_service_token,
    is_indeterminate_sdoc_apply_error,
)

logger = logging.getLogger(__name__)

PHASE1_KIND = 'replace_block_text'
PROJECTION_VERSION = 'sdoc-agent-context/v1'
HASH_SCHEMA_VERSION = 'sdoc-canonical/v1'
MAX_CHANGE_ITEMS = 50
LONG_POLL_TIMEOUT_SECONDS = 20
LONG_POLL_INTERVAL_SECONDS = 1
GENERATION_IN_PROGRESS = ('queued', 'reading', 'drafting')


def _get_review_task(task_id):
    try:
        return ReviewTask.objects.get(id=task_id)
    except ReviewTask.DoesNotExist:
        return None


def _is_requester(request, task):
    return task.requester == request.user.username


def _load_target_and_check(request, repo_id, path, require_edit=False):
    uuid_map, error = get_sdoc_review_target(request, repo_id, path)
    if error:
        return None, error
    if require_edit:
        permission = check_folder_permission(request, repo_id, os.path.dirname(path) or '/')
        if not permission or not parse_repo_perm(permission).can_edit_on_web:
            return None, api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
    return uuid_map, None


def _get_session(request, session_uuid, repo_id):
    session = ChatSessions.objects.get_session_by_uuid(session_uuid) if session_uuid else None
    if not session or session.repo_id != repo_id or session.username != request.user.username:
        return None
    return session


def _fetch_document_context(uuid_map, username):
    service_token = generate_sdoc_service_token(
        uuid_map.uuid, uuid_map.filename, username, 'sdoc_agent_snapshot')
    sdoc_api = SdocServerAPI(str(uuid_map.uuid), uuid_map.filename, username, access_token=service_token)
    snapshot = sdoc_api.get_review_snapshot()
    document_context = snapshot.get('document_context') if isinstance(snapshot, dict) else None
    if not isinstance(document_context, dict):
        raise RuntimeError('Invalid SDoc document context.')
    return document_context


def _lookup_block(document_context, block_id, text_node_id):
    for block in document_context.get('blocks') or []:
        if block.get('block_id') == block_id and block.get('text_node_id') == text_node_id:
            return block
    return None


def _lookup_block_by_id(document_context, block_id):
    for block in document_context.get('blocks') or []:
        if block.get('block_id') == block_id:
            return block
    return None


def _lookup_list(document_context, block_id):
    for list_node in document_context.get('lists') or []:
        if list_node.get('block_id') == block_id:
            return list_node
    return None


def _build_card_dict(task):
    card = task.current_card_revision
    if not card:
        return None
    memberships = list(
        ReviewCardRevisionItem.objects.filter(card_revision=card)
        .select_related('change_item').order_by('change_item__sort_order'))

    # Derive each item's latest decision state.
    decisions = list(ReviewDecision.objects.filter(card_revision=card).order_by('created_at'))
    decision_by_item = {}
    for decision in decisions:
        for selection in ReviewDecisionSelection.objects.filter(decision=decision).select_related('card_revision_item__change_item'):
            item_id = str(selection.card_revision_item.change_item.item_id)
            decision_by_item[item_id] = decision

    items = []
    conflict_item_count = 0
    batch_blocked_item_count = 0
    for membership in memberships:
        item = membership.change_item
        item_id = str(item.item_id)
        decision = decision_by_item.get(item_id)
        state = 'pending'
        if decision:
            if decision.decision_kind == ReviewDecision.KIND_REJECTED:
                state = 'rejected'
            else:
                attempt = _attempt_for_decision(decision)
                if attempt and attempt.status == ApplyAttempt.STATUS_APPLIED:
                    state = 'applied'
                elif attempt and attempt.status == ApplyAttempt.STATUS_FAILED_PRECOMMIT:
                    state = 'apply_failed'
                elif attempt and attempt.status == ApplyAttempt.STATUS_PREFLIGHT_CONFLICTED:
                    # A preflight conflict aborts the whole batch before any
                    # operation is written. Only the conflicting item is stale;
                    # the other selected items remain available for a retry.
                    if membership.conflicted:
                        state = 'conflicted'
                        conflict_item_count += 1
                    else:
                        state = 'pending'
                        batch_blocked_item_count += 1
                elif attempt and attempt.status == ApplyAttempt.STATUS_OUTCOME_UNKNOWN:
                    state = 'outcome_unknown'
                else:
                    state = 'approved'
        items.append({
            'item_id': item_id,
            'kind': item.kind,
            'target': item.target,
            'list_items': (item.preview or {}).get('list_items') or [],
            'before_text': (item.precondition or {}).get('before_leaf_text', ''),
            'after_text': item.after_text,
            'before_type': (item.target or {}).get('block_type'),
            'after_type': item.after_type,
            'rationale': item.rationale,
            'reviewable': membership.reviewable,
            'conflicted': membership.conflicted,
            'selectable': membership.selectable,
            'conflict_summary': membership.conflict_summary,
            'state': state,
        })

    return {
        'task_id': str(task.id),
        'card_revision': card.card_revision,
        'generation_status': task.generation_status,
        'items': items,
        'batch_conflict': {
            'conflict_item_count': conflict_item_count,
            'blocked_item_count': batch_blocked_item_count,
        } if conflict_item_count else None,
    }


def _attempt_for_decision(decision):
    try:
        return ApplyAttempt.objects.get(review_decision=decision)
    except ApplyAttempt.DoesNotExist:
        return None


def _decided_item_ids(card):
    decided = set()
    for decision in ReviewDecision.objects.filter(card_revision=card):
        attempt = _attempt_for_decision(decision)
        if decision.decision_kind == ReviewDecision.KIND_APPROVED and attempt and attempt.status == ApplyAttempt.STATUS_PREFLIGHT_CONFLICTED:
            # The batch was rejected before commit, so its non-conflicting items
            # must remain eligible for a subsequent approval.
            continue
        for selection in ReviewDecisionSelection.objects.filter(decision=decision).select_related('card_revision_item__change_item'):
            decided.add(str(selection.card_revision_item.change_item.item_id))
    return decided


def _sdoc_apply_result_from_error(error):
    """Recover structured, terminal SDoc apply results from HTTP errors."""
    if not isinstance(error, ConnectionError) or len(error.args) < 2:
        return None
    try:
        status_code, body = error.args[:2]
        if int(status_code) not in (409, 422):
            return None
        result = json.loads(body)
    except (TypeError, ValueError, json.JSONDecodeError):
        return None
    if not isinstance(result, dict):
        return None
    if result.get('status') not in ('preflight_conflicted', 'failed_precommit'):
        return None
    return result


def _get_uuid_map(repo_id, path):
    uuid_map = FileUUIDMap.objects.get_or_create_fileuuidmap_by_path(repo_id, path, False, pending=True)
    if not uuid_map:
        raise RuntimeError('SDoc not found.')
    return uuid_map


def run_generation(task, session_uuid, message_id):
    """Run review generation for a queued task, chunk by chunk.

    Uses the progressive plan + chunk protocol: each completed chunk is persisted
    immediately so partial results survive a total timeout. A total budget of
    REVIEW_TOTAL_TIMEOUT_SECONDS is enforced; chunks that do not finish within the
    budget are dropped and the task is published with generation_truncated=True.
    Raises on setup failure (no plan); the caller marks the task failed.
    """
    deadline = timezone.now() + timezone.timedelta(seconds=REVIEW_TOTAL_TIMEOUT_SECONDS)
    uuid_map = _get_uuid_map(task.repo_id, task.path)
    document_context = _fetch_document_context(uuid_map, task.requester)

    remaining_seconds = (deadline - timezone.now()).total_seconds()
    if remaining_seconds <= 0:
        raise TimeoutError('SDoc review generation timed out before planning')

    plan = generate_sdoc_review_plan({
        'prompt': task.prompt,
        'document_context': document_context,
        'username': task.requester,
        'org_id': None,
    }, timeout=min(30, remaining_seconds))
    chunks = plan.get('chunks') if isinstance(plan, dict) else None
    brief = plan.get('brief') if isinstance(plan, dict) else None
    if not isinstance(chunks, list) or not chunks:
        raise ValueError('no chunks')

    view = ReviewTasksView()
    total_blocks = sum(
        len(chunk.get('block_ids') or [])
        for chunk in chunks if isinstance(chunk, dict))
    changeset_revision, card_revision = view._begin_review(
        task, session_uuid, message_id, document_context, brief, len(chunks), total_blocks)

    truncated = False
    for chunk in chunks:
        chunk_index = chunk.get('chunk_index')
        if not isinstance(chunk_index, int):
            continue
        block_count = len(chunk.get('block_ids') or [])
        remaining_seconds = (deadline - timezone.now()).total_seconds()
        if remaining_seconds <= 0:
            truncated = True
            break
        try:
            suggestions = generate_sdoc_review_chunk({
                'prompt': task.prompt,
                'document_context': document_context,
                'brief': brief,
                'chunk_index': chunk_index,
                'username': task.requester,
                'org_id': None,
            }, timeout=min(30, remaining_seconds))
        except Exception as error:
            logger.warning('SDoc review chunk %s generation failed: %s', chunk_index, error)
            truncated = True
            continue
        if not isinstance(suggestions, list):
            truncated = True
            continue
        try:
            view._persist_chunk(
                task, changeset_revision, card_revision, document_context,
                chunk_index, block_count, suggestions)
        except Exception:
            logger.exception('Failed to persist SDoc review chunk %s', chunk_index)
            truncated = True

    view._finish_review(
        task, session_uuid, message_id, document_context.get('exact_sdoc_version'),
        changeset_revision, card_revision, truncated)


def mark_generation_failed(task, attempt_id=None, error_code='generation_failed'):
    """Persist a terminal generation failure and replace the transient chat copy."""
    filters = {
        'id': task.id,
        'generation_status__in': GENERATION_IN_PROGRESS,
    }
    if attempt_id is not None:
        filters['generation_attempt_id'] = attempt_id
    updated = ReviewTask.objects.filter(**filters).update(
        generation_status=ReviewTask.GENERATION_FAILED,
        error_code=error_code,
        generation_finished_at=timezone.now(),
        updated_at=timezone.now())
    if not updated:
        return

    assistant_message = ChatMessages.objects.filter(
        session_uuid=task.chat_session_id, message_id=task.message_id, role='assistant').first()
    if assistant_message:
        assistant_message.content = _('Unable to generate a review suggestion.')
        assistant_message.save(update_fields=['content'])
        ReviewTask.objects.filter(id=task.id).update(assistant_message_id=assistant_message.id)
    ChatSessions.objects.filter(session_uuid=task.chat_session_id).update(updated_at=timezone.now())


def _map_suggestions(document_context, file_uuid, document_incarnation, changeset_revision, suggestions, start_order, chunk_index=None):
    """Map model suggestions to ReviewChangeItem objects (no DB write)."""
    items = []
    item_order = start_order
    for suggestion in suggestions:
        kind = suggestion.get('kind') or PHASE1_KIND
        rationale = suggestion.get('rationale') or ''
        item = None

        if kind == 'set_list_type':
            block_id = suggestion.get('block_id')
            block_type = suggestion.get('block_type')
            after_type = suggestion.get('after_type')
            list_node = _lookup_list(document_context, block_id)
            if not list_node:
                continue
            if list_node.get('type') != block_type:
                continue
            canonical_hash = compute_set_list_type_hash(
                block_id, block_type, list_node.get('ancestor_path'),
                file_uuid, document_incarnation)
            item = ReviewChangeItem(
                changeset_revision=changeset_revision,
                item_id=uuid.uuid4(),
                kind=kind,
                target={
                    'block_id': block_id,
                    'block_type': block_type,
                    'ancestor_path': list_node.get('ancestor_path'),
                },
                precondition={
                    'canonical_before_hash': canonical_hash,
                    'hash_algorithm': 'SHA-256',
                    'hash_schema_version': HASH_SCHEMA_VERSION,
                    'projection_version': PROJECTION_VERSION,
                },
                preview={
                    'list_items': list_node.get('items') or [],
                },
                after_text='',
                after_type=after_type,
                rationale=rationale,
                sort_order=item_order,
            )
        elif kind == 'set_block_type':
            block_id = suggestion.get('block_id')
            block_type = suggestion.get('block_type')
            after_type = suggestion.get('after_type')
            block = _lookup_block_by_id(document_context, block_id)
            if not block or not block.get('supported'):
                continue
            if block.get('type') != block_type:
                continue
            canonical_hash = compute_set_block_type_hash(
                block_id, block_type, block.get('ancestor_path'),
                block.get('before_leaf_text'), file_uuid, document_incarnation)
            item = ReviewChangeItem(
                changeset_revision=changeset_revision,
                item_id=uuid.uuid4(),
                kind=kind,
                target={
                    'block_id': block_id,
                    'block_type': block_type,
                    'ancestor_path': block.get('ancestor_path'),
                },
                precondition={
                    'canonical_before_hash': canonical_hash,
                    'hash_algorithm': 'SHA-256',
                    'hash_schema_version': HASH_SCHEMA_VERSION,
                    'projection_version': PROJECTION_VERSION,
                },
                after_text='',
                after_type=after_type,
                rationale=rationale,
                sort_order=item_order,
            )
        else:
            block_id = suggestion.get('block_id')
            text_node_id = suggestion.get('text_node_id')
            block_type = suggestion.get('block_type')
            before_leaf_text = suggestion.get('before_leaf_text')
            after_text = suggestion.get('after_text')
            block = _lookup_block(document_context, block_id, text_node_id)
            if not block or not block.get('supported'):
                continue
            if block.get('type') != block_type:
                continue
            item = ReviewChangeItem(
                changeset_revision=changeset_revision,
                item_id=uuid.uuid4(),
                kind=kind,
                target={
                    'block_id': block_id,
                    'text_node_id': text_node_id,
                    'block_type': block_type,
                    'ancestor_path': block.get('ancestor_path'),
                },
                precondition={
                    'before_leaf_text': before_leaf_text,
                    'canonical_before_hash': block.get('canonical_before_hash'),
                    'hash_algorithm': 'SHA-256',
                    'hash_schema_version': HASH_SCHEMA_VERSION,
                    'projection_version': PROJECTION_VERSION,
                },
                after_text=after_text,
                rationale=rationale,
                sort_order=item_order,
            )

        target = item.target
        ident = '%s:%s:%s:%s:%s:%s' % (
            changeset_revision.review_task_id, kind, target.get('block_id'), target.get('text_node_id', ''),
            item.after_type or '', item.after_text or '')
        if chunk_index is not None:
            ident = '%s:%s' % (chunk_index, ident)
        item.logical_item_id = uuid.uuid5(uuid.NAMESPACE_DNS, ident)

        items.append(item)
        item_order += 1
    return items


class ReviewTasksView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        ensure_review_tables()
        repo_id = request.data.get('repo_id')
        path = request.data.get('path')
        prompt = request.data.get('prompt', '').strip()
        session_uuid = request.data.get('session_uuid')
        if not prompt:
            return api_error(status.HTTP_400_BAD_REQUEST, 'prompt is required.')

        uuid_map, error = get_sdoc_review_target(request, repo_id, path)
        if error:
            return error

        route = route_sdoc_prompt(prompt)
        if route == 'answer':
            return Response({'route': route}, status=status.HTTP_200_OK)

        if route in ('clarify', 'unsupported_write'):
            session = _get_session(request, session_uuid, repo_id)
            if not session:
                return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
            try:
                message_id = gen_message_id(session_uuid)
            except Exception:
                logger.exception('Failed to allocate chat message id.')
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error.')
            if route == 'unsupported_write':
                content = _('This kind of edit is not supported yet. You can currently revise the text of titles, headings, paragraphs, list items and table cells.')
            else:
                content = _('Please clarify which part of the document you would like me to revise.')
            with transaction.atomic():
                user_message = ChatMessages.objects.create_message(session_uuid, message_id, 'user', prompt, attachments=[])
                assistant_message = ChatMessages.objects.create_message(session_uuid, message_id, 'assistant', content, attachments=[])
                ChatSessions.objects.filter(session_uuid=session_uuid).update(updated_at=timezone.now())
            return Response({
                'route': route,
                'messages': [user_message.to_dict(), assistant_message.to_dict()],
            }, status=status.HTTP_201_CREATED)

        session = _get_session(request, session_uuid, repo_id)
        if not session:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')

        try:
            document_context = _fetch_document_context(uuid_map, request.user.username)
        except Exception:
            logger.exception('Failed to load SDoc document context.')
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, 'SDoc is unavailable.')

        try:
            message_id = gen_message_id(session_uuid)
        except Exception:
            logger.exception('Failed to allocate chat message id.')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error.')

        generation_deadline_at = timezone.now() + timezone.timedelta(seconds=60)

        with transaction.atomic():
            user_message = ChatMessages.objects.create_message(session_uuid, message_id, 'user', prompt, attachments=[])
            assistant_message = ChatMessages.objects.create_message(
                session_uuid, message_id, 'assistant', _('Reviewing the document…'), attachments=[])
            task = ReviewTask.objects.create(
                chat_session_id=session_uuid,
                assistant_message=assistant_message,
                repo_id=repo_id,
                path=path,
                file_uuid=str(uuid_map.uuid),
                requester=request.user.username,
                prompt=prompt,
                message_id=message_id,
                generation_status=ReviewTask.GENERATION_QUEUED,
                generation_revision=1,
                generation_deadline_at=generation_deadline_at,
            )

        supported_count = sum(1 for b in (document_context.get('blocks') or []) if b.get('supported'))
        if supported_count > 10:
            # Long document: enqueue for the background worker and return immediately.
            return Response({
                'route': route,
                'task': task.to_dict(),
                'messages': [user_message.to_dict()],
            }, status=status.HTTP_202_ACCEPTED)

        # queued -> reading
        ReviewTask.objects.filter(id=task.id, generation_status=ReviewTask.GENERATION_QUEUED).update(
            generation_status=ReviewTask.GENERATION_READING, updated_at=timezone.now())

        analysis_message = None
        if route == 'answer_then_review':
            try:
                analysis = generate_sdoc_analyze({
                    'prompt': prompt,
                    'document_context': document_context,
                    'username': request.user.username,
                    'org_id': request.user.org.org_id if getattr(request.user, 'org', None) else None,
                })
                if analysis:
                    analysis_message_id = gen_message_id(session_uuid)
                    analysis_message = ChatMessages.objects.create_message(
                        session_uuid, analysis_message_id, 'assistant', analysis, attachments=[])
            except Exception:
                logger.exception('Failed to generate SDoc analysis; continuing to review.')

        try:
            result = generate_sdoc_review({
                'prompt': prompt,
                'document_context': document_context,
                'username': request.user.username,
                'org_id': request.user.org.org_id if getattr(request.user, 'org', None) else None,
            })
            suggestions = result.get('items') if isinstance(result, dict) else None
            if not isinstance(suggestions, list) or not suggestions:
                raise ValueError('no suggestions')
        except Exception as error:
            logger.exception('Failed to generate SDoc review: %s', error)
            ReviewTask.objects.filter(id=task.id).update(
                generation_status=ReviewTask.GENERATION_FAILED, error_code='generation_failed', updated_at=timezone.now())
            assistant_message = ChatMessages.objects.create_message(
                session_uuid, message_id, 'assistant', _('Unable to generate a review suggestion.'), attachments=[])
            messages = [user_message.to_dict()]
            if analysis_message:
                messages.append(analysis_message.to_dict())
            messages.append(assistant_message.to_dict())
            return Response({
                'route': route,
                'task': _get_review_task(task.id).to_dict(),
                'messages': messages,
            }, status=status.HTTP_201_CREATED)

        try:
            self._persist_review(task, session_uuid, message_id, document_context, suggestions)
        except Exception as error:
            logger.exception('Failed to persist SDoc review: %s', error)
            ReviewTask.objects.filter(id=task.id).update(
                generation_status=ReviewTask.GENERATION_FAILED, error_code='persist_failed', updated_at=timezone.now())
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Failed to persist review suggestion.')

        task.refresh_from_db()
        assistant_message = ChatMessages.objects.filter(
            session_uuid=session_uuid, message_id=message_id, role='assistant').first()
        messages = [user_message.to_dict()]
        if analysis_message:
            messages.append(analysis_message.to_dict())
        if assistant_message:
            messages.append(assistant_message.to_dict())
        return Response({
            'route': route,
            'task': task.to_dict(),
            'card': _build_card_dict(task),
            'messages': messages,
        }, status=status.HTTP_201_CREATED)

    def _persist_review(self, task, session_uuid, message_id, document_context, suggestions):
        snapshot_id = document_context.get('snapshot_id')
        document_incarnation = document_context.get('document_incarnation')
        exact_sdoc_version = document_context.get('exact_sdoc_version')
        file_uuid = str(task.file_uuid)

        with transaction.atomic():
            changeset_revision = ReviewChangeSetRevision.objects.create(
                review_task=task,
                changeset_revision=1,
                snapshot_id=snapshot_id,
                file_uuid=file_uuid,
                document_incarnation=document_incarnation,
                exact_sdoc_version=exact_sdoc_version,
                projection_version=PROJECTION_VERSION,
                scope_summary=document_context.get('scope_summary') or '',
            )
            change_items = _map_suggestions(
                document_context, file_uuid, document_incarnation,
                changeset_revision, suggestions[:MAX_CHANGE_ITEMS], 0)
            if not change_items:
                raise ValueError('no writable suggestions')

            ReviewChangeItem.objects.bulk_create(change_items)
            created_items = list(ReviewChangeItem.objects.filter(changeset_revision=changeset_revision).order_by('sort_order'))

            card_revision = ReviewCardRevision.objects.create(
                review_task=task,
                changeset_revision=changeset_revision,
                card_revision=1,
            )
            for item in created_items:
                ReviewCardRevisionItem.objects.create(
                    card_revision=card_revision,
                    change_item=item,
                    reviewable=True,
                    conflicted=False,
                    selectable=True,
                )

            assistant_message = ChatMessages.objects.create_message(
                session_uuid, message_id, 'assistant', _('I created a review suggestion.'))
            task.assistant_message = assistant_message
            task.generation_status = ReviewTask.GENERATION_REVIEW_READY
            task.base_sdoc_version = exact_sdoc_version
            task.current_changeset_revision = changeset_revision
            task.current_card_revision = card_revision
            task.save()
            ChatSessions.objects.filter(session_uuid=session_uuid).update(updated_at=timezone.now())

    def _begin_review(self, task, session_uuid, message_id, document_context, brief, total_chunks, total_blocks):
        snapshot_id = document_context.get('snapshot_id')
        document_incarnation = document_context.get('document_incarnation')
        exact_sdoc_version = document_context.get('exact_sdoc_version')
        file_uuid = str(task.file_uuid)

        with transaction.atomic():
            changeset_revision = ReviewChangeSetRevision.objects.create(
                review_task=task,
                changeset_revision=1,
                snapshot_id=snapshot_id,
                file_uuid=file_uuid,
                document_incarnation=document_incarnation,
                exact_sdoc_version=exact_sdoc_version,
                projection_version=PROJECTION_VERSION,
                scope_summary=document_context.get('scope_summary') or '',
                revision_brief=brief if isinstance(brief, dict) else {},
            )
            card_revision = ReviewCardRevision.objects.create(
                review_task=task,
                changeset_revision=changeset_revision,
                card_revision=1,
            )
            assistant_message = ChatMessages.objects.filter(
                session_uuid=session_uuid, message_id=message_id, role='assistant').first()
            if not assistant_message:
                assistant_message = ChatMessages.objects.create_message(
                    session_uuid, message_id, 'assistant', _('Reviewing the document…'))
            ReviewTask.objects.filter(id=task.id).update(
                assistant_message_id=assistant_message.id,
                generation_status=ReviewTask.GENERATION_DRAFTING,
                total_chunks=total_chunks,
                completed_chunks=0,
                total_review_blocks=total_blocks,
                completed_review_blocks=0,
                generation_truncated=False,
                current_changeset_revision_id=changeset_revision.id,
                current_card_revision_id=card_revision.id,
                updated_at=timezone.now())
        return changeset_revision, card_revision

    def _persist_chunk(self, task, changeset_revision, card_revision, document_context, chunk_index, block_count, suggestions):
        file_uuid = str(task.file_uuid)
        document_incarnation = document_context.get('document_incarnation')

        with transaction.atomic():
            existing_items = ReviewChangeItem.objects.filter(changeset_revision=changeset_revision)
            existing_count = existing_items.count()
            existing_order = existing_items.aggregate(max_order=Max('sort_order'))['max_order']
            start_order = 0 if existing_order is None else existing_order + 1
            remaining_slots = max(MAX_CHANGE_ITEMS - existing_count, 0)
            items = _map_suggestions(
                document_context, file_uuid, document_incarnation,
                changeset_revision, suggestions[:remaining_slots], start_order, chunk_index)
            existing_ids = set(existing_items.values_list('logical_item_id', flat=True))
            new_items = [it for it in items if it.logical_item_id not in existing_ids]
            if items and not new_items:
                # A retry of a chunk that was already persisted must not make the
                # visible progress counter advance twice.
                return 0
            if new_items:
                ReviewChangeItem.objects.bulk_create(new_items)
                created = list(ReviewChangeItem.objects.filter(
                    changeset_revision=changeset_revision,
                    logical_item_id__in=[item.logical_item_id for item in new_items]))
                for item in created:
                    ReviewCardRevisionItem.objects.create(
                        card_revision=card_revision,
                        change_item=item,
                        reviewable=True,
                        conflicted=False,
                        selectable=True,
                    )
            ReviewTask.objects.filter(id=task.id).update(
                completed_chunks=F('completed_chunks') + 1,
                completed_review_blocks=F('completed_review_blocks') + block_count,
                updated_at=timezone.now())
        return len(new_items)

    def _finish_review(self, task, session_uuid, message_id, exact_sdoc_version, changeset_revision, card_revision, truncated):
        has_items = ReviewChangeItem.objects.filter(changeset_revision=changeset_revision).exists()
        with transaction.atomic():
            if not has_items:
                ReviewTask.objects.filter(id=task.id).update(
                    generation_status=ReviewTask.GENERATION_FAILED,
                    error_code='no_suggestions',
                    generation_finished_at=timezone.now(),
                    updated_at=timezone.now())
                return
            assistant_message = ChatMessages.objects.filter(
                session_uuid=session_uuid, message_id=message_id, role='assistant').first()
            if not assistant_message:
                assistant_message = ChatMessages.objects.create_message(
                    session_uuid, message_id, 'assistant', _('I created a review suggestion.'))
            else:
                assistant_message.content = _('I created a review suggestion.')
                assistant_message.save(update_fields=['content'])
            ReviewTask.objects.filter(id=task.id).update(
                assistant_message_id=assistant_message.id,
                generation_status=ReviewTask.GENERATION_REVIEW_READY,
                error_code=None,
                generation_truncated=truncated,
                generation_finished_at=timezone.now(),
                base_sdoc_version=exact_sdoc_version,
                current_changeset_revision_id=changeset_revision.id,
                current_card_revision_id=card_revision.id,
                updated_at=timezone.now())
        ChatSessions.objects.filter(session_uuid=session_uuid).update(updated_at=timezone.now())


class ReviewTaskView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def get(self, request, task_id):
        ensure_review_tables()
        task = _get_review_task(task_id)
        if not task or not _is_requester(request, task):
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        _, error = get_sdoc_review_target(request, task.repo_id, task.path)
        if error:
            return error

        # Long-poll: hold the request while the task is still generating, so the
        # client does not need to hammer the endpoint. Return as soon as a chunk
        # updates the task, not only when generation reaches a terminal state.
        # The caller opts in via ?wait=1.
        if request.GET.get('wait') == '1' and task.generation_status in GENERATION_IN_PROGRESS:
            deadline = timezone.now() + timezone.timedelta(seconds=LONG_POLL_TIMEOUT_SECONDS)
            initial_updated_at = task.updated_at
            while task.generation_status in GENERATION_IN_PROGRESS and timezone.now() < deadline:
                time.sleep(LONG_POLL_INTERVAL_SECONDS)
                task.refresh_from_db()
                if task.updated_at != initial_updated_at:
                    break

        return Response({'task': task.to_dict(), 'card': _build_card_dict(task)})


class ReviewTaskApproveView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def post(self, request, task_id):
        ensure_review_tables()
        task = _get_review_task(task_id)
        if not task or not _is_requester(request, task):
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        if task.generation_status in GENERATION_IN_PROGRESS:
            return api_error(status.HTTP_409_CONFLICT, 'Review generation is still in progress.')
        uuid_map, error = _load_target_and_check(request, task.repo_id, task.path, require_edit=True)
        if error:
            return error
        card = task.current_card_revision
        if not card:
            return api_error(status.HTTP_409_CONFLICT, 'No review card to approve.')

        selected_item_ids = request.data.get('selected_item_ids') or []
        if not isinstance(selected_item_ids, list) or not selected_item_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'selected_item_ids must not be empty.')

        try:
            return self._approve(request, task, card, uuid_map, selected_item_ids)
        except CanonicalizationError as error:
            logger.warning('Invalid SDoc review approval request: %s', error)
            return api_error(status.HTTP_400_BAD_REQUEST, str(error))
        except Exception as error:
            logger.exception('Failed to approve SDoc review: %s', error)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Approve failed.')

    def _approve(self, request, task, card, uuid_map, selected_item_ids):
        membership_by_item = {
            str(m.change_item.item_id): m
            for m in ReviewCardRevisionItem.objects.filter(card_revision=card).select_related('change_item')
        }
        decided_item_ids = _decided_item_ids(card)
        selected = []
        for item_id in selected_item_ids:
            membership = membership_by_item.get(str(item_id))
            if not membership or not membership.selectable:
                return api_error(status.HTTP_409_CONFLICT, 'Selected item is not available.')
            if str(item_id) in decided_item_ids:
                return api_error(status.HTTP_409_CONFLICT, 'Selected item is already decided.')
            selected.append(membership)

        changeset = card.changeset_revision
        sorted_ids = sorted(str(m.change_item.item_id) for m in selected)
        selection_digest = compute_selection_digest(
            str(task.id), card.card_revision, changeset.changeset_revision,
            'approved', sorted_ids)

        selected_payloads = []
        for membership in selected:
            item = membership.change_item
            if item.kind in ('set_block_type', 'set_list_type'):
                selected_payloads.append({
                    'item_id': str(item.item_id),
                    'kind': item.kind,
                    'target': item.target,
                    'precondition': item.precondition,
                    'after_type': item.after_type,
                })
            else:
                selected_payloads.append({
                    'item_id': str(item.item_id),
                    'kind': item.kind,
                    'target': item.target,
                    'precondition': item.precondition,
                    'after_text': item.after_text,
                })

        decision_id = uuid.uuid4()
        attempt_id = uuid.uuid4()
        apply_payload_digest = compute_apply_payload_digest(
            str(task.id), str(decision_id), card.card_revision, str(changeset.id),
            changeset.changeset_revision, selection_digest, selected_payloads)

        apply_payload = {
            'schema_version': 'sdoc-apply/v1',
            'apply_attempt_id': str(attempt_id),
            'task_id': str(task.id),
            'review_decision_id': str(decision_id),
            'snapshot_id': changeset.snapshot_id,
            'document_incarnation': changeset.document_incarnation,
            'file_uuid': str(task.file_uuid),
            'doc_uuid': str(task.file_uuid),
            'changeset_revision_id': str(changeset.id),
            'changeset_revision': changeset.changeset_revision,
            'card_revision': card.card_revision,
            'decision_kind': 'approved',
            'approved_by': request.user.username,
            'selection_digest': selection_digest,
            'apply_payload_digest': apply_payload_digest,
            'selected_change_item_ids': sorted_ids,
            'selected_items': selected_payloads,
        }

        token = generate_sdoc_service_token(
            uuid_map.uuid, uuid_map.filename, request.user.username, 'sdoc_agent_apply',
            apply_attempt_id=apply_payload['apply_attempt_id'],
            task_id=apply_payload['task_id'],
            review_decision_id=apply_payload['review_decision_id'],
            snapshot_id=apply_payload['snapshot_id'],
            document_incarnation=apply_payload['document_incarnation'],
            doc_uuid=apply_payload['doc_uuid'],
            changeset_revision_id=apply_payload['changeset_revision_id'],
            changeset_revision=apply_payload['changeset_revision'],
            card_revision=apply_payload['card_revision'],
            decision_kind=apply_payload['decision_kind'],
            selection_digest=apply_payload['selection_digest'],
            apply_payload_digest=apply_payload['apply_payload_digest'],
            approved_by=request.user.username)

        with transaction.atomic():
            decision = ReviewDecision.objects.create(
                review_decision_id=decision_id,
                card_revision=card,
                decision_kind=ReviewDecision.KIND_APPROVED,
                selection_digest=selection_digest,
                operator=request.user.username,
            )
            for membership in selected:
                ReviewDecisionSelection.objects.create(decision=decision, card_revision_item=membership)
            attempt = ApplyAttempt.objects.create(
                apply_attempt_id=attempt_id,
                review_decision=decision,
                status=ApplyAttempt.STATUS_PENDING,
                approved_by=request.user.username,
                selection_digest=selection_digest,
                apply_payload_digest=apply_payload_digest,
                card_revision_number=card.card_revision,
                changeset_revision_number=changeset.changeset_revision,
                snapshot_id=changeset.snapshot_id,
                document_incarnation=changeset.document_incarnation,
            )

        ApplyAttempt.objects.filter(id=attempt.id, status=ApplyAttempt.STATUS_PENDING).update(
            status=ApplyAttempt.STATUS_COMMITTING, updated_at=timezone.now())

        try:
            sdoc_api = SdocServerAPI(str(uuid_map.uuid), uuid_map.filename, request.user.username)
            result = sdoc_api.apply_change_set(token, apply_payload)
        except Exception as error:
            result = _sdoc_apply_result_from_error(error)
            if result:
                logger.info('SDoc review preflight completed with status=%s.', result.get('status'))
            elif not is_indeterminate_sdoc_apply_error(error):
                logger.exception('Apply SDoc review failed: %s', error)
                ApplyAttempt.objects.filter(id=attempt.id, status=ApplyAttempt.STATUS_COMMITTING).update(
                    status=ApplyAttempt.STATUS_FAILED_PRECOMMIT, error_code='apply_failed', updated_at=timezone.now())
                attempt.refresh_from_db()
                return Response({'task': task.to_dict(), 'card': _build_card_dict(task)})
            else:
                logger.exception('Apply SDoc review result is indeterminate: %s', error)
                result = {'status': 'in_progress'}

        if result.get('status') == 'in_progress':
            result = self._query_apply_result_with_backoff(uuid_map, request, apply_payload, attempt)
            if result is None:
                self._mark_outcome_unknown(attempt)
            else:
                self._map_apply_result(attempt, result)
        else:
            self._map_apply_result(attempt, result)
        attempt.refresh_from_db()
        return Response({'task': task.to_dict(), 'card': _build_card_dict(task)})

    def _query_apply_result_with_backoff(self, uuid_map, request, apply_payload, attempt):
        deadline = timezone.now() + timezone.timedelta(seconds=60)
        ApplyAttempt.objects.filter(id=attempt.id).update(
            result_query_deadline_at=deadline, updated_at=timezone.now())
        delays = (1, 3, 10, 30)
        delay_index = 0
        while timezone.now() < deadline:
            result = self._query_apply_result(uuid_map, request, apply_payload, attempt)
            if result and isinstance(result, dict) and result.get('status') in (
                    'applied', 'preflight_conflicted', 'failed_precommit', 'outcome_unknown'):
                return result
            if delay_index < len(delays):
                time.sleep(delays[delay_index])
            else:
                time.sleep(30)
            delay_index += 1
        return None

    def _query_apply_result(self, uuid_map, request, apply_payload, attempt):
        try:
            query_token = generate_sdoc_service_token(
                uuid_map.uuid, uuid_map.filename, request.user.username, 'sdoc_agent_apply_result',
                apply_attempt_id=apply_payload['apply_attempt_id'],
                task_id=apply_payload['task_id'],
                review_decision_id=apply_payload['review_decision_id'],
                snapshot_id=apply_payload['snapshot_id'],
                document_incarnation=apply_payload['document_incarnation'],
                doc_uuid=apply_payload['doc_uuid'],
                changeset_revision_id=apply_payload['changeset_revision_id'],
                changeset_revision=apply_payload['changeset_revision'],
                card_revision=apply_payload['card_revision'],
                decision_kind=apply_payload['decision_kind'],
                selection_digest=apply_payload['selection_digest'],
                apply_payload_digest=apply_payload['apply_payload_digest'],
                approved_by=request.user.username)
            sdoc_api = SdocServerAPI(str(uuid_map.uuid), uuid_map.filename, request.user.username)
            return sdoc_api.get_apply_result(query_token, apply_payload['apply_attempt_id'])
        except Exception:
            logger.exception('Query SDoc apply result failed.')
            return None

    def _mark_outcome_unknown(self, attempt):
        ApplyAttempt.objects.filter(id=attempt.id).update(
            status=ApplyAttempt.STATUS_OUTCOME_UNKNOWN,
            error_code='post_commit_indeterminate',
            updated_at=timezone.now())

    def _map_apply_result(self, attempt, result):
        if not isinstance(result, dict):
            self._mark_outcome_unknown(attempt)
            return
        status_value = result.get('status')
        if status_value == 'applied':
            ApplyAttempt.objects.filter(id=attempt.id).update(
                status=ApplyAttempt.STATUS_APPLIED,
                applied_sdoc_version=result.get('applied_sdoc_version'),
                operation_log_correlation_id=result.get('operation_log_correlation_id'),
                persistence_status=result.get('persistence_status') or ApplyAttempt.PERSISTENCE_NOT_REQUESTED,
                updated_at=timezone.now())
        elif status_value == 'preflight_conflicted':
            ApplyAttempt.objects.filter(id=attempt.id).update(
                status=ApplyAttempt.STATUS_PREFLIGHT_CONFLICTED, updated_at=timezone.now())
            self._record_preflight_conflicts(attempt, result.get('conflicts'))
        elif status_value == 'failed_precommit':
            ApplyAttempt.objects.filter(id=attempt.id).update(
                status=ApplyAttempt.STATUS_FAILED_PRECOMMIT, error_code=result.get('error_code'), updated_at=timezone.now())
        elif status_value == 'outcome_unknown':
            self._mark_outcome_unknown(attempt)
        else:
            self._mark_outcome_unknown(attempt)

    def _record_preflight_conflicts(self, attempt, conflicts):
        conflict_by_item_id = {
            str(conflict.get('item_id')): conflict.get('conflict_code')
            for conflict in (conflicts or [])
            if isinstance(conflict, dict) and conflict.get('item_id')
        }
        global_conflict_codes = {
            conflict.get('conflict_code')
            for conflict in (conflicts or [])
            if isinstance(conflict, dict) and not conflict.get('item_id')
        }
        if not conflict_by_item_id and not global_conflict_codes:
            return

        summaries = {
            'before_hash_mismatch': _('Document content changed after this review was generated.'),
            'target_not_found': _('The original document content is no longer available.'),
            'block_type_mismatch': _('The document structure changed after this review was generated.'),
            'ancestor_path_mismatch': _('The document structure changed after this review was generated.'),
        }
        # A changed document incarnation has no single item_id: every item in
        # this card was projected from the retired in-memory document, so the
        # whole card must be made stale instead of silently remaining pending.
        if global_conflict_codes:
            memberships = ReviewCardRevisionItem.objects.filter(
                card_revision=attempt.review_decision.card_revision)
            global_summary = _('The document was reloaded after this review was generated. Generate a new review.')
        else:
            memberships = ReviewCardRevisionItem.objects.filter(
                card_revision=attempt.review_decision.card_revision,
                change_item__item_id__in=conflict_by_item_id.keys())
            global_summary = None
        for membership in memberships:
            code = conflict_by_item_id.get(str(membership.change_item.item_id))
            membership.conflicted = True
            membership.selectable = False
            membership.conflict_summary = global_summary or summaries.get(
                code, _('This suggestion conflicts with the latest document content.'))
            membership.save(update_fields=['conflicted', 'selectable', 'conflict_summary'])


class ReviewTaskRejectView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def post(self, request, task_id):
        ensure_review_tables()
        task = _get_review_task(task_id)
        if not task or not _is_requester(request, task):
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        if task.generation_status in GENERATION_IN_PROGRESS:
            return api_error(status.HTTP_409_CONFLICT, 'Review generation is still in progress.')
        _, error = get_sdoc_review_target(request, task.repo_id, task.path)
        if error:
            return error
        card = task.current_card_revision
        if not card:
            return api_error(status.HTTP_409_CONFLICT, 'No review card to reject.')

        memberships = list(ReviewCardRevisionItem.objects.filter(card_revision=card).select_related('change_item'))
        if not memberships:
            return api_error(status.HTTP_409_CONFLICT, 'No items to reject.')

        membership_by_item = {str(m.change_item.item_id): m for m in memberships}
        decided_item_ids = _decided_item_ids(card)

        selected_item_ids = request.data.get('selected_item_ids')
        if isinstance(selected_item_ids, list) and selected_item_ids:
            selected = []
            for item_id in selected_item_ids:
                membership = membership_by_item.get(str(item_id))
                if not membership:
                    return api_error(status.HTTP_409_CONFLICT, 'Selected item is not available.')
                if str(item_id) in decided_item_ids:
                    return api_error(status.HTTP_409_CONFLICT, 'Selected item is already decided.')
                selected.append(membership)
        else:
            selected = [m for m in memberships if str(m.change_item.item_id) not in decided_item_ids]

        if not selected:
            return api_error(status.HTTP_409_CONFLICT, 'No pending items to reject.')

        sorted_ids = sorted(str(m.change_item.item_id) for m in selected)
        selection_digest = compute_selection_digest(
            str(task.id), card.card_revision, card.changeset_revision.changeset_revision,
            'rejected', sorted_ids)

        with transaction.atomic():
            decision = ReviewDecision.objects.create(
                review_decision_id=uuid.uuid4(),
                card_revision=card,
                decision_kind=ReviewDecision.KIND_REJECTED,
                selection_digest=selection_digest,
                operator=request.user.username,
            )
            for membership in selected:
                ReviewDecisionSelection.objects.create(decision=decision, card_revision_item=membership)

        return Response({'task': task.to_dict(), 'card': _build_card_dict(task)})


class ReviewSaveResultView(APIView):
    authentication_classes = ()
    permission_classes = ()

    def post(self, request):
        ensure_review_tables()
        apply_attempt_id = request.data.get('apply_attempt_id')
        outcome = request.data.get('outcome')
        applied_version = request.data.get('applied_sdoc_version')
        if not apply_attempt_id or outcome not in ('persisted', 'save_pending', 'file_unavailable') or not isinstance(applied_version, int):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid save result.')

        attempt = ApplyAttempt.objects.filter(apply_attempt_id=apply_attempt_id).first()
        if not attempt:
            return api_error(status.HTTP_404_NOT_FOUND, 'Apply attempt not found.')
        if not self._verify_token(request, attempt, outcome, applied_version):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if outcome == 'persisted':
            next_status = ApplyAttempt.PERSISTENCE_PERSISTED
        elif outcome == 'save_pending':
            next_status = ApplyAttempt.PERSISTENCE_SAVE_PENDING
        else:
            next_status = ApplyAttempt.PERSISTENCE_FILE_UNAVAILABLE

        terminal = (ApplyAttempt.PERSISTENCE_PERSISTED, ApplyAttempt.PERSISTENCE_FILE_UNAVAILABLE)
        if attempt.persistence_status in terminal:
            if next_status == attempt.persistence_status:
                attempt.refresh_from_db()
                return Response({'attempt': attempt.to_dict()})
            return api_error(status.HTTP_409_CONFLICT, 'Save result conflicts with current state.')

        update_fields = {'persistence_status': next_status, 'updated_at': timezone.now()}
        if attempt.applied_sdoc_version is None:
            update_fields['applied_sdoc_version'] = applied_version
        ApplyAttempt.objects.filter(id=attempt.id).update(**update_fields)
        attempt.refresh_from_db()
        return Response({'attempt': attempt.to_dict()})

    def _verify_token(self, request, attempt, outcome, applied_version):
        auth = request.headers.get('Authorization', '').split()
        if len(auth) != 2 or auth[0].lower() != 'token':
            return False
        try:
            payload = jwt.decode(auth[1], settings.SEADOC_PRIVATE_KEY, algorithms=['HS256'])
        except Exception:
            return False
        if payload.get('purpose') != 'sdoc_agent_save_result':
            return False
        if str(payload.get('apply_attempt_id')) != str(attempt.apply_attempt_id):
            return False
        if str(payload.get('document_incarnation')) != str(attempt.document_incarnation):
            return False
        if payload.get('applied_sdoc_version') != applied_version:
            return False
        if payload.get('approved_by') != attempt.approved_by:
            return False
        if payload.get('outcome') != outcome:
            return False
        return True
