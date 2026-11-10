"""Scan registered AI protocol blocks once, preserving their opaque bodies.

Only registered tags have protocol meaning. Ordinary HTML is text. Code is
protected, incomplete blocks are never dispatched, and generated output is not
fed back into this scanner. The frontend scanner follows the same contract.
"""
import re

CONTENT_BLOCK_TAGS = frozenset({
    'seafile-ai-seadoc', 'seafile-ai-markdown', 'seafile-ai-markdown-link',
    'markdown-readonly-tips', 'seafile-ai-file',
})


# Conservative protocol protection, not a Markdown renderer: include list
# continuation indentation and mixed containers even if a renderer rejects them.
CONTAINER_PREFIX = r'[ \t]*(?:(?:>[ \t]?|(?:[-+*]|\d{1,9}[.)])[ \t]+)[ \t]*)*'
TOKEN_RE = re.compile(
    r'(?P<fence>^' + CONTAINER_PREFIX + r'(?:`{3,}(?!`)[^`\r\n]*|~{3,}[^\r\n]*)(?:\r?\n|$))|'
    r'(?P<indented>^[ \t]*(?:>[ \t]?[ \t]*)*(?=[^\r\n]*\S)[^\r\n]*(?:\r?\n|$))|'
    r'(?P<ticks>`+)|<(?P<closing>/)?(?P<tag>[A-Za-z][\w:-]*)(?=[\s/>]|$)',
    re.MULTILINE,
)

INLINE_TOKEN_RE = re.compile(r'(?P<ticks>`+)|<(?P<closing>/)?(?P<tag>[A-Za-z][\w:-]*)(?=[\s/>]|$)')


def line_layout(line):
    """Expand tabs at four-column stops before removing quote prefixes."""
    line = line.expandtabs(4).rstrip('\r\n')
    depth = 0
    while True:
        quote = re.match(r' {0,3}> ?', line)
        if not quote:
            break
        line = line[quote.end():]
        depth += 1
    indent = len(line) - len(line.lstrip(' '))
    item = re.match(r' {0,3}(?:[-+*]|\d{1,9}[.)])( +)', line)
    return depth, indent, item.end() if item else None, line


def list_base(value, start, depth):
    base = 0
    for line in value[:start].splitlines():
        quote_depth, indent, item, text = line_layout(line)
        if quote_depth != depth:
            base = 0
        elif item is not None:
            base = item
        elif text.strip() and indent < base:
            base = 0
    return base


def code_end(value, token):
    """Line-delimited fences and exact-length backtick spans, not substrings."""
    if token.re is TOKEN_RE and (token.group('fence') or token.group('indented')):
        depth, indent, item, text = line_layout(token.group(0))
        base = item if item is not None else list_base(value, token.start(), depth)
        relative = indent - base if item is None else 0
        if relative >= 4:
            # Protect indented lines (also conservatively in paragraph contexts).
            return token.end()
        if not token.group('fence'):
            return None
        marker = re.match(CONTAINER_PREFIX + r'(`+|~+)', token.group(0)).group(1)
        offset = token.end()
        for line in value[offset:].splitlines(keepends=True):
            quote_depth, closing_indent, closing_item, closing_text = line_layout(line)
            if (quote_depth == depth and closing_item is None and 0 <= closing_indent - base <= 3 and
                    re.fullmatch(re.escape(marker[0]) + '{%d,}[ ]*' % len(marker), closing_text.lstrip(' '))):
                return offset + len(line)
            offset += len(line)
        return len(value)
    for closing in re.finditer(r'`+', value[token.end():]):
        if len(closing.group(0)) == len(token.group('ticks')):
            return token.end() + closing.end()
    return None


def tag_end(value, start):
    quote = None
    for index in range(start, len(value)):
        char = value[index]
        if quote:
            if char == quote:
                quote = None
        elif char in ('"', "'"):
            quote = char
        elif char == '>':
            return index + 1
    return None


def parse_content_blocks(value, tags):
    blocks = []
    position = 0
    text_start = 0
    while position < len(value):
        token = TOKEN_RE.search(value, position)
        if token is None:
            break
        if token.group('fence') or token.group('indented'):
            end = code_end(value, token)
            if end is None:
                inline = INLINE_TOKEN_RE.search(value, token.start(), token.end())
                if inline is None:
                    position = token.end()
                    continue
                token = inline
        else:
            end = None
        if end is not None:
            block = {'type': 'code', 'raw': value[token.start():end]}
        elif token.group('ticks'):
            end = code_end(value, token)
            if end is None:
                position = token.end()
                continue
            block = {'type': 'code', 'raw': value[token.start():end]}
        else:
            tag = token.group('tag')
            end = tag_end(value, token.end())
            partial_tag = end is None and any(name.startswith(tag) for name in tags)
            if (tag not in tags and not partial_tag) or token.group('closing'):
                position = end if end is not None else len(value)
                continue
            attributes = value[token.end():end - 1] if end is not None else ''
            self_closing = end is not None and attributes.rstrip().endswith('/')
            content_start = end
            content_end = end
            complete = end is not None
            if complete and not self_closing:
                # Bodies are opaque (SDoc JSON may itself contain backticks).
                # Only balance this block's own delimiters; never parse children.
                boundary = re.compile(r'<(?P<closing>/)?' + re.escape(tag) + r'(?=[\s/>]|$)')
                depth = 1
                cursor = end
                complete = False
                while cursor < len(value):
                    nested = boundary.search(value, cursor)
                    if nested is None:
                        break
                    cursor = nested.end()
                    nested_end = tag_end(value, cursor)
                    if nested_end is None:
                        break
                    cursor = nested_end
                    if nested.group('closing'):
                        depth -= 1
                    elif not value[nested.end():nested_end - 1].rstrip().endswith('/'):
                        depth += 1
                    if depth == 0:
                        content_end, end, complete = nested.start(), nested_end, True
                        break
            if not complete:
                end = len(value)
            block = {
                'type': 'block', 'tag': tag, 'raw': value[token.start():end],
                'attributes': attributes[:-1] if self_closing else attributes,
                'content': value[content_start:content_end] if complete and not self_closing else '',
                'complete': complete, 'self_closing': self_closing,
            }
        if token.start() > text_start:
            blocks.append({'type': 'text', 'raw': value[text_start:token.start()]})
        blocks.append(block)
        position = text_start = end
    if text_start < len(value):
        blocks.append({'type': 'text', 'raw': value[text_start:]})
    return blocks
