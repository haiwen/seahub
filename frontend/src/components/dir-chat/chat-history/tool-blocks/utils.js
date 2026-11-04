// Tool results are data, not arbitrary HTML. Register each supported tag explicitly.
const TOOL_TAGS = new Set(['seadoc']);
const ATTRIBUTE_NAMES = new Set(['status', 'name', 'path', 'doc_uuid', 'description', 'error_code']);
// Match code before tags so examples in fenced, indented and inline code stay literal.
const TOKEN_RE = /(^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\2[\t ]*$|(?![\s\S])))|(^ {4}[^\n]*(?:\n|$))|(`+)(?:[^`]|(?!\4)`)*?\4|<seadoc(?=\s|\/|>|$)(?:[^>"']|"[^"]*"|'[^']*')*(?:>|"[^"]*$|'[^']*$|$)/gm;

const decodeAttribute = (value) => {
  const element = document.createElement('textarea');
  // Only attribute text is decoded; no HTML is ever inserted into the message DOM.
  element.innerHTML = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return element.value;
};

const parseAttributes = (tag) => {
  const body = tag.replace(/^<\w+/, '').replace(/\/>$/, '');
  const attributes = {};
  const pattern = /\s+([a-z_]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let end = 0;
  let match;
  while ((match = pattern.exec(body))) {
    if (body.slice(end, match.index).trim() || !ATTRIBUTE_NAMES.has(match[1]) || match[1] in attributes) {
      return null;
    }
    attributes[match[1]] = decodeAttribute(match[2] ?? match[3]);
    end = pattern.lastIndex;
  }
  return body.slice(end).trim() ? null : attributes;
};

export const isSafeDocumentPath = (path) => {
  return typeof path === 'string' && path.startsWith('/') && !path.includes('\\') &&
    !Array.from(path).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) &&
    !path.split('/').some((part) => part === '..' || part === '.') && /\.sdoc$/i.test(path);
};

export const transformToolBlocks = (value = '', isStreaming = false) => {
  const blocks = [];
  const addBlock = (data) => {
    const url = `file:///seafile-ai-tool/${blocks.length}`;
    blocks.push({ type: 'seadoc', data, url });
    return `[tool result](${url})`;
  };
  const nextValue = value.replace(TOKEN_RE, (token) => {
    const tagName = token.match(/^<(\w+)/)?.[1];
    if (!TOOL_TAGS.has(tagName)) {
      return token;
    }
    // A tag can arrive over several SSE chunks. Do not display its raw metadata.
    if (!token.endsWith('/>')) {
      return isStreaming ? '' : addBlock({ status: 'failed', error_code: 'invalid_artifact' });
    }
    const data = parseAttributes(token);
    if (!data || !['created', 'failed', 'unknown'].includes(data.status) ||
      (data.status === 'created' && (!data.name || !isSafeDocumentPath(data.path)))) {
      return addBlock({ status: 'failed', error_code: 'invalid_artifact' });
    }
    return addBlock(data);
  });
  return { value: nextValue, blocks };
};
