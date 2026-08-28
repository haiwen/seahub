import json
import logging
import os
import uuid

import jwt
from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError, transaction
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
    ReviewDecision, ReviewDecisionSelection, ApplyAttempt, ReviewGenerationChunk,
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
    gen_message_id, gen_chat_task_id, enqueue_sdoc_review_task,
    enqueue_sdoc_review_apply_attempt,
    AI_SCENARIO_CHAT,
    verify_chat_ai_config, user_passes_ai_chat_folder_permissions,
    resolve_repo_ai_usage_context, is_ai_usage_over_limit,
    resolve_sdoc_review_scope, SdocReviewScopeError,
    SdocReviewScopeAmbiguousError,
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
MAX_REVIEW_DECISION_ITEMS = 10
REVISION_BRIEF_REQUIRED_STRING_FIELDS = (
    'goal', 'tone', 'length', 'heading_strategy', 'do_not_modify',
)
GENERATION_IN_PROGRESS = ('queued', 'reading', 'drafting')
REVIEW_WORKER_TOKEN_PURPOSE = 'sdoc_review_worker'
REVIEW_WORKER_TOKEN_AUDIENCE = 'seahub_sdoc_review'
# This is a renewable worker lease, not a fixed Review duration. A healthy
# worker renews it before long model calls and whenever it reports progress.
REVIEW_WORKER_LEASE_SECONDS = 200
TEXT_CHANGE_KINDS = frozenset(('replace_block_text', 'replace_table_cell_text'))
LIST_TYPES = frozenset(('ordered_list', 'unordered_list'))
EDITABLE_TEXT_BLOCK_TYPES = frozenset((
    'title', 'subtitle', 'paragraph', 'header1', 'header2', 'header3',
    'header4', 'header5', 'header6', 'list_item', 'table_cell',
))
EDITABLE_HEADING_TYPES = frozenset((
    'paragraph', 'header1', 'header2', 'header3', 'header4', 'header5', 'header6',
))


def _get_review_task(task_id):
    try:
        return ReviewTask.objects.select_related('assistant_message').get(id=task_id)
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


def _is_valid_revision_brief(brief):
    if not isinstance(brief, dict):
        return False
    if any(not isinstance(brief.get(field), str) or not brief[field].strip()
           for field in REVISION_BRIEF_REQUIRED_STRING_FIELDS):
        return False
    terminology = brief.get('terminology')
    return isinstance(terminology, list) and all(
        isinstance(term, str) and term.strip() for term in terminology)


def _has_duplicate_item_ids(item_ids):
    return len({str(item_id) for item_id in item_ids}) != len(item_ids)


def _has_too_many_decision_items(item_ids):
    return len(item_ids) > MAX_REVIEW_DECISION_ITEMS


def _review_generation_expired(task, now=None):
    deadline = task.generation_deadline_at
    return deadline is not None and deadline <= (now or timezone.now())


def _renew_review_worker_lease(task, now=None):
    now = now or timezone.now()
    task.generation_deadline_at = now + timezone.timedelta(
        seconds=REVIEW_WORKER_LEASE_SECONDS)
    task.updated_at = now
    task.save(update_fields=['generation_deadline_at', 'updated_at'])


def _is_safe_review_finish(total_chunks, completed_chunks, truncated, stop_reason):
    if truncated:
        return (
            stop_reason == 'suggestion_limit_reached'
            and 0 < completed_chunks <= total_chunks
        )
    return stop_reason is None and completed_chunks == total_chunks


def _filter_document_context_to_scope(document_context, task):
    allowed_block_ids = set(getattr(task, 'allowed_block_ids', None) or [])
    allowed_text_targets = {
        (target.get('block_id'), target.get('text_node_id'))
        for target in (getattr(task, 'allowed_text_targets', None) or [])
        if isinstance(target, dict)
    }
    if not allowed_block_ids or not allowed_text_targets:
        raise RuntimeError('Review scope is unavailable.')
    context = dict(document_context)
    context['blocks'] = [
        block for block in document_context.get('blocks') or []
        if isinstance(block, dict)
        and block.get('block_id') in allowed_block_ids
        and (block.get('block_id'), block.get('text_node_id')) in allowed_text_targets
    ]
    context['lists'] = [
        list_node for list_node in document_context.get('lists') or []
        if isinstance(list_node, dict) and list_node.get('block_id') in allowed_block_ids
    ]
    context['outline'] = [
        header for header in document_context.get('outline') or []
        if isinstance(header, dict) and header.get('block_id') in allowed_block_ids
    ]
    context['scope_summary'] = getattr(task, 'scope_summary', '')
    return context


def _document_context_matches_task_snapshot(task, document_context):
    """Compare a worker context with the immutable identity captured at creation."""
    if not isinstance(document_context, dict):
        return False
    return (
        str(document_context.get('file_uuid')) == str(task.file_uuid)
        and str(document_context.get('snapshot_id')) == str(task.scope_snapshot_id)
        and str(document_context.get('document_incarnation'))
        == str(task.scope_document_incarnation)
        and document_context.get('exact_sdoc_version') == task.scope_sdoc_version
    )


