import uuid


TABLE_COLUMN_WIDTH = 336
TABLE_ROW_HEIGHT = 42
MULTI_COLUMN_WIDTH = 300


def _id():
    return str(uuid.uuid4())


def _compile_text(value):
    result = {'id': _id(), 'text': value['text']}
    for key, mark_value in value.items():
        if key not in ('type', 'text'):
            result[key] = mark_value
    return result


def _compile_inline(value):
    if value['type'] == 'text':
        return _compile_text(value)
    return {
        'id': _id(),
        'type': 'link',
        'href': value['href'],
        'title': value['title'],
        'children': [_compile_text(child) for child in value['children']],
    }


def _compile_inline_children(children):
    return [_compile_inline(child) for child in children]


def _paragraph(children=None):
    if children is None:
        children = [{'type': 'text', 'text': ''}]
    return {'id': _id(), 'type': 'paragraph', 'children': _compile_inline_children(children)}


def _compile_list(value):
    return {
        'id': _id(),
        'type': value['type'],
        'children': [
            {
                'id': _id(),
                'type': 'list_item',
                'children': [_paragraph(item['children'])],
            }
            for item in value['items']
        ],
    }


def _compile_table(value):
    column_count = len(value['rows'][0]['cells'])
    rows = []
    for row in value['rows']:
        rows.append({
            'id': _id(),
            'type': 'table_row',
            'style': {'min_height': TABLE_ROW_HEIGHT},
            'children': [
                {
                    'id': _id(),
                    'type': 'table_cell',
                    'style': {
                        'text_align': 'left',
                        'align_items': 'center',
                        'background_color': '',
                    },
                    'inherit_style': {
                        'text_align': 'left',
                        'background_color': '',
                    },
                    'children': _compile_inline_children(cell['children']),
                }
                for cell in row['cells']
            ],
        })
    return {
        'id': _id(),
        'type': 'table',
        'columns': [{'width': TABLE_COLUMN_WIDTH} for _index in range(column_count)],
        'ui': {'alternate_highlight': False},
        'style': {
            'gridTemplateColumns': 'repeat(%s, %spx)' % (column_count, TABLE_COLUMN_WIDTH),
            'gridAutoRows': 'minmax(%spx, auto)' % TABLE_ROW_HEIGHT,
        },
        'children': rows,
    }


def _compile_multi_column(value):
    metadata = []
    children = []
    for index, column in enumerate(value['columns']):
        column_id = _id()
        metadata.append({
            'key': column_id,
            'width': MULTI_COLUMN_WIDTH,
            'left': index * MULTI_COLUMN_WIDTH,
        })
        children.append({
            'id': column_id,
            'type': 'column',
            'width': MULTI_COLUMN_WIDTH,
            'children': [_compile_element(child) for child in column['children']],
        })
    return {
        'id': _id(),
        'type': 'multi_column',
        'column': metadata,
        'style': {'gridTemplateColumns': 'repeat(%s, %spx)' % (len(children), MULTI_COLUMN_WIDTH)},
        'children': children,
    }


def _compile_element(value):
    element_type = value['type']
    if element_type == 'paragraph':
        return _paragraph(value['children'])
    if element_type in ('header1', 'header2', 'header3', 'header4', 'header5', 'header6', 'subtitle'):
        return {'id': _id(), 'type': element_type, 'children': [_compile_text(child) for child in value['children']]}
    if element_type == 'blockquote':
        return {'id': _id(), 'type': element_type, 'children': [_paragraph(value['children'])]}
    if element_type == 'callout':
        return {
            'id': _id(),
            'type': element_type,
            'style': value.get('style', {'background_color': '#fef7e0'}),
            'children': [_compile_element(child) for child in value['children']],
        }
    if element_type == 'check_list_item':
        return {
            'id': _id(),
            'type': element_type,
            'checked': value['checked'],
            'children': _compile_inline_children(value['children']),
        }
    if element_type == 'code_block':
        return {
            'id': _id(),
            'type': element_type,
            'language': value['language'],
            'style': {'white_space': 'nowrap'},
            'children': [
                {'id': _id(), 'type': 'code_line', 'children': [{'id': _id(), 'text': line}]}
                for line in value['text'].split('\n')
            ],
        }
    if element_type in ('ordered_list', 'unordered_list'):
        return _compile_list(value)
    if element_type == 'divider':
        return {'id': _id(), 'type': element_type, 'children': [{'id': _id(), 'text': ''}]}
    if element_type == 'formula':
        return {'id': _id(), 'type': element_type, 'data': value['data'], 'children': [{'id': _id(), 'text': ''}]}
    if element_type == 'embed_link':
        result = {
            'id': _id(),
            'type': element_type,
            'link': value['link'],
            'link_type': value['link_type'],
            'children': [{'id': _id(), 'text': ''}],
        }
        if 'data' in value:
            result['data'] = value['data']
        return result
    if element_type == 'table':
        return _compile_table(value)
    if element_type == 'multi_column':
        return _compile_multi_column(value)
    raise ValueError('unsupported_element_type')


def compile_sdoc(request_data, username):
    elements = [{
        'id': _id(),
        'type': 'title',
        'children': [_compile_text(child) for child in request_data['title']['children']],
    }]
    elements.extend(_compile_element(element) for element in request_data['elements'])
    elements.append(_paragraph())
    return {
        'version': 0,
        'format_version': 4,
        'last_modify_user': username,
        'elements': elements,
    }
