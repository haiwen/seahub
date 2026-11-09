import URLDecorator from '@/utils/url-decorator';

const INTERNAL_REFERENCE_RE = /<reference_(\d+)>/g;
const GROUPED_REFERENCE_RE = /\(\s*(?:Documents|Document|Reference|Source|Docs|Doc)\s*\d+(?:(?:\s*,\s*|\s+)(?:Documents|Document|Reference|Source|Docs|Doc)\s*\d+)*(?:\s*,)?\s*\)/gi;
const REFERENCE_GROUP_FORMAT_RE = /([[\(])(Reference|Source|Document|Documents|Docs|Doc)\s*(\d+(?:\s*,\s*(?:\d+|(?:Reference|Source|Document|Documents|Docs|Doc)\s*\d+))*)\s*([\]\)])/gi;
const REFERENCE_MARK_RE = /\[(Reference)\s+(\d+)\]/g;
const REFERENCE_MARK_WORD_RE = /(Reference|Source|Document|Documents|Docs|Doc)\s*/gi;
const REFERENCE_PARENTHESES_RE = /\((\s*\[Reference \d+\](?:\s*,\s*\[Reference \d+\])*)\s*\)/gi;
const REFERENCE_COMMA_RE = /(\[Reference\s+\d+\](?:\s*,\s*\[Reference\s+\d+\])+)/g;
const LIB_MARKDOWN_LINK_RE = /\[[^\]]+\.md\]\((?:https?:\/\/[^)]+)?\/lib\/[^)]+\)\s*/g;

const escapeMarkdownLinkText = (value) => value.replace(/([\\\[\]])/g, '\\$1');

export const getSourceTitle = (source, index) => {
  return source?.title || source?.name || source?.path || `Reference ${index}`;
};

export const normalizeSources = (originSources, repoID) => {
  const sources = Array.isArray(originSources) ? originSources.slice(0) : [];
  return sources.map((source, index) => {
    const title = getSourceTitle(source, index + 1).replaceAll('"', '\'');
    const repoId = source?.repo_id || repoID;
    const path = source?.path || '';
    return {
      ...source,
      repo_id: repoId,
      path,
      title,
      name: title,
      content: source?.ai_summary || source?.content || '',
      document_key: source?.document_key || `${repoId}:${path || title}`,
    };
  });
};

export const libraryFileBlockToLink = (block, repoID = '') => {
  if (!repoID || block.selfClosing) return block.raw;
  const path = block.content.trim();
  if (!path || path.includes('\n')) {
    return block.raw;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedPath.split('/').includes('..')) {
    return block.raw;
  }

  const url = URLDecorator.getUrl({
    type: 'open_with_default',
    repoID,
    filePath: normalizedPath,
  });
  if (!url) {
    return block.raw;
  }
  return `[${escapeMarkdownLinkText(path)}](${url})`;
};

const normalizeReferenceGroups = (value = '') => {
  return value.replace(GROUPED_REFERENCE_RE, (match) => {
    const items = match.match(/\d+/g) || [];
    if (items.length === 0) {
      return '';
    }
    return items.map((item) => ` [Reference ${item}]`).join('');
  });
};

export const buildAIReply = (value, sources, chatId) => {
  if (!value) {
    return '';
  }

  // Protocol blocks have already been dispatched; only normalize prose here.
  const nextValue = value.replace(LIB_MARKDOWN_LINK_RE, '').trim();
  if (chatId === 'typing') {
    return nextValue.replace(INTERNAL_REFERENCE_RE, '');
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    return nextValue;
  }

  const normalizedValue = normalizeReferenceGroups(nextValue)
    .replace(REFERENCE_GROUP_FORMAT_RE, (match, openBracket, referenceType, ordersPart) => {
      const orders = ordersPart.split(',').map((orderPart) => {
        return orderPart.replace(REFERENCE_MARK_WORD_RE, '').trim();
      }).filter(Boolean);
      return orders.map((order) => ` [Reference ${order}]`).join('');
    })
    .replace(REFERENCE_PARENTHESES_RE, '$1')
    .replace(REFERENCE_COMMA_RE, (match) => match.replace(/\],\s*\[/g, ']['))
    .replace(REFERENCE_MARK_RE, (match, text, orderString) => {
      const order = Number(orderString);
      const source = sources[order - 1];
      if (!source) {
        return '';
      }
      return ` [${source.title}][${order}]`;
    })
    .trim();

  const sourcesString = sources.map((source, index) => {
    return `[${index + 1}]: #reference-${index + 1} "${source.title}"`;
  }).join('\n');

  return `${normalizedValue}\n\n${sourcesString}`;
};