def _suggestion_is_within_task_scope(suggestion, task):
    if not isinstance(suggestion, dict):
        return False
    kind = suggestion.get('kind')
    if kind not in TEXT_CHANGE_KINDS | {'set_block_type', 'set_list_type'}:
        return False
    block_id = suggestion.get('block_id')
    if block_id not in set(getattr(task, 'allowed_block_ids', None) or []):
        return False
    if kind in TEXT_CHANGE_KINDS:
        return (block_id, suggestion.get('text_node_id')) in {
            (target.get('block_id'), target.get('text_node_id'))
            for target in (getattr(task, 'allowed_text_targets', None) or [])
            if isinstance(target, dict)
        }
    return True


def _lookup_block(document_context, block_id, text_node_id):
    for block in document_context.get('blocks') or []:
        if block.get('block_id') == block_id and block.get('text_node_id') == text_node_id:
            return block
    return None


def _review_target_key(kind, target):
    block_id = target.get('block_id') or ''
    if kind in TEXT_CHANGE_KINDS:
        return 'text:%s:%s' % (block_id, target.get('text_node_id') or '')
    if kind == 'set_block_type':
        return 'block-type:%s' % block_id
    if kind == 'set_list_type':
        return 'list-type:%s' % block_id
    return None


def _filter_unique_review_items(items, existing_logical_ids, existing_target_keys):
    """Keep the first proposed edit for each immutable review target."""
    new_target_keys = set()
    result = []
    for item in items:
        if (item.logical_item_id in existing_logical_ids
                or item.target_key in existing_target_keys
                or item.target_key in new_target_keys):
            continue
        new_target_keys.add(item.target_key)
        result.append(item)
    return result


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
    decision_by_item = {}
    selections = list(
        ReviewDecisionSelection.objects.filter(decision__card_revision=card)
        .select_related('decision', 'card_revision_item__change_item')
        .order_by('decision__created_at'))
    for selection in selections:
        item_id = str(selection.card_revision_item.change_item.item_id)
        decision_by_item[item_id] = selection.decision
    attempt_by_decision_id = {
        attempt.review_decision_id: attempt
        for attempt in ApplyAttempt.objects.filter(
            review_decision_id__in={decision.id for decision in decision_by_item.values()})
    }

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
                attempt = attempt_by_decision_id.get(decision.id)
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


def _decided_item_ids(card):
    decided = set()
    selections = list(
        ReviewDecisionSelection.objects.filter(decision__card_revision=card)
        .select_related('decision', 'card_revision_item__change_item'))
    attempt_by_decision_id = {
        attempt.review_decision_id: attempt
        for attempt in ApplyAttempt.objects.filter(
            review_decision_id__in={selection.decision_id for selection in selections})
    }
    for selection in selections:
        decision = selection.decision
        attempt = attempt_by_decision_id.get(decision.id)
        if decision.decision_kind == ReviewDecision.KIND_APPROVED and attempt and attempt.status == ApplyAttempt.STATUS_PREFLIGHT_CONFLICTED:
            # The batch was rejected before commit, so its non-conflicting items
            # must remain eligible for a subsequent approval.
            continue
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
        generation_deadline_at=None,
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


def _is_review_worker_request(request):
    auth = request.headers.get('Authorization', '').split()
    if len(auth) != 2 or auth[0].lower() != 'token' or not settings.JWT_PRIVATE_KEY:
        return False
    try:
        payload = jwt.decode(auth[1], settings.JWT_PRIVATE_KEY, algorithms=['HS256'])
    except Exception:
        return False
    return (
        payload.get('is_internal') is True
        and payload.get('purpose') == REVIEW_WORKER_TOKEN_PURPOSE
        and payload.get('audience') == REVIEW_WORKER_TOKEN_AUDIENCE
    )


def _review_worker_forbidden(request):
    if _is_review_worker_request(request):
        return None
    return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')


def _document_context_matches_revision(task, revision, document_context):
    if not isinstance(document_context, dict):
        return False
    return (
        str(document_context.get('file_uuid')) == str(task.file_uuid)
        and str(document_context.get('snapshot_id')) == str(revision.snapshot_id)
        and str(document_context.get('document_incarnation')) == str(revision.document_incarnation)
        and document_context.get('exact_sdoc_version') == revision.exact_sdoc_version
    )


def _map_suggestions(document_context, file_uuid, document_incarnation, changeset_revision, suggestions, start_order, chunk_index=None):
    """Map model suggestions to ReviewChangeItem objects (no DB write)."""
    items = []
    item_order = start_order
    for suggestion in suggestions:
        if not isinstance(suggestion, dict):
            continue
        kind = suggestion.get('kind') or PHASE1_KIND
        rationale = suggestion.get('rationale') or ''
        if not isinstance(rationale, str):
            rationale = ''
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
            if block_type not in LIST_TYPES or after_type not in LIST_TYPES or block_type == after_type:
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
            if block_type not in EDITABLE_HEADING_TYPES or after_type not in EDITABLE_HEADING_TYPES or block_type == after_type:
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
        elif kind in TEXT_CHANGE_KINDS:
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
            if block_type not in EDITABLE_TEXT_BLOCK_TYPES:
                continue
            if kind == 'replace_table_cell_text' and block_type != 'table_cell':
                continue
            if kind == 'replace_block_text' and block_type == 'table_cell':
                continue
            actual_before_text = block.get('before_leaf_text')
            if not isinstance(before_leaf_text, str) or before_leaf_text != actual_before_text:
                continue
            if not isinstance(after_text, str) or after_text == actual_before_text:
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
                    'before_leaf_text': actual_before_text,
                    'canonical_before_hash': block.get('canonical_before_hash'),
                    'hash_algorithm': 'SHA-256',
                    'hash_schema_version': HASH_SCHEMA_VERSION,
                    'projection_version': PROJECTION_VERSION,
                },
                after_text=after_text,
                rationale=rationale,
                sort_order=item_order,
            )
        else:
            continue

        target = item.target
        item.target_key = _review_target_key(kind, target)
        ident = '%s:%s:%s:%s:%s:%s' % (
            changeset_revision.review_task_id, kind, target.get('block_id'), target.get('text_node_id', ''),
            item.after_type or '', item.after_text or '')
        item.logical_item_id = uuid.uuid5(uuid.NAMESPACE_DNS, ident)

        items.append(item)
        item_order += 1
    return items


