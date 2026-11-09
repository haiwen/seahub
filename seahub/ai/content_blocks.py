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


TOKEN_RE = re.compile(
    r'(?P<code>(?P<fence>`{3,}|~{3,})[\s\S]*?(?:(?P=fence)|$)|'
    r'`+[^`\n]*`+)|<(?P<closing>/)?(?P<tag>[A-Za-z][\w:-]*)(?=[\s/>]|$)'
)


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
        if token.group('code'):
            end = token.end()
            block = {'type': 'code', 'raw': token.group(0)}
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
