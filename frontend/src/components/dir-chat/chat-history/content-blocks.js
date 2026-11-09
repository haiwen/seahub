// Same boundary contract as seahub/ai/content_blocks.py: registered bodies are
// opaque, code is protected, and incomplete blocks are never dispatched.
const TOKEN = /(?<fence>^ {0,3}(?:`{3,}(?!`)[^`\r\n]*|~{3,}[^\r\n]*)(?:\r?\n|$))|(?<ticks>`+)|<(?<closing>\/)?(?<tag>[A-Za-z][\w:-]*)(?=[\s/>]|$)/gm;

const codeEnd = (value, token) => {
  const start = token.index + token[0].length;
  if (token.groups.fence) {
    const marker = token[0].match(/^ {0,3}(`+|~+)/)[1];
    const closing = new RegExp(`^ {0,3}${marker[0]}{${marker.length},}[ \\t]*(?:\\r?\\n|$)`, 'gm');
    closing.lastIndex = start;
    const match = closing.exec(value);
    return match ? closing.lastIndex : value.length;
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
    const token = tokenRe.exec(value);
    if (!token) break;
    let end;
    let block;
    if (token.groups.fence || token.groups.ticks) {
      end = codeEnd(value, token);
      if (end === null) {
        position = tokenRe.lastIndex;
        continue;
      }
      block = { type: 'code', raw: value.slice(token.index, end) };
    } else {
      const tag = token.groups.tag;
      end = tagEnd(value, tokenRe.lastIndex);
      const partialTag = end === null && tags.some((name) => name.startsWith(tag));
      if ((!registered.has(tag) && !partialTag) || token.groups.closing) {
        position = end ?? value.length;
        continue;
      }
      const attributes = end === null ? '' : value.slice(tokenRe.lastIndex, end - 1);
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