class ReviewTasksView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
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

        if not verify_chat_ai_config():
            return api_error(status.HTTP_400_BAD_REQUEST, 'AI server not configured')
        if not user_passes_ai_chat_folder_permissions(request, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        requested_org_id = request.user.org.org_id if getattr(request.user, 'org', None) else None
        usage_context = resolve_repo_ai_usage_context(repo_id, requested_org_id, AI_SCENARIO_CHAT)
        if is_ai_usage_over_limit(request.user, usage_context['repo_owner'], usage_context['org_id']):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        session = _get_session(request, session_uuid, repo_id)
        if not session:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')

        try:
            creation_context = _fetch_document_context(uuid_map, request.user.username)
            scope = resolve_sdoc_review_scope(prompt, creation_context)
        except SdocReviewScopeAmbiguousError as error:
            try:
                message_id = gen_message_id(session_uuid)
            except Exception:
                logger.exception('Failed to allocate chat message id.')
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error.')
            candidate_titles = [
                str(candidate.get('text')) for candidate in error.candidates
                if isinstance(candidate, dict) and candidate.get('text')
            ]
            content = _('I found multiple matching sections: {sections}. Please specify the chapter number or select the target section.').replace(
                '{sections}', ', '.join(candidate_titles) or _('the matching sections'))
            with transaction.atomic():
                user_message = ChatMessages.objects.create_message(session_uuid, message_id, 'user', prompt, attachments=[])
                assistant_message = ChatMessages.objects.create_message(session_uuid, message_id, 'assistant', content, attachments=[])
                ChatSessions.objects.filter(session_uuid=session_uuid).update(updated_at=timezone.now())
            return Response({
                'route': 'clarify',
                'messages': [user_message.to_dict(), assistant_message.to_dict()],
            }, status=status.HTTP_201_CREATED)
        except SdocReviewScopeError:
            logger.exception('Failed to resolve SDoc review scope.')
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, 'Review scope unavailable.')
        except Exception:
            logger.exception('Failed to read SDoc review scope.')
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, 'Document snapshot unavailable.')

        allowed_block_ids = scope.get('allowed_block_ids') if isinstance(scope, dict) else None
        allowed_text_targets = scope.get('allowed_text_targets') if isinstance(scope, dict) else None
        if not isinstance(allowed_block_ids, list) or not isinstance(allowed_text_targets, list):
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, 'Review scope unavailable.')

        if cache.get(gen_chat_task_id(session_uuid)) is not None:
            return api_error(
                status.HTTP_409_CONFLICT,
                'There are unfinished tasks in the current session, please try again later.')

        try:
            message_id = gen_message_id(session_uuid)
        except Exception:
            logger.exception('Failed to allocate chat message id.')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error.')

        with transaction.atomic():
            ChatSessions.objects.select_for_update().get(pk=session.pk)
            if ReviewTask.objects.filter(
                    chat_session_id=session_uuid,
                    generation_status__in=GENERATION_IN_PROGRESS).exists():
                return api_error(
                    status.HTTP_409_CONFLICT,
                    'There are unfinished tasks in the current session, please try again later.')
            if ApplyAttempt.objects.filter(
                    review_decision__card_revision__review_task__chat_session_id=session_uuid,
                    status=ApplyAttempt.STATUS_COMMITTING).exists():
                return api_error(
                    status.HTTP_409_CONFLICT,
                    'There are unfinished tasks in the current session, please try again later.')
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
                route=route,
                org_id=usage_context['org_id'],
                message_id=message_id,
                allowed_block_ids=allowed_block_ids,
                allowed_text_targets=allowed_text_targets,
                scope_summary=scope.get('scope_summary') or '',
                scope_snapshot_id=creation_context.get('snapshot_id'),
                scope_document_incarnation=creation_context.get('document_incarnation'),
                scope_sdoc_version=creation_context.get('exact_sdoc_version'),
                generation_status=ReviewTask.GENERATION_QUEUED,
                generation_revision=1,
            )
        try:
            enqueue_sdoc_review_task(task.id)
        except Exception:
            # The task remains queued. SeafEvents periodically reconciles queued
            # rows through the internal pending endpoint after a transient outage.
            logger.exception('Failed to enqueue SDoc review task %s.', task.id)
        return Response({
            'route': route,
            'task': task.to_dict(),
            'messages': [user_message.to_dict()],
        }, status=status.HTTP_202_ACCEPTED)

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
            receipt, receipt_created = ReviewGenerationChunk.objects.get_or_create(
                review_task=task,
                generation_attempt_id=task.generation_attempt_id,
                chunk_index=chunk_index,
                defaults={'block_count': block_count},
            )
            if not receipt_created:
                return {
                    'created_count': receipt.created_item_count,
                    'limit_reached': False,
                    'duplicate': True,
                }
            existing_items = ReviewChangeItem.objects.filter(changeset_revision=changeset_revision)
            existing_count = existing_items.count()
            existing_order = existing_items.aggregate(max_order=Max('sort_order'))['max_order']
            start_order = 0 if existing_order is None else existing_order + 1
            remaining_slots = max(MAX_CHANGE_ITEMS - existing_count, 0)
            if remaining_slots == 0:
                receipt.created_item_count = 0
                receipt.save(update_fields=['created_item_count'])
                return {'created_count': 0, 'limit_reached': True}
            items = _map_suggestions(
                document_context, file_uuid, document_incarnation,
                changeset_revision, suggestions[:remaining_slots], start_order, chunk_index)
            existing_ids = set(existing_items.values_list('logical_item_id', flat=True))
            existing_target_keys = set(existing_items.values_list('target_key', flat=True))
            new_items = _filter_unique_review_items(items, existing_ids, existing_target_keys)
            if items and not new_items:
                # A retry of a chunk that was already persisted must not make the
                # visible progress counter advance twice.
                receipt.created_item_count = 0
                receipt.save(update_fields=['created_item_count'])
                return {'created_count': 0, 'limit_reached': False, 'duplicate': True}
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
            receipt.created_item_count = len(new_items)
            receipt.save(update_fields=['created_item_count'])
        return {
            'created_count': len(new_items),
            'limit_reached': len(suggestions) > remaining_slots,
        }

    def _finish_review(self, task, session_uuid, message_id, exact_sdoc_version,
                       changeset_revision, card_revision, truncated, stop_reason=None):
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
            elif task.route != 'answer_then_review':
                assistant_message.content = _('I created a review suggestion.')
                assistant_message.save(update_fields=['content'])
            ReviewTask.objects.filter(id=task.id).update(
                assistant_message_id=assistant_message.id,
                generation_status=ReviewTask.GENERATION_REVIEW_READY,
                error_code=None,
                generation_truncated=truncated,
                generation_stop_reason=stop_reason,
                generation_finished_at=timezone.now(),
                base_sdoc_version=exact_sdoc_version,
                current_changeset_revision_id=changeset_revision.id,
                current_card_revision_id=card_revision.id,
                updated_at=timezone.now())
        ChatSessions.objects.filter(session_uuid=session_uuid).update(updated_at=timezone.now())


