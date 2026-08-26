"""Canonicalization and digest helpers for the SDoc AI review protocol.

This module implements the deterministic hashing contract shared by Seahub,
Seafile AI and SDoc Server (the JavaScript mirror must produce identical
bytes). See the design document sections 6.4 and 8.2.

Rules:
  * JSON Canonicalization Scheme (RFC 8785) for serialization.
  * Unicode NFC normalization applied to natural-language text fields only.
  * Lone surrogates and invalid Unicode are rejected.
  * ASCII identifiers / enums / schema names are validated against a fixed
    grammar and kept byte-for-byte (never NFC'd, never case-folded).
  * All digests are SHA-256 encoded as 64 lowercase hex characters.
"""

import hashlib
import json
import re
import unicodedata

SHA256 = 'SHA-256'

UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
NODE_ID_RE = re.compile(r'^[A-Za-z0-9_-]{1,128}$')
SCHEMA_VERSION_RE = re.compile(r'^[a-z][a-z0-9-]{0,63}/v[1-9][0-9]*$')
APPROVED_BY_RE = re.compile(r'^[A-Za-z0-9._+@:-]{1,255}$')

VALID_BLOCK_TYPES = {
    'title', 'subtitle', 'paragraph',
    'header1', 'header2', 'header3', 'header4', 'header5', 'header6',
    'ordered_list', 'unordered_list', 'list_item',
    'table', 'table_row', 'table_cell',
}
VALID_ANCESTOR_TYPES = {
    'document', 'header1', 'header2', 'header3', 'header4', 'header5', 'header6',
    'ordered_list', 'unordered_list', 'list_item',
    'table', 'table_row', 'table_cell',
}
VALID_KINDS = {
    'replace_block_text', 'set_block_type', 'set_list_type',
    'replace_table_cell_text',
}
VALID_DECISION_KINDS = {'approved', 'rejected'}

CANONICAL_HASH_SCHEMA = 'sdoc-canonical/v1'
SELECTION_SCHEMA = 'sdoc-selection/v1'
APPLY_PAYLOAD_SCHEMA = 'sdoc-apply-payload/v1'
PROJECTION_VERSION = 'sdoc-agent-context/v1'


class CanonicalizationError(ValueError):
    pass


def canonical_json_dumps(value):
    """Serialize ``value`` using RFC 8785 JCS.

    Object keys are sorted, no whitespace is emitted and non-ASCII characters
    are emitted verbatim (UTF-8), matching the RFC. ``value`` must not contain
    floats (they would violate JCS number rules); our schemas only carry ints
    and strings.
    """
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(',', ':'),
    )


def normalize_text(text):
    """NFC-normalize a natural-language field, rejecting invalid Unicode."""
    if not isinstance(text, str):
        raise CanonicalizationError('Expected a string, got %s' % type(text).__name__)
    try:
        text.encode('utf-8')
    except UnicodeEncodeError:
        raise CanonicalizationError('Invalid Unicode (lone surrogate) in text.')
    return unicodedata.normalize('NFC', text)


def validate_uuid(value, field):
    if not isinstance(value, str) or not UUID_RE.match(value):
        raise CanonicalizationError('Invalid %s: %r' % (field, value))
    return value


def validate_node_id(value, field):
    if not isinstance(value, str) or not NODE_ID_RE.match(value):
        raise CanonicalizationError('Invalid %s: %r' % (field, value))
    return value


def validate_schema_version(value, field='schema_version'):
    if not isinstance(value, str) or not SCHEMA_VERSION_RE.match(value):
        raise CanonicalizationError('Invalid %s: %r' % (field, value))
    return value


def sha256_lowercase_hex(data_bytes):
    return hashlib.sha256(data_bytes).hexdigest()


def digest_json(value):
    """JCS-serialize and hash a fully normalized canonical object."""
    return sha256_lowercase_hex(canonical_json_dumps(value).encode('utf-8'))


def validate_ancestor_path(ancestor_path):
    if not isinstance(ancestor_path, list) or not 1 <= len(ancestor_path) <= 16:
        raise CanonicalizationError('Invalid ancestor_path.')
    result = []
    for entry in ancestor_path:
        if not isinstance(entry, dict):
            raise CanonicalizationError('Invalid ancestor_path entry.')
        if set(entry.keys()) != {'type', 'id'}:
            raise CanonicalizationError('ancestor_path entry must contain only type and id.')
        node_type = entry['type']
        if node_type not in VALID_ANCESTOR_TYPES:
            raise CanonicalizationError('Invalid ancestor_path type: %r' % (node_type,))
        node_id = entry['id']
        if node_id is not None:
            node_id = validate_node_id(node_id, 'ancestor_path.id')
        result.append({'type': node_type, 'id': node_id})
    return result


