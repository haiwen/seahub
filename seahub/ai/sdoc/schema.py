import json
import re
from urllib.parse import urlparse


SCHEMA_VERSION = 1
MAX_ELEMENTS = 200
MAX_TEXT_LENGTH = 100000
MAX_TABLE_ROWS = 100
MAX_TABLE_COLUMNS = 20
MAX_DEPTH = 8
DEFERRED_TYPES = {'image', 'image_block', 'video', 'file_link', 'sdoc_link', 'whiteboard'}
TEXT_MARK_TYPES = {
    'bold': bool,
    'italic': bool,
    'underline': bool,
    'strikethrough': bool,
    'superscript': bool,
    'subscript': bool,
    'code': bool,
    'color': str,
    'highlight_color': str,
    'font': str,
    'font_size': (int, float),
}
COLOR_RE = re.compile(r'^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$')
REFERENCE_RE = re.compile(r'<reference_\d+>')
MULTI_COLUMN_TYPES = {
    'paragraph', 'header1', 'header2', 'header3', 'header4', 'header5', 'header6',
    'subtitle', 'blockquote', 'check_list_item', 'code_block', 'ordered_list',
    'unordered_list', 'divider', 'formula',
}


class SdocArtifactError(ValueError):
    def __init__(self, code='invalid_artifact'):
        super().__init__(code)
        self.code = code


class _ValidationState:
    def __init__(self):
        self.node_count = 0
        self.text_length = 0

    def add_node(self):
        self.node_count += 1
        if self.node_count > MAX_ELEMENTS:
            raise SdocArtifactError('content_too_large')

    def add_text(self, text):
        self.text_length += len(text)
        if self.text_length > MAX_TEXT_LENGTH:
            raise SdocArtifactError('content_too_large')


def _exact_keys(value, required, optional=()):
    if not isinstance(value, dict):
        raise SdocArtifactError()
    keys = set(value)
    required = set(required)
    if not required.issubset(keys) or not keys.issubset(required | set(optional)):
        raise SdocArtifactError()


def _string(value, allow_empty=False):
    if not isinstance(value, str) or (not allow_empty and not value.strip()):
        raise SdocArtifactError()
    return value


def _url(value, https_only=False):
    value = _string(value)
    parsed = urlparse(value)
    schemes = ('https',) if https_only else ('http', 'https')
    if parsed.scheme.lower() not in schemes or not parsed.netloc:
        raise SdocArtifactError()
    return value


def _normalize_text(value, state):
    allowed_marks = set(TEXT_MARK_TYPES)
    _exact_keys(value, {'type', 'text'}, allowed_marks)
    if value.get('type') != 'text':
        raise SdocArtifactError()
    text = _string(value.get('text'), allow_empty=True)
    if REFERENCE_RE.search(text):
        raise SdocArtifactError()
    normalized = {'type': 'text', 'text': text}
    for mark, expected_type in TEXT_MARK_TYPES.items():
        if mark not in value:
            continue
        mark_value = value[mark]
        if isinstance(mark_value, bool) and expected_type != bool:
            raise SdocArtifactError()
        if not isinstance(mark_value, expected_type):
            raise SdocArtifactError()
        if mark in ('color', 'highlight_color') and not COLOR_RE.match(mark_value):
            raise SdocArtifactError()
        normalized[mark] = mark_value
    if normalized.get('superscript') and normalized.get('subscript'):
        raise SdocArtifactError()
    state.add_node()
    state.add_text(text)
    return normalized


def _normalize_link(value, state):
    _exact_keys(value, {'type', 'href', 'title', 'children'})
    if value.get('type') != 'link':
        raise SdocArtifactError()
    href = _url(value.get('href'))
    title = _string(value.get('title'))
    children = _normalize_children(value.get('children'), state, text_only=True)
    state.add_node()
    state.add_text(title)
    return {'type': 'link', 'href': href, 'title': title, 'children': children}


def _normalize_children(value, state, text_only=False):
    if not isinstance(value, list) or not value:
        raise SdocArtifactError()
    children = []
    for child in value:
        if not isinstance(child, dict):
            raise SdocArtifactError()
        if child.get('type') == 'text':
            children.append(_normalize_text(child, state))
        elif not text_only and child.get('type') == 'link':
            children.append(_normalize_link(child, state))
        else:
            raise SdocArtifactError('invalid_hierarchy')
    if not ''.join(child.get('text', '') for child in children if child['type'] == 'text').strip() and not any(child['type'] == 'link' for child in children):
        raise SdocArtifactError()
    return children


def _normalize_list(value, state, block_type, depth):
    _exact_keys(value, {'type', 'items'})
    items = value.get('items')
    if not isinstance(items, list) or not items:
        raise SdocArtifactError()
    normalized = []
    for item in items:
        _exact_keys(item, {'children'})
        state.add_node()
        normalized.append({'children': _normalize_children(item['children'], state)})
    state.add_node()
    return {'type': block_type, 'items': normalized}


def _normalize_table(value, state):
    _exact_keys(value, {'type', 'rows'})
    rows = value.get('rows')
    if not isinstance(rows, list) or not rows or len(rows) > MAX_TABLE_ROWS:
        raise SdocArtifactError()
    normalized_rows = []
    column_count = None
    for row in rows:
        _exact_keys(row, {'cells'})
        state.add_node()
        cells = row.get('cells')
        if not isinstance(cells, list) or not cells or len(cells) > MAX_TABLE_COLUMNS:
            raise SdocArtifactError()
        if column_count is None:
            column_count = len(cells)
        elif len(cells) != column_count:
            raise SdocArtifactError()
        normalized_cells = []
        for cell in cells:
            _exact_keys(cell, {'children'})
            state.add_node()
            normalized_cells.append({'children': _normalize_children(cell['children'], state)})
        normalized_rows.append({'cells': normalized_cells})
    state.add_node()
    return {'type': 'table', 'rows': normalized_rows}