class ReviewWorkerPendingView(APIView):
    """Reconcile durable ReviewTask rows with the SeafEvents Redis queue."""
    authentication_classes = ()
    permission_classes = ()

    def post(self, request):
        error = _review_worker_forbidden(request)
        if error:
            return error

        now = timezone.now()
        stale_tasks = list(ReviewTask.objects.filter(
            generation_status__in=(ReviewTask.GENERATION_READING, ReviewTask.GENERATION_DRAFTING),
            generation_deadline_at__lt=now,
        ))
        for task in stale_tasks:
            mark_generation_failed(
                task,
                attempt_id=task.generation_attempt_id,
                error_code='generation_timeout',
            )

        task_ids = list(
            ReviewTask.objects.filter(generation_status=ReviewTask.GENERATION_QUEUED)
            .order_by('created_at').values_list('id', flat=True)[:100]
        )
        ApplyAttempt.objects.filter(
            status=ApplyAttempt.STATUS_COMMITTING,
            result_query_deadline_at__lt=now,
        ).update(
            status=ApplyAttempt.STATUS_OUTCOME_UNKNOWN,
            error_code='post_commit_indeterminate',
            updated_at=now,
        )
        apply_attempt_ids = list(
            ApplyAttempt.objects.filter(status=ApplyAttempt.STATUS_COMMITTING)
            .order_by('created_at').values_list('apply_attempt_id', flat=True)[:100]
        )
        return Response({
            'task_ids': [str(task_id) for task_id in task_ids],
            'apply_attempt_ids': [str(attempt_id) for attempt_id in apply_attempt_ids],
        })


class ReviewWorkerApplyReconcileView(APIView):
    """Perform one non-blocking reconciliation query for an ApplyAttempt."""

    authentication_classes = ()
    permission_classes = ()

    def post(self, request, apply_attempt_id):
        error = _review_worker_forbidden(request)
        if error:
            return error

        attempt = ApplyAttempt.objects.select_related(
            'review_decision__card_revision__review_task').filter(
                apply_attempt_id=apply_attempt_id).first()
        if not attempt:
            return api_error(status.HTTP_404_NOT_FOUND, 'Apply attempt not found.')
        if attempt.status != ApplyAttempt.STATUS_COMMITTING:
            return Response({'terminal': True, 'attempt': attempt.to_dict()})
        if attempt.result_query_deadline_at and attempt.result_query_deadline_at <= timezone.now():
            ReviewTaskApproveView()._mark_outcome_unknown(attempt)
            attempt.refresh_from_db()
            return Response({'terminal': True, 'attempt': attempt.to_dict()})

        handler = ReviewTaskApproveView()
        result = handler._query_apply_result(attempt)
        if isinstance(result, dict) and result.get('status') in (
                'applied', 'preflight_conflicted', 'failed_precommit', 'outcome_unknown'):
            handler._map_apply_result(attempt, result)
            attempt.refresh_from_db()
            return Response({'terminal': True, 'attempt': attempt.to_dict()})
        return Response({'terminal': False, 'attempt': attempt.to_dict()})