def canonical_before_hash(block_id, text_node_id, block_type, ancestor_path,
                          before_leaf_text, file_uuid, document_incarnation,
                          projection_version=PROJECTION_VERSION,
                          hash_schema_version=CANONICAL_HASH_SCHEMA,
                          kind='replace_block_text'):
    """Compute the ``sdoc-canonical/v1`` hash for a single-leaf replace_block_text."""
    if kind not in VALID_KINDS:
        raise CanonicalizationError('Invalid kind: %r' % (kind,))
    if block_type not in VALID_BLOCK_TYPES:
        raise CanonicalizationError('Invalid block_type: %r' % (block_type,))
    obj = {
        'hash_schema_version': validate_schema_version(hash_schema_version, 'hash_schema_version'),
        'kind': kind,
        'file_uuid': validate_uuid(file_uuid, 'file_uuid'),
        'document_incarnation': validate_uuid(document_incarnation, 'document_incarnation'),
        'block_id': validate_node_id(block_id, 'block_id'),
        'text_node_id': validate_node_id(text_node_id, 'text_node_id'),
        'block_type': block_type,
        'ancestor_path': validate_ancestor_path(ancestor_path),
        'before_leaf_text': normalize_text(before_leaf_text),
        'projection_version': validate_schema_version(projection_version, 'projection_version'),
    }
    return digest_json(obj)


def set_block_type_hash(block_id, block_type, ancestor_path, before_leaf_text,
                        file_uuid, document_incarnation,
                        projection_version=PROJECTION_VERSION,
                        hash_schema_version=CANONICAL_HASH_SCHEMA):
    """Compute the ``sdoc-canonical/v1`` hash for a ``set_block_type`` action.

    This targets a first-level block (paragraph/header) and has no
    ``text_node_id``: the block's own type and text are the precondition.
    """
    if block_type not in VALID_BLOCK_TYPES:
        raise CanonicalizationError('Invalid block_type: %r' % (block_type,))
    obj = {
        'hash_schema_version': validate_schema_version(hash_schema_version, 'hash_schema_version'),
        'kind': 'set_block_type',
        'file_uuid': validate_uuid(file_uuid, 'file_uuid'),
        'document_incarnation': validate_uuid(document_incarnation, 'document_incarnation'),
        'block_id': validate_node_id(block_id, 'block_id'),
        'block_type': block_type,
        'ancestor_path': validate_ancestor_path(ancestor_path),
        'before_leaf_text': normalize_text(before_leaf_text),
        'projection_version': validate_schema_version(projection_version, 'projection_version'),
    }
    return digest_json(obj)


def set_list_type_hash(block_id, block_type, ancestor_path, file_uuid,
                       document_incarnation, projection_version=PROJECTION_VERSION,
                       hash_schema_version=CANONICAL_HASH_SCHEMA):
    """Compute the ``sdoc-canonical/v1`` hash for a ``set_list_type`` action.

    This targets a list node (ordered_list/unordered_list). The list's children
    are unchanged, so only the node identity, current type and structural context
    are the precondition.
    """
    if block_type not in ('ordered_list', 'unordered_list'):
        raise CanonicalizationError('Invalid list block_type: %r' % (block_type,))
    obj = {
        'hash_schema_version': validate_schema_version(hash_schema_version, 'hash_schema_version'),
        'kind': 'set_list_type',
        'file_uuid': validate_uuid(file_uuid, 'file_uuid'),
        'document_incarnation': validate_uuid(document_incarnation, 'document_incarnation'),
        'block_id': validate_node_id(block_id, 'block_id'),
        'block_type': block_type,
        'ancestor_path': validate_ancestor_path(ancestor_path),
        'projection_version': validate_schema_version(projection_version, 'projection_version'),
    }
    return digest_json(obj)


def selection_digest(task_id, card_revision, changeset_revision, decision_kind,
                     selected_change_item_ids):
    """Compute the ``sdoc-selection/v1`` digest.

    ``selected_change_item_ids`` are wire-level ``ReviewChangeItem.item_id``
    values, sorted in ascending ASCII order. This schema carries no
    natural-language fields, so no NFC is applied.
    """
    if decision_kind not in VALID_DECISION_KINDS:
        raise CanonicalizationError('Invalid decision_kind: %r' % (decision_kind,))
    if not isinstance(card_revision, int) or not 0 <= card_revision <= 2**53 - 1:
        raise CanonicalizationError('Invalid card_revision.')
    if not isinstance(changeset_revision, int) or not 0 <= changeset_revision <= 2**53 - 1:
        raise CanonicalizationError('Invalid changeset_revision.')
    if not isinstance(selected_change_item_ids, list):
        raise CanonicalizationError('selected_change_item_ids must be a list.')
    if not selected_change_item_ids:
        raise CanonicalizationError('selected_change_item_ids must not be empty.')

    ids = []
    seen = set()
    for item_id in selected_change_item_ids:
        item_id = validate_uuid(item_id, 'selected_change_item_ids[]')
        if item_id in seen:
            raise CanonicalizationError('Duplicate selected_change_item_id: %r' % (item_id,))
        seen.add(item_id)
        ids.append(item_id)
    ids.sort()

    obj = {
        'schema_version': SELECTION_SCHEMA,
        'task_id': validate_uuid(task_id, 'task_id'),
        'card_revision': card_revision,
        'changeset_revision': changeset_revision,
        'decision_kind': decision_kind,
        'selected_change_item_ids': ids,
    }
    return digest_json(obj)


