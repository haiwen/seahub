import { getBlockAttributes, parseContentBlocks } from './content-blocks';
import { seadocBlockToPart } from './seadoc';
import { buildAIReply, libraryFileBlockToLink } from './utils';

// Register a new protocol here, not in other renderers' exclusion patterns.
export const REPLY_BLOCK_HANDLERS = {
  'seafile-ai-seadoc': (block, context) => seadocBlockToPart(block, context.isStreaming),
  'seafile-ai-markdown': (block, context) => {
    if (block.selfClosing) return null;
    const name = getBlockAttributes(block).file_name || 'answer.md';
    const url = new URL(`file:///seafile-ai/${name}?t=${context.chatId}`).href;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const legacyLink = context.text.match(new RegExp(`\\[${escapedName}\\]\\(((?:https?:\\/\\/[^)]+)?\\/lib\\/[^)]+)\\)`));
    const fileUrl = context.previews[context.markdownIndex++] || legacyLink?.[1] || '';
    context.mdFiles.push({
      name, url, fileUrl, fileUuid: fileUrl.match(/smart-link\/([-0-9a-f]{36})\//i)?.[1] || '',
      content: block.content.trimStart(), kind: 'markdown_artifact', document_key: url,
    });
    return { type: 'text', value: `[${name}](${url})` };
  },
  'seafile-ai-markdown-link': () => null,
  'markdown-readonly-tips': (block) => ({ type: 'text', value: `\n\n> ${block.content}\n\n` }),
  'seafile-ai-file': (block, context) => ({ type: 'text', value: libraryFileBlockToLink(block, context.repoID) }),
};

export const buildReplyParts = (value, { sources = [], chatId = '', repoID = '', isStreaming = false, mdFiles = [] } = {}) => {
  const blocks = parseContentBlocks(value, Object.keys(REPLY_BLOCK_HANDLERS));
  const context = {
    chatId, repoID, isStreaming, mdFiles, markdownIndex: 0,
    text: blocks.filter((block) => block.type === 'text').map((block) => block.raw).join(''),
    previews: blocks.filter((block) => block.tag === 'seafile-ai-markdown-link' && block.complete).map((block) => getBlockAttributes(block).url || ''),
  };
  const parts = [];
  let text = '';
  const protectedText = [];
  // Keep opaque bodies and code out of all subsequent Markdown/reference rewrites.
  let prefix = 'AI_PROTECTED_BLOCK_';
  while (value.includes(prefix)) prefix += '_';
  const protect = (raw) => {
    const placeholder = `${prefix}${protectedText.length}_END`;
    protectedText.push(raw);
    return placeholder;
  };
  const flush = () => {
    if (!text) return;
    let rendered = buildAIReply(text, sources, chatId);
    rendered = rendered.replace(new RegExp(`${prefix}(\\d+)_END`, 'g'), (_, index) => protectedText[Number(index)]);
    if (rendered.trim()) parts.push({ type: 'text', value: rendered });
    text = '';
  };
  blocks.forEach((block) => {
    if (block.type === 'text') {
      text += block.raw;
      return;
    }
    if (block.type === 'code') {
      text += protect(block.raw);
      return;
    }
    if (!block.complete) return;
    const part = REPLY_BLOCK_HANDLERS[block.tag](block, context);
    if (!part) return;
    if (part.type === 'text') text += protect(part.value);
    else {
      flush();
      parts.push(part);
    }
  });
  flush();
  return parts;
};