class ReviewWorkerClaimView(APIView):
    authentication_classes = ()
    permission_classes = ()

    def post(self, request, task_id):
        error = _review_worker_forbidden(request)
        if error:
            return error

        try:
            attempt_id = uuid.UUID(str(request.data.get('attempt_id')))
        except (TypeError, ValueError):
            return api_error(status.HTTP_400_BAD_REQUEST, 'attempt_id is invalid.')

        claimed = ReviewTask.objects.filter(
            id=task_id,
            generation_status=ReviewTask.GENERATION_QUEUED,
        ).update(
            generation_status=ReviewTask.GENERATION_READING,
            generation_attempt_id=attempt_id,
            generation_revision=F('generation_revision') + 1,
            generation_deadline_at=(
                timezone.now() + timezone.timedelta(seconds=REVIEW_WORKER_LEASE_SECONDS)
            ),
            updated_at=timezone.now(),
        )
        task = ReviewTask.objects.filter(id=task_id).first()
        if not task:
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        if not claimed and not (
                task.generation_attempt_id == attempt_id
                and task.generation_status in (ReviewTask.GENERATION_READING, ReviewTask.GENERATION_DRAFTING)):
            return api_error(status.HTTP_409_CONFLICT, 'Review task is not claimable.')

        try:
            uuid_map = _get_uuid_map(task.repo_id, task.path)
            if str(uuid_map.uuid) != str(task.file_uuid):
                raise RuntimeError('The ReviewTask file identity no longer matches its path.')
            document_context = _fetch_document_context(uuid_map, task.requester)
            if not _document_context_matches_task_snapshot(task, document_context):
                mark_generation_failed(
                    task, attempt_id=attempt_id,
                    error_code='document_changed_before_generation')
                return api_error(
                    status.HTTP_409_CONFLICT,
                    'The document changed before review generation began.')
            document_context = _filter_document_context_to_scope(document_context, task)
            if not document_context.get('blocks') and not document_context.get('lists'):
                raise RuntimeError('The ReviewTask scope no longer has editable targets.')
        except Exception:
            logger.exception('Failed to fetch SDoc snapshot for review task %s.', task.id)
            mark_generation_failed(task, attempt_id=attempt_id, error_code='snapshot_unavailable')
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, 'Document snapshot unavailable.')

        return Response({
            'task': {
                'id': str(task.id),
                'prompt': task.prompt,
                'route': task.route,
                'username': task.requester,
                'org_id': task.org_id,
                'repo_id': task.repo_id,
            },
            'document_context': document_context,
        })


