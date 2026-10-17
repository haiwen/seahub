from .compiler import MULTI_COLUMN_WIDTH, TABLE_COLUMN_WIDTH, TABLE_ROW_HEIGHT


VOID_TYPES = {'divider', 'formula', 'embed_link'}
STRUCTURAL_TYPES = {'code_line', 'list_item', 'table_row', 'table_cell', 'column'}
CONTENT_TYPES = {
    'title', 'subtitle', 'header1', 'header2', 'header3', 'header4', 'header5',
    'header6', 'paragraph', 'blockquote', 'callout', 'check_list_item',
    'code_block', 'ordered_list', 'unordered_list', 'divider', 'formula',
    'embed_link', 'link', 'table', 'multi_column',
}


def validate_sdoc(content):
    if not isinstance(content, dict) or set(content) != {'version', 'format_version', 'last_modify_user', 'elements'}:
        raise ValueError('generated_sdoc_invalid')
    if content['format_version'] != 4 or not isinstance(content['elements'], list) or not content['elements']:
        raise ValueError('generated_sdoc_invalid')
    ids = set()

    def visit(node, parent_type=None):
        if not isinstance(node, dict):
            raise ValueError('generated_sdoc_invalid')
        node_id = node.get('id')
        if not isinstance(node_id, str) or not node_id or node_id in ids:
            raise ValueError('generated_sdoc_invalid')
        ids.add(node_id)
        if 'text' in node:
            if not isinstance(node['text'], str) or 'type' in node or 'children' in node:
                raise ValueError('generated_sdoc_invalid')
            return
        element_type = node.get('type')
        children = node.get('children')
        if not isinstance(element_type, str) or not isinstance(children, list):
            raise ValueError('generated_sdoc_invalid')
        if element_type not in CONTENT_TYPES | STRUCTURAL_TYPES:
            raise ValueError('generated_sdoc_invalid')
        if element_type in STRUCTURAL_TYPES:
            allowed_parents = {
                'code_line': 'code_block',
                'list_item': ('ordered_list', 'unordered_list'),
                'table_row': 'table',
                'table_cell': 'table_row',
                'column': 'multi_column',
            }
            allowed_parent = allowed_parents[element_type]
            if isinstance(allowed_parent, tuple):
                if parent_type not in allowed_parent:
                    raise ValueError('generated_sdoc_invalid')
            elif parent_type != allowed_parent:
                raise ValueError('generated_sdoc_invalid')
        if element_type in VOID_TYPES:
            if len(children) != 1 or children[0].get('text') != '':
                raise ValueError('generated_sdoc_invalid')
        if element_type == 'code_block' and (not children or any(child.get('type') != 'code_line' for child in children)):
            raise ValueError('generated_sdoc_invalid')
        if element_type in ('ordered_list', 'unordered_list') and (not children or any(child.get('type') != 'list_item' for child in children)):
            raise ValueError('generated_sdoc_invalid')
        if element_type == 'list_item' and (len(children) != 1 or children[0].get('type') != 'paragraph'):
            raise ValueError('generated_sdoc_invalid')
        if element_type == 'blockquote' and (len(children) != 1 or children[0].get('type') != 'paragraph'):
            raise ValueError('generated_sdoc_invalid')
        if element_type == 'callout' and (not children or any(child.get('type') != 'paragraph' for child in children)):
            raise ValueError('generated_sdoc_invalid')
        if element_type == 'table_row' and (not children or any(child.get('type') != 'table_cell' for child in children)):
            raise ValueError('generated_sdoc_invalid')
        if element_type == 'multi_column' and (not children or any(child.get('type') != 'column' for child in children)):
            raise ValueError('generated_sdoc_invalid')
        if element_type == 'table':
            column_count = len(node.get('columns', []))
            if not column_count or any(column != {'width': TABLE_COLUMN_WIDTH} for column in node['columns']):
                raise ValueError('generated_sdoc_invalid')
            if any(len(row.get('children', [])) != column_count for row in children):
                raise ValueError('generated_sdoc_invalid')
            if node.get('style', {}).get('gridAutoRows') != 'minmax(%spx, auto)' % TABLE_ROW_HEIGHT:
                raise ValueError('generated_sdoc_invalid')
        if element_type == 'multi_column':
            metadata = node.get('column')
            if not isinstance(metadata, list) or len(metadata) != len(children):
                raise ValueError('generated_sdoc_invalid')
            for index, child in enumerate(children):
                expected = {'key': child.get('id'), 'width': MULTI_COLUMN_WIDTH, 'left': index * MULTI_COLUMN_WIDTH}
                if metadata[index] != expected or child.get('width') != MULTI_COLUMN_WIDTH:
                    raise ValueError('generated_sdoc_invalid')
        for child in children:
            visit(child, element_type)

    for element in content['elements']:
        visit(element)
    if content['elements'][0].get('type') != 'title' or content['elements'][-1].get('type') != 'paragraph':
        raise ValueError('generated_sdoc_invalid')
    return content