def _canonical_selected_item(item):
    """Normalize one Apply payload selected item (write semantics only)."""
    if not isinstance(item, dict):
        raise CanonicalizationError('Invalid selected item.')
    kind = item.get('kind')
    if kind not in VALID_KINDS:
        raise CanonicalizationError('Invalid item kind: %r' % (kind,))

    if kind in ('set_block_type', 'set_list_type'):
        if set(item.keys()) != {'item_id', 'kind', 'target', 'precondition', 'after_type'}:
            raise CanonicalizationError('selected item has unknown or missing fields.')
        target = item['target']
        if not isinstance(target, dict) or set(target.keys()) != {'block_id', 'block_type', 'ancestor_path'}:
            raise CanonicalizationError('Invalid %s target.' % kind)
        block_type = target['block_type']
        if block_type not in VALID_BLOCK_TYPES:
            raise CanonicalizationError('Invalid target block_type: %r' % (block_type,))
        after_type = item['after_type']
        if after_type not in VALID_BLOCK_TYPES:
            raise CanonicalizationError('Invalid after_type: %r' % (after_type,))
        precondition = item['precondition']
        if not isinstance(precondition, dict) or set(precondition.keys()) != {
                'canonical_before_hash', 'hash_algorithm', 'hash_schema_version', 'projection_version'}:
            raise CanonicalizationError('Invalid %s precondition.' % kind)
        return {
            'item_id': validate_uuid(item['item_id'], 'item_id'),
            'kind': kind,
            'target': {
                'block_id': validate_node_id(target['block_id'], 'block_id'),
                'block_type': block_type,
                'ancestor_path': validate_ancestor_path(target['ancestor_path']),
            },
            'precondition': {
                'canonical_before_hash': precondition['canonical_before_hash'],
                'hash_algorithm': precondition['hash_algorithm'],
                'hash_schema_version': validate_schema_version(precondition['hash_schema_version'], 'hash_schema_version'),
                'projection_version': validate_schema_version(precondition['projection_version'], 'projection_version'),
            },
            'after_type': after_type,
        }

    if set(item.keys()) != {'item_id', 'kind', 'target', 'precondition', 'after_text'}:
        raise CanonicalizationError('selected item has unknown or missing fields.')
    target = item['target']
    if not isinstance(target, dict) or set(target.keys()) != {'block_id', 'text_node_id', 'block_type', 'ancestor_path'}:
        raise CanonicalizationError('Invalid item target.')
    block_type = target['block_type']
    if block_type not in VALID_BLOCK_TYPES:
        raise CanonicalizationError('Invalid target block_type: %r' % (block_type,))

    precondition = item['precondition']
    if not isinstance(precondition, dict) or set(precondition.keys()) != {
            'before_leaf_text', 'canonical_before_hash', 'hash_algorithm',
            'hash_schema_version', 'projection_version'}:
        raise CanonicalizationError('Invalid item precondition.')

    return {
        'item_id': validate_uuid(item['item_id'], 'item_id'),
        'kind': kind,
        'target': {
            'block_id': validate_node_id(target['block_id'], 'block_id'),
            'text_node_id': validate_node_id(target['text_node_id'], 'text_node_id'),
            'block_type': block_type,
            'ancestor_path': validate_ancestor_path(target['ancestor_path']),
        },
        'precondition': {
            'before_leaf_text': normalize_text(precondition['before_leaf_text']),
            'canonical_before_hash': precondition['canonical_before_hash'],
            'hash_algorithm': precondition['hash_algorithm'],
            'hash_schema_version': validate_schema_version(precondition['hash_schema_version'], 'hash_schema_version'),
            'projection_version': validate_schema_version(precondition['projection_version'], 'projection_version'),
        },
        'after_text': normalize_text(item['after_text']),
    }


def apply_payload_digest(task_id, review_decision_id, card_revision,
                         changeset_revision_id, changeset_revision,
                         selection_digest_value, selected_items):
    """Compute the ``sdoc-apply-payload/v1`` digest over the full write payload."""
    if not isinstance(card_revision, int) or not 0 <= card_revision <= 2**53 - 1:
        raise CanonicalizationError('Invalid card_revision.')
    if not isinstance(changeset_revision, int) or not 0 <= changeset_revision <= 2**53 - 1:
        raise CanonicalizationError('Invalid changeset_revision.')
    if not isinstance(selected_items, list) or not selected_items:
        raise CanonicalizationError('selected_items must be a non-empty list.')

    items = [_canonical_selected_item(item) for item in selected_items]
    items.sort(key=lambda item: item['item_id'])

    obj = {
        'schema_version': APPLY_PAYLOAD_SCHEMA,
        'task_id': validate_uuid(task_id, 'task_id'),
        'review_decision_id': validate_uuid(review_decision_id, 'review_decision_id'),
        'card_revision': card_revision,
        'changeset_revision_id': validate_uuid(changeset_revision_id, 'changeset_revision_id'),
        'changeset_revision': changeset_revision,
        'selection_digest': selection_digest_value,
        'selected_items': items,
    }
    return digest_json(obj)