class ReviewWorkerEventView(APIView):
    authentication_classes = ()
    permission_classes = ()

    def post(self, request, task_id):
        error = _review_worker_forbidden(request)
        if error:
            return error

        try:
            attempt_id = uuid.UUID(str(request.data.get('attempt_id')))
        except (TypeError, ValueError):
            return api_error(status.HTTP_400_BAD_REQUEST, 'attempt_id is invalid.')
        event_type = request.data.get('event_type')
        with transaction.atomic():
            task = ReviewTask.objects.select_for_update().select_related(
                'current_changeset_revision', 'current_card_revision').filter(id=task_id).first()
            if not task:
                return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
            if task.generation_attempt_id != attempt_id:
                return api_error(status.HTTP_409_CONFLICT, 'Review attempt is stale.')
            if _review_generation_expired(task):
                mark_generation_failed(
                    task, attempt_id=attempt_id, error_code='generation_timeout')
                return api_error(status.HTTP_409_CONFLICT, 'Review task has timed out.')

            if event_type == 'heartbeat':
                return self._heartbeat(task)
            if event_type != 'failed':
                _renew_review_worker_lease(task)

            if event_type == 'analysis':
                return self._analysis(task, request.data)
            if event_type == 'begin':
                return self._begin(task, request.data)
            if event_type == 'chunk':
                return self._chunk(task, request.data)
            if event_type == 'finish':
                return self._finish(task, request.data)
            if event_type == 'failed':
                error_code = request.data.get('error_code') or 'generation_failed'
                if not isinstance(error_code, str) or len(error_code) > 64:
                    error_code = 'generation_failed'
                mark_generation_failed(task, attempt_id=attempt_id, error_code=error_code)
                return Response({'accepted': True})
            return api_error(status.HTTP_400_BAD_REQUEST, 'event_type is invalid.')

    def _heartbeat(self, task):
        if task.generation_status not in (ReviewTask.GENERATION_READING, ReviewTask.GENERATION_DRAFTING):
            return api_error(status.HTTP_409_CONFLICT, 'Review task is not running.')
        _renew_review_worker_lease(task)
        return Response({'accepted': True})

    def _analysis(self, task, data):
        if task.generation_status not in (ReviewTask.GENERATION_READING, ReviewTask.GENERATION_DRAFTING):
            return api_error(status.HTTP_409_CONFLICT, 'Review task is not running.')
        content = data.get('content')
        if not isinstance(content, str) or not content:
            return api_error(status.HTTP_400_BAD_REQUEST, 'content is invalid.')
        ChatMessages.objects.filter(
            session_uuid=task.chat_session_id,
            message_id=task.message_id,
            role='assistant',
        ).update(content=content, updated_at=timezone.now())
        ChatSessions.objects.filter(session_uuid=task.chat_session_id).update(updated_at=timezone.now())
        return Response({'accepted': True})

    def _begin(self, task, data):
        if task.generation_status == ReviewTask.GENERATION_DRAFTING:
            if task.current_changeset_revision_id and task.current_card_revision_id:
                return Response({
                    'changeset_revision_id': str(task.current_changeset_revision_id),
                    'card_revision_id': str(task.current_card_revision_id),
                })
            return api_error(status.HTTP_409_CONFLICT, 'Review task has an incomplete draft.')
        if task.generation_status != ReviewTask.GENERATION_READING:
            return api_error(status.HTTP_409_CONFLICT, 'Review task is not ready to begin.')

        document_context = data.get('document_context')
        total_chunks = data.get('total_chunks')
        total_blocks = data.get('total_blocks')
        if not isinstance(document_context, dict):
            return api_error(status.HTTP_400_BAD_REQUEST, 'document_context is invalid.')
        if not isinstance(total_chunks, int) or total_chunks < 1:
            return api_error(status.HTTP_400_BAD_REQUEST, 'total_chunks is invalid.')
        if not isinstance(total_blocks, int) or total_blocks < 1:
            return api_error(status.HTTP_400_BAD_REQUEST, 'total_blocks is invalid.')
        if not _document_context_matches_task_snapshot(task, document_context):
            return api_error(status.HTTP_409_CONFLICT, 'Document snapshot does not match the task.')
        try:
            scoped_context = _filter_document_context_to_scope(document_context, task)
        except RuntimeError:
            return api_error(status.HTTP_409_CONFLICT, 'Review scope is unavailable.')
        if (len(scoped_context.get('blocks') or []) != len(document_context.get('blocks') or [])
                or len(scoped_context.get('lists') or []) != len(document_context.get('lists') or [])):
            return api_error(status.HTTP_400_BAD_REQUEST, 'document_context exceeds the review scope.')
        if total_chunks > 1 and not _is_valid_revision_brief(data.get('brief')):
            return api_error(status.HTTP_400_BAD_REQUEST, 'revision brief is invalid.')

        changeset, card = ReviewTasksView()._begin_review(
            task,
            task.chat_session_id,
            task.message_id,
            document_context,
            data.get('brief'),
            total_chunks,
            total_blocks,
        )
        return Response({
            'changeset_revision_id': str(changeset.id),
            'card_revision_id': str(card.id),
        })

    def _chunk(self, task, data):
        if task.generation_status != ReviewTask.GENERATION_DRAFTING:
            return api_error(status.HTTP_409_CONFLICT, 'Review task is not drafting.')
        changeset = task.current_changeset_revision
        card = task.current_card_revision
        document_context = data.get('document_context')
        suggestions = data.get('suggestions')
        chunk_index = data.get('chunk_index')
        block_count = data.get('block_count')
        if not changeset or not card or not _document_context_matches_revision(
                task, changeset, document_context):
            return api_error(status.HTTP_409_CONFLICT, 'Document snapshot does not match the review.')
        if not isinstance(suggestions, list) or not isinstance(chunk_index, int):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Chunk payload is invalid.')
        if chunk_index < 0 or chunk_index >= task.total_chunks:
            return api_error(status.HTTP_400_BAD_REQUEST, 'chunk_index is out of range.')
        if not isinstance(block_count, int) or block_count < 0:
            return api_error(status.HTTP_400_BAD_REQUEST, 'block_count is invalid.')
        if any(not _suggestion_is_within_task_scope(suggestion, task) for suggestion in suggestions):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Chunk suggestion exceeds the review scope.')

        result = ReviewTasksView()._persist_chunk(
            task, changeset, card, document_context,
            chunk_index, block_count, suggestions,
        )
        return Response(result)

    def _finish(self, task, data):
        if task.generation_status == ReviewTask.GENERATION_REVIEW_READY:
            return Response({'accepted': True})
        if task.generation_status != ReviewTask.GENERATION_DRAFTING:
            return api_error(status.HTTP_409_CONFLICT, 'Review task is not drafting.')
        changeset = task.current_changeset_revision
        card = task.current_card_revision
        document_context = data.get('document_context')
        if not changeset or not card or not _document_context_matches_revision(
                task, changeset, document_context):
            return api_error(status.HTTP_409_CONFLICT, 'Document snapshot does not match the review.')
        truncated = bool(data.get('truncated'))
        stop_reason = data.get('stop_reason')
        completed_chunks = ReviewGenerationChunk.objects.filter(review_task=task).count()
        if not _is_safe_review_finish(
                task.total_chunks, completed_chunks, truncated, stop_reason):
            return api_error(status.HTTP_409_CONFLICT, 'Review generation is incomplete.')
        ReviewTasksView()._finish_review(
            task,
            task.chat_session_id,
            task.message_id,
            document_context.get('exact_sdoc_version'),
            changeset,
            card,
            truncated,
            stop_reason,
        )
        return Response({'accepted': True})


class ReviewTaskView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def get(self, request, task_id):
        task = _get_review_task(task_id)
        if not task or not _is_requester(request, task):
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        _uuid_map, error = get_sdoc_review_target(request, task.repo_id, task.path)
        if error:
            return error

        return Response({'task': task.to_dict(), 'card': _build_card_dict(task)})