def _normalize_element(value, state, depth=1):
    if depth > MAX_DEPTH or not isinstance(value, dict):
        raise SdocArtifactError('invalid_hierarchy')
    block_type = value.get('type')
    if block_type in DEFERRED_TYPES:
        raise SdocArtifactError('unsupported_element_type')
    if block_type in ('paragraph', 'blockquote', 'check_list_item'):
        required = {'type', 'children'} | ({'checked'} if block_type == 'check_list_item' else set())
        _exact_keys(value, required)
        if block_type == 'check_list_item' and not isinstance(value.get('checked'), bool):
            raise SdocArtifactError()
        result = {'type': block_type, 'children': _normalize_children(value['children'], state)}
        if block_type == 'check_list_item':
            result['checked'] = value['checked']
    elif block_type in ('header1', 'header2', 'header3', 'header4', 'header5', 'header6', 'subtitle'):
        _exact_keys(value, {'type', 'children'})
        result = {'type': block_type, 'children': _normalize_children(value['children'], state, text_only=True)}
    elif block_type == 'callout':
        _exact_keys(value, {'type', 'children'}, {'style'})
        paragraphs = value.get('children')
        if not isinstance(paragraphs, list) or not paragraphs:
            raise SdocArtifactError()
        result = {'type': block_type, 'children': []}
        for paragraph in paragraphs:
            if paragraph.get('type') != 'paragraph':
                raise SdocArtifactError('invalid_hierarchy')
            result['children'].append(_normalize_element(paragraph, state, depth + 1))
        if 'style' in value:
            _exact_keys(value['style'], {'background_color'})
            color = _string(value['style']['background_color'])
            if not COLOR_RE.match(color):
                raise SdocArtifactError()
            result['style'] = {'background_color': color}
    elif block_type == 'code_block':
        _exact_keys(value, {'type', 'language', 'text'})
        language = _string(value.get('language'), allow_empty=True)
        text = _string(value.get('text'), allow_empty=True)
        if REFERENCE_RE.search(text):
            raise SdocArtifactError()
        state.add_text(text)
        result = {'type': block_type, 'language': language, 'text': text}
    elif block_type in ('ordered_list', 'unordered_list'):
        return _normalize_list(value, state, block_type, depth)
    elif block_type == 'divider':
        _exact_keys(value, {'type'})
        result = {'type': block_type}
    elif block_type == 'formula':
        _exact_keys(value, {'type', 'data'})
        _exact_keys(value['data'], {'formula'})
        formula = _string(value['data']['formula'])
        state.add_text(formula)
        result = {'type': block_type, 'data': {'formula': formula}}
    elif block_type == 'embed_link':
        _exact_keys(value, {'type', 'link', 'link_type'}, {'data'})
        link_type = value.get('link_type')
        if link_type not in ('seatable', 'figma'):
            raise SdocArtifactError()
        result = {'type': block_type, 'link': _url(value.get('link'), https_only=True), 'link_type': link_type}
        if 'data' in value:
            _exact_keys(value['data'], {'height'})
            height = value['data']['height']
            if isinstance(height, bool) or not isinstance(height, int) or not 200 <= height <= 1200:
                raise SdocArtifactError()
            result['data'] = {'height': height}
    elif block_type == 'table':
        return _normalize_table(value, state)
    elif block_type == 'multi_column':
        _exact_keys(value, {'type', 'columns'})
        columns = value.get('columns')
        if not isinstance(columns, list) or not 2 <= len(columns) <= 4:
            raise SdocArtifactError()
        result = {'type': block_type, 'columns': []}
        for column in columns:
            _exact_keys(column, {'children'})
            state.add_node()
            children = column.get('children')
            if not isinstance(children, list) or not children:
                raise SdocArtifactError()
            normalized_children = []
            for child in children:
                if not isinstance(child, dict) or child.get('type') not in MULTI_COLUMN_TYPES:
                    raise SdocArtifactError('invalid_hierarchy')
                normalized_children.append(_normalize_element(child, state, depth + 1))
            result['columns'].append({'children': normalized_children})
    else:
        raise SdocArtifactError('unsupported_element_type')
    state.add_node()
    return result


def normalize_sdoc_request(value):
    _exact_keys(value, {'type', 'schema_version', 'file_name', 'title', 'elements'}, {'requested_directory', 'summary'})
    if value.get('type') != 'sdoc_create_request':
        raise SdocArtifactError()
    if value.get('schema_version') != SCHEMA_VERSION:
        raise SdocArtifactError('unsupported_schema_version')
    file_name = _string(value.get('file_name')).strip()
    requested_directory = value.get('requested_directory')
    if requested_directory is not None:
        requested_directory = _string(requested_directory).strip()
    summary = value.get('summary')
    if summary is not None:
        summary = _string(summary).strip()
    title = value.get('title')
    _exact_keys(title, {'children'})
    state = _ValidationState()
    title_children = _normalize_children(title['children'], state, text_only=True)
    elements = value.get('elements')
    if not isinstance(elements, list) or not elements:
        raise SdocArtifactError()
    normalized_elements = [_normalize_element(element, state) for element in elements]
    normalized = {
        'type': 'sdoc_create_request',
        'schema_version': SCHEMA_VERSION,
        'file_name': file_name,
        'requested_directory': requested_directory,
        'title': {'children': title_children},
        'elements': normalized_elements,
    }
    if summary is not None:
        normalized['summary'] = summary
    if len(json.dumps(normalized, ensure_ascii=False)) > MAX_TEXT_LENGTH * 4:
        raise SdocArtifactError('content_too_large')
    return normalized
