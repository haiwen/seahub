// Same boundary contract as seahub/ai/content_blocks.py: registered bodies are
// opaque, code is protected, and incomplete blocks are never dispatched.
// Conservative protocol protection includes list continuations/mixed containers;
// it deliberately does not claim to implement the renderer's full Markdown grammar.
const CONTAINER_PREFIX = '[ \\t]*(?:(?:>[ \\t]?|(?:[-+*]|\\d{1,9}[.)])[ \\t]+)[ \\t]*)*';
const TOKEN = new RegExp(`(?<fence>^${CONTAINER_PREFIX}(?:\u0060{3,}(?!\u0060)[^\u0060\\r\\n]*|~{3,}[^\\r\\n]*)(?:\\r?\\n|$))|(?<indented>^[ \\t]*(?:>[ \\t]?[ \\t]*)*(?=[^\\r\\n]*\\S)[^\\r\\n]*(?:\\r?\\n|$))|(?<ticks>\u0060+)|<(?<closing>/)?(?<tag>[A-Za-z][\\w:-]*)(?=[\\s/>]|$)`, 'gm');
const INLINE_TOKEN = /(?<ticks>`+)|<(?<closing>\/)?(?<tag>[A-Za-z][\w:-]*)(?=[\s/>]|$)/g;

const lineLayout = (raw) => {
  let column = 0;
  let line = Array.from(raw).map((char) => {
    const width = char === '\t' ? 4 - column % 4 : 1;
    column += width;
    return char === '\t' ? ' '.repeat(width) : char;
  }).join('').replace(/[\r\n]+$/, '');
  let depth = 0;
  let quote;
  while ((quote = line.match(/^ {0,3}> ?/))) {
    line = line.slice(quote[0].length);
    depth += 1;
  }
  const indent = line.match(/^ */)[0].length;
  const item = line.match(/^ {0,3}(?:[-+*]|\d{1,9}[.)])( +)/);
  return { depth, indent, item: item ? item[0].length : null, text: line };
};

const listBase = (value, start, depth) => {
  let base = 0;
  value.slice(0, start).replace(/\r?\n$/, '').split(/\r?\n/).forEach((line) => {
    const layout = lineLayout(line);
    if (layout.depth !== depth) base = 0;
    else if (layout.item !== null) base = layout.item;
    else if (layout.text.trim() && layout.indent < base) base = 0;
  });
  return base;
};

const codeEnd = (value, token) => {
  const start = token.index + token[0].length;
  if (token.groups.fence || token.groups.indented) {
    const layout = lineLayout(token[0]);
    const base = layout.item ?? listBase(value, token.index, layout.depth);
    const relative = layout.item === null ? layout.indent - base : 0;
    if (relative >= 4) return start;
    if (!token.groups.fence) return null;
    const marker = token[0].match(new RegExp(`^${CONTAINER_PREFIX}(\u0060+|~+)`))[1];
    const closing = new RegExp(`^${marker[0]}{${marker.length},}[ ]*$`);
    let offset = start;
    const lines = value.slice(start).match(/[^\n]*\n|[^\n]+$/g) || [];
    for (const line of lines) {
      const candidate = lineLayout(line);
      const relativeIndent = candidate.indent - base;
      if (candidate.depth === layout.depth && candidate.item === null && relativeIndent >= 0 && relativeIndent <= 3 && closing.test(candidate.text.trimStart())) {
        return offset + line.length;
      }
      offset += line.length;
    }
    return value.length;
  }
  const ticks = /`+/g;
  ticks.lastIndex = start;
  let match;
  while ((match = ticks.exec(value))) {
    if (match[0].length === token.groups.ticks.length) return ticks.lastIndex;
  }
  return null;
};

const tagEnd = (value, start) => {
  let quote = null;
  for (let index = start; index < value.length; index++) {
    const char = value[index];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === '\'') {
      quote = char;
    } else if (char === '>') {
      return index + 1;
    }
  }
  return null;
};

export const parseContentBlocks = (value = '', tags = []) => {
  const registered = new Set(tags);
  const tokenRe = new RegExp(TOKEN.source, 'gm');
  const blocks = [];
  let position = 0;
  let textStart = 0;
  while (position < value.length) {
    tokenRe.lastIndex = position;
    let token = tokenRe.exec(value);
    if (!token) break;
    let end;
    let block;
    if (token.groups.fence || token.groups.indented) {
      end = codeEnd(value, token);
      if (end === null) {
        const inlineRe = new RegExp(INLINE_TOKEN.source, 'g');
        inlineRe.lastIndex = token.index;
        const inline = inlineRe.exec(value);
        if (!inline || inline.index >= tokenRe.lastIndex) {
          position = tokenRe.lastIndex;
          continue;
        }
        token = inline;
      }
    } else end = null;
    if (end !== null) {
      block = { type: 'code', raw: value.slice(token.index, end) };
    } else if (token.groups.ticks) {
      end = codeEnd(value, token);
      if (end === null) {
        position = token.index + token[0].length;
        continue;
      }
      block = { type: 'code', raw: value.slice(token.index, end) };
    } else {
      const tag = token.groups.tag;
      const tokenEnd = token.index + token[0].length;
      end = tagEnd(value, tokenEnd);
      const partialTag = end === null && tags.some((name) => name.startsWith(tag));
      if ((!registered.has(tag) && !partialTag) || token.groups.closing) {
        position = end ?? value.length;
        continue;
      }
      const attributes = end === null ? '' : value.slice(tokenEnd, end - 1);
      const selfClosing = end !== null && attributes.trimEnd().endsWith('/');
      const contentStart = end;
      let contentEnd = end;
      let complete = end !== null;
      if (complete && !selfClosing) {
        // Body text may contain JSON/code. Only balance this tag's delimiters.
        const boundary = new RegExp(`<(?<closing>/)?${tag}(?=[\\s/>]|$)`, 'g');
        let depth = 1;
        let cursor = end;
        complete = false;
        while (cursor < value.length) {
          boundary.lastIndex = cursor;
          const nested = boundary.exec(value);
          if (!nested) break;
          cursor = boundary.lastIndex;
          const nestedEnd = tagEnd(value, cursor);
          if (nestedEnd === null) break;
          cursor = nestedEnd;
          if (nested.groups.closing) depth -= 1;
          else if (!value.slice(boundary.lastIndex, nestedEnd - 1).trimEnd().endsWith('/')) depth += 1;
          if (depth === 0) {
            contentEnd = nested.index;
            end = nestedEnd;
            complete = true;
            break;
          }
        }
      }
      if (!complete) end = value.length;
      block = {
        type: 'block', tag, raw: value.slice(token.index, end),
        attributes: selfClosing ? attributes.slice(0, attributes.lastIndexOf('/')) : attributes,
        content: complete && !selfClosing ? value.slice(contentStart, contentEnd) : '',
        complete, selfClosing,
      };
    }
    if (token.index > textStart) blocks.push({ type: 'text', raw: value.slice(textStart, token.index) });
    blocks.push(block);
    position = textStart = end;
  }
  if (textStart < value.length) blocks.push({ type: 'text', raw: value.slice(textStart) });
  return blocks;
};

export const getBlockAttributes = (block) => {
  const element = new DOMParser().parseFromString(`<${block.tag}${block.attributes}></${block.tag}>`, 'text/html').body.firstElementChild;
  return Object.fromEntries(Array.from(element?.attributes || []).map(({ name, value }) => [name, value]));
};