class ReviewTaskCancelView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def post(self, request, task_id):
        task = _get_review_task(task_id)
        if not task or not _is_requester(request, task):
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        _uuid_map, error = get_sdoc_review_target(request, task.repo_id, task.path)
        if error:
            return error

        with transaction.atomic():
            task = ReviewTask.objects.select_for_update().select_related(
                'assistant_message').filter(id=task_id).first()
            if task.generation_status == ReviewTask.GENERATION_CANCELLED:
                return Response({'task': task.to_dict(), 'card': None})
            if task.generation_status not in GENERATION_IN_PROGRESS:
                return api_error(status.HTTP_409_CONFLICT, 'Review task is not running.')

            card_ids = list(ReviewCardRevision.objects.filter(
                review_task=task).values_list('id', flat=True))
            changeset_ids = list(ReviewChangeSetRevision.objects.filter(
                review_task=task).values_list('id', flat=True))

            task.current_card_revision = None
            task.current_changeset_revision = None
            task.generation_status = ReviewTask.GENERATION_CANCELLED
            task.generation_attempt_id = None
            task.generation_stop_reason = 'cancelled_by_user'
            task.generation_finished_at = timezone.now()
            task.generation_deadline_at = None
            task.total_chunks = 0
            task.completed_chunks = 0
            task.total_review_blocks = 0
            task.completed_review_blocks = 0
            task.save(update_fields=[
                'current_card_revision', 'current_changeset_revision',
                'generation_status', 'generation_attempt_id',
                'generation_stop_reason', 'generation_finished_at', 'generation_deadline_at',
                'total_chunks', 'completed_chunks', 'total_review_blocks',
                'completed_review_blocks', 'updated_at',
            ])

            if card_ids:
                ReviewCardRevisionItem.objects.filter(
                    card_revision_id__in=card_ids).delete()
                ReviewCardRevision.objects.filter(id__in=card_ids).delete()
            if changeset_ids:
                ReviewChangeItem.objects.filter(
                    changeset_revision_id__in=changeset_ids).delete()
                ReviewChangeSetRevision.objects.filter(id__in=changeset_ids).delete()
            ReviewGenerationChunk.objects.filter(review_task=task).delete()

            if task.assistant_message_id:
                task.assistant_message.content = _('Review stopped.')
                task.assistant_message.save(update_fields=['content', 'updated_at'])
            ChatSessions.objects.filter(
                session_uuid=task.chat_session_id).update(updated_at=timezone.now())

        return Response({'task': task.to_dict(), 'card': None})


