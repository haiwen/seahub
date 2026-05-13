import uuid
import xml.etree.ElementTree as ET

from bs4 import BeautifulSoup
from markdown_it import MarkdownIt
from markdown_it.tree import SyntaxTreeNode
from mdit_py_plugins.tasklists import tasklists_plugin
from mdit_py_plugins.dollarmath import dollarmath_plugin


def get_random_id():
    return uuid.uuid4().hex[:22]


def parse_tokens(token_stream, **kwargs):
    empty_elem = {'id': get_random_id(), 'text': ''}

    sdoc_children = []
    for token in token_stream:
        if token.type == 'text':
            text = token.content
            sdoc_children.append({'id': get_random_id(), 'text': text, **kwargs})
        elif token.type == 'code_inline':
            text = token.content
            sdoc_children.append({'id': get_random_id(), 'text': text, 'code': True, **kwargs})
        elif token.type == 'em':
            sdoc_children.extend(parse_tokens(token.children, italic=True, **kwargs))
        elif token.type == 'strong':
            sdoc_children.extend(parse_tokens(token.children, bold=True, **kwargs))
        elif token.type == 'link':
            link_struct = {
                'id': get_random_id(),
                'type': 'link',
                'href': token.attrs.get('href'),
                'title': token.attrs.get('title'),
                'children': parse_tokens(token.children, **kwargs)
            }
            sdoc_children.extend([empty_elem, link_struct, empty_elem])
        elif token.type == 'image':
            img_struct = {
                'id': get_random_id(),
                'type': 'image',
                'children': [{'id': get_random_id(), 'text': ''}],
                'data': {'src': token.attrs.get('src')}
            }
            sdoc_children.extend([empty_elem, img_struct, empty_elem])
        elif token.type in {'html_block', 'html_inline'}:
            sdoc_children.extend(parse_html_inline_block(token.content))
        else:
            sdoc_children.append({'id': get_random_id(), 'text': token.content, **kwargs})
    return sdoc_children


def parse_header(node):
    level_number = node.tag[1]
    inline_elem = node.children[0]
    sdoc_children = parse_tokens(inline_elem.children)
    return {
        'type': f'header{level_number}',
        'children': sdoc_children,
        'id': get_random_id()
    }


def parse_paragraph(node):
    inline_elem = node.children[0]
    sdoc_children = parse_tokens(inline_elem.children)
    return {
        'type': 'paragraph',
        'children': sdoc_children,
        'id': get_random_id()
    }


def parse_math(node):
    sdoc_children = [{'id': get_random_id(), 'text': node.content}]
    return {'type': 'paragraph', 'children': sdoc_children, 'id': get_random_id()}


def parse_list(node, list_type):
    item_list = node.children
    children_list = []
    for item in item_list:
        parsed_item = {
            'id': get_random_id(),
            'type': 'list_item',
            'children': []
        }
        for child in item.children:
            if child.type == 'paragraph':
                inline_elem = child.children[0]
                parsed_item['children'].append({
                    'id': get_random_id(),
                    'type': 'paragraph',
                    'children': parse_tokens(inline_elem.children)
                })
            elif child.type in {'bullet_list', 'ordered_list'}:
                list_type_map = {'bullet_list': 'unordered_list'}.get(child.type, child.type)
                parsed_item['children'].append(parse_list(child, list_type_map))
        children_list.append(parsed_item)
    return {'type': list_type, 'id': get_random_id(), 'children': children_list}


def parse_check_list(node):
    children_list = []
    checked_status = False
    para_node = node.children[0].children[0]
    inline_node_list = para_node.children[0].children
    for inline in inline_node_list:
        # Get is checked
        if inline.type == 'html_inline':
            html = inline.content
            soup = BeautifulSoup(html, 'html.parser')
            input_tag = soup.find('input')
            if input_tag and input_tag.get('checked'):
                checked_status = True
        else:
            children_list.extend(parse_tokens([inline]))
    return {
        'type': 'check_list_item',
        'id': get_random_id(),
        'children': children_list,
        'checked': checked_status,
    }


def parse_html_inline_block(html):
    empty_elem = {'id': get_random_id(), 'text': ''}
    element = ET.fromstring(html)

    imgsrc = element.get('src')
    width = element.get('width')
    if imgsrc and width:
        img_struct = {
            'id': get_random_id(),
            'type': 'image',
            'children': [{'id': get_random_id(), 'text': ''}],
            'data': {'src': imgsrc, 'width': float(width)}
        }
        return [empty_elem, img_struct, empty_elem]
    else:
        return [empty_elem]


def parse_table(node):
    children_list = []
    thead, tbody = node.children

    column_count = len(thead.children[0].children)
    column_width = int(672 / column_count)

    table_sdoc = {
        'type': 'table',
        'id': get_random_id(),
        'children': children_list,
        'columns': [{'width': column_width}] * column_count
    }

    table_rows = thead.children + tbody.children

    for row in table_rows:
        row_children = row.children
        table_row_body = {
            'type': 'table_row',
            'id': get_random_id(),
            'children': [],
            'style': {'min_height': 43}
        }

        for cell in row_children:
            cell_content = parse_tokens(cell.children[0].children)
            table_cell = {
                'id': get_random_id(),
                'type': 'table_cell',
                'children': cell_content
            }
            table_row_body['children'].append(table_cell)

        children_list.append(table_row_body)

    return table_sdoc


def parse_codeblock(node):
    code_lines = node.content.strip().split('\n')
    children_list = []
    for line in code_lines:
        children_list.append({
            'id': get_random_id(),
            'type': 'code_line',
            'children': [{'id': get_random_id(), 'text': line}]
        })
    return {
        'id': get_random_id(),
        'type': 'code_block',
        'style': {'white_space': 'nowrap'},
        'language': node.info,
        'children': children_list,
    }


def md2sdoc(md_txt, username=''):
    md = MarkdownIt("gfm-like").use(tasklists_plugin).use(dollarmath_plugin)
    tokens = md.parse(md_txt)
    root = SyntaxTreeNode(tokens).children

    def _parse_node(root):
        children_list = []
        for node in root:
            if node.type == 'heading':
                children_list.append(parse_header(node))
            elif node.type == 'paragraph':
                children_list.append(parse_paragraph(node))
            elif node.type == 'math_block':
                children_list.append(parse_math(node))
            elif node.type == 'bullet_list':
                if node.attrs.get('class') == 'contains-task-list':
                    children_list.append(parse_check_list(node))
                else:
                    children_list.append(parse_list(node, 'unordered_list'))
            elif node.type == 'ordered_list':
                children_list.append(parse_list(node, 'ordered_list'))
            elif node.type == 'table':
                children_list.append(parse_table(node))
            elif node.type == 'fence':
                children_list.append(parse_codeblock(node))
            elif node.type == 'blockquote':
                children_list.extend(
                    [
                        {
                            'id': get_random_id(),
                            'type': 'blockquote',
                            'children': _parse_node(node),
                        }
                    ]
                )
            elif node.type == 'html_block':
                children_list.append(
                    {
                        'type': 'paragraph',
                        'children': parse_html_inline_block(node.content),
                        'id': get_random_id(),
                    }
                )
        return children_list

    children_list = _parse_node(root)
    sdoc_json = {
        'cursors': {},
        'last_modify_user': username,
        'elements': children_list,
        'version': 1,
        'format_version': 4,
    }
    return sdoc_json