class ReviewTaskApproveView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def post(self, request, task_id):
        task = _get_review_task(task_id)
        if not task or not _is_requester(request, task):
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        if task.generation_status != ReviewTask.GENERATION_REVIEW_READY:
            return api_error(status.HTTP_409_CONFLICT, 'Review task is not ready for decisions.')
        uuid_map, error = _load_target_and_check(request, task.repo_id, task.path, require_edit=True)
        if error:
            return error
        card = task.current_card_revision
        if not card:
            return api_error(status.HTTP_409_CONFLICT, 'No review card to approve.')

        selected_item_ids = request.data.get('selected_item_ids') or []
        if not isinstance(selected_item_ids, list) or not selected_item_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'selected_item_ids must not be empty.')
        if _has_duplicate_item_ids(selected_item_ids):
            return api_error(status.HTTP_400_BAD_REQUEST, 'selected_item_ids must be unique.')
        if _has_too_many_decision_items(selected_item_ids):
            return api_error(
                status.HTTP_400_BAD_REQUEST,
                'A review decision can contain at most %s items.' % MAX_REVIEW_DECISION_ITEMS)

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

        try:
            with transaction.atomic():
                # Serialize all decisions for the selected suggestions.  The
                # task lock also prevents Cancel from deleting the draft while
                # a decision is being created.
                locked_task = ReviewTask.objects.select_for_update().filter(
                    id=task.id,
                    generation_status=ReviewTask.GENERATION_REVIEW_READY,
                    current_card_revision=card,
                ).first()
                if not locked_task:
                    return api_error(status.HTTP_409_CONFLICT, 'Review task is not ready for decisions.')
                locked_memberships = list(
                    ReviewCardRevisionItem.objects.select_for_update().filter(
                        card_revision=card,
                        change_item__item_id__in=sorted_ids,
                    ).select_related('change_item').order_by('card_revision_item_id'))
                locked_by_item_id = {
                    str(membership.change_item.item_id): membership
                    for membership in locked_memberships
                }
                if len(locked_by_item_id) != len(sorted_ids):
                    return api_error(status.HTTP_409_CONFLICT, 'Selected item is not available.')
                selected = [locked_by_item_id[item_id] for item_id in selected_item_ids]
                if any(not membership.selectable for membership in selected):
                    return api_error(status.HTTP_409_CONFLICT, 'Selected item is not available.')
                if ReviewDecisionSelection.objects.select_for_update().filter(
                        card_revision_item__in=selected).exists():
                    return api_error(status.HTTP_409_CONFLICT, 'Selected item is already decided.')

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
        except IntegrityError:
            # The database constraint is the final fence if another process
            # claims the same item outside this code path.
            return api_error(status.HTTP_409_CONFLICT, 'Selected item is already decided.')

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
            deadline = timezone.now() + timezone.timedelta(seconds=60)
            ApplyAttempt.objects.filter(id=attempt.id).update(
                result_query_deadline_at=deadline, updated_at=timezone.now())
            try:
                enqueue_sdoc_review_apply_attempt(attempt.apply_attempt_id)
            except Exception:
                # The SeafEvents recovery sweep also discovers committing rows.
                logger.exception(
                    'Failed to enqueue SDoc apply reconciliation %s.',
                    attempt.apply_attempt_id)
            attempt.refresh_from_db()
            return Response(
                {'task': task.to_dict(), 'card': _build_card_dict(task)},
                status=status.HTTP_202_ACCEPTED)
        else:
            self._map_apply_result(attempt, result)
        attempt.refresh_from_db()
        return Response({'task': task.to_dict(), 'card': _build_card_dict(task)})

    def _query_apply_result(self, attempt):
        try:
            card = attempt.review_decision.card_revision
            task = card.review_task
            uuid_map = _get_uuid_map(task.repo_id, task.path)
            query_token = generate_sdoc_service_token(
                uuid_map.uuid, uuid_map.filename, attempt.approved_by,
                'sdoc_agent_apply_result',
                apply_attempt_id=str(attempt.apply_attempt_id))
            sdoc_api = SdocServerAPI(
                str(uuid_map.uuid), uuid_map.filename, attempt.approved_by)
            return sdoc_api.get_apply_result(
                query_token, str(attempt.apply_attempt_id))
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
            # Preflight failed before SDoc committed anything. Keep selections
            # for the conflicting items as their terminal conflict record, but
            # release every other item so it can be approved again.
            ReviewDecisionSelection.objects.filter(
                decision=attempt.review_decision,
            ).exclude(
                card_revision_item__change_item__item_id__in=conflict_by_item_id.keys(),
            ).delete()
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
        task = _get_review_task(task_id)
        if not task or not _is_requester(request, task):
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        if task.generation_status != ReviewTask.GENERATION_REVIEW_READY:
            return api_error(status.HTTP_409_CONFLICT, 'Review task is not ready for decisions.')
        _, error = get_sdoc_review_target(request, task.repo_id, task.path)
        if error:
            return error
        card = task.current_card_revision
        if not card:
            return api_error(status.HTTP_409_CONFLICT, 'No review card to reject.')

        selected_item_ids = request.data.get('selected_item_ids')
        if isinstance(selected_item_ids, list) and selected_item_ids:
            if _has_duplicate_item_ids(selected_item_ids):
                return api_error(status.HTTP_400_BAD_REQUEST, 'selected_item_ids must be unique.')
            requested_item_ids = [str(item_id) for item_id in selected_item_ids]
        else:
            requested_item_ids = None

        try:
            with transaction.atomic():
                locked_task = ReviewTask.objects.select_for_update().filter(
                    id=task.id,
                    generation_status=ReviewTask.GENERATION_REVIEW_READY,
                    current_card_revision=card,
                ).first()
                if not locked_task:
                    return api_error(status.HTTP_409_CONFLICT, 'Review task is not ready for decisions.')
                memberships_query = ReviewCardRevisionItem.objects.select_for_update().filter(
                    card_revision=card).select_related('change_item').order_by('card_revision_item_id')
                if requested_item_ids is not None:
                    memberships_query = memberships_query.filter(
                        change_item__item_id__in=requested_item_ids)
                memberships = list(memberships_query)
                if not memberships:
                    return api_error(status.HTTP_409_CONFLICT, 'No items to reject.')
                membership_by_item = {str(m.change_item.item_id): m for m in memberships}
                if requested_item_ids is not None:
                    if len(membership_by_item) != len(requested_item_ids):
                        return api_error(status.HTTP_409_CONFLICT, 'Selected item is not available.')
                    selected = [membership_by_item[item_id] for item_id in requested_item_ids]
                else:
                    selected = memberships
                decided_item_ids = set(
                    str(item_id) for item_id in ReviewDecisionSelection.objects.select_for_update().filter(
                        card_revision_item__in=selected).values_list(
                            'card_revision_item__change_item__item_id', flat=True))
                if requested_item_ids is not None and decided_item_ids:
                    return api_error(status.HTTP_409_CONFLICT, 'Selected item is already decided.')
                selected = [membership for membership in selected
                            if str(membership.change_item.item_id) not in decided_item_ids]
                if not selected:
                    return api_error(status.HTTP_409_CONFLICT, 'No pending items to reject.')

                sorted_ids = sorted(str(m.change_item.item_id) for m in selected)
                selection_digest = compute_selection_digest(
                    str(task.id), card.card_revision, card.changeset_revision.changeset_revision,
                    'rejected', sorted_ids)
                decision = ReviewDecision.objects.create(
                    review_decision_id=uuid.uuid4(),
                    card_revision=card,
                    decision_kind=ReviewDecision.KIND_REJECTED,
                    selection_digest=selection_digest,
                    operator=request.user.username,
                )
                for membership in selected:
                    ReviewDecisionSelection.objects.create(decision=decision, card_revision_item=membership)
        except IntegrityError:
            return api_error(status.HTTP_409_CONFLICT, 'Selected item is already decided.')

        return Response({'task': task.to_dict(), 'card': _build_card_dict(task)})


class ReviewSaveResultView(APIView):
    authentication_classes = ()
    permission_classes = ()

    def post(self, request):
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
