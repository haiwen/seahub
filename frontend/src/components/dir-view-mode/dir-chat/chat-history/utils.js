import URLDecorator from '../../../../utils/url-decorator';

const INTERNAL_REFERENCE_RE = /<reference_(\d+)>/g;
const GROUPED_REFERENCE_RE = /\(\s*(?:Documents|Document|Reference|Source|Docs|Doc)\s*\d+(?:(?:\s*,\s*|\s+)(?:Documents|Document|Reference|Source|Docs|Doc)\s*\d+)*(?:\s*,)?\s*\)/gi;
const REFERENCE_GROUP_FORMAT_RE = /([[\(])(Reference|Source|Document|Documents|Docs|Doc)\s*(\d+(?:\s*,\s*(?:\d+|(?:Reference|Source|Document|Documents|Docs|Doc)\s*\d+))*)\s*([\]\)])/gi;
const REFERENCE_MARK_RE = /\[(Reference)\s+(\d+)\]/g;
const REFERENCE_MARK_WORD_RE = /(Reference|Source|Document|Documents|Docs|Doc)\s*/gi;
const REFERENCE_PARENTHESES_RE = /\((\s*\[Reference \d+\](?:\s*,\s*\[Reference \d+\])*)\s*\)/gi;
const REFERENCE_COMMA_RE = /(\[Reference\s+\d+\](?:\s*,\s*\[Reference\s+\d+\])+)/g;
const MARKDOWN_FILE_RE = /<seafile-ai-markdown(?:\s+file_name=(["'])([^"']*?)\1)?\s*>([\s\S]*?)<\/seafile-ai-markdown>/g;
const MARKDOWN_FILE_LINK_RE = /<seafile-ai-markdown-link\s+url=(["'])(.*?)\1\s*><\/seafile-ai-markdown-link>/g;
const MARKDOWN_READONLY_TIPS_RE = /<markdown-readonly-tips>([\s\S]*?)<\/markdown-readonly-tips>/g;
const LIBRARY_FILE_RE = /<seafile-ai-file>([\s\S]*?)<\/seafile-ai-file>/g;
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

export const transformMarkdownFilesToLinks = (value = '', mdFiles = [], messageId = '') => {
  if (!value) {
    return value;
  }

  const previewUrls = [];
  value.replace(MARKDOWN_FILE_LINK_RE, (match, quotationType, url) => {
    previewUrls.push(url || '');
    return match;
  });

  let markdownIndex = 0;

  return value.replace(MARKDOWN_FILE_RE, (match, quotationType, fileName, content, offset, sourceValue) => {
    const safeFileName = fileName || 'answer.md';
    const urlObject = new URL(`file:///seafile-ai/${safeFileName}?t=${messageId}`);
    const url = urlObject.href;
    const escapedFileName = safeFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const repoLinkMatch = (sourceValue || '').match(new RegExp(`\\[${escapedFileName}\\]\\(((?:https?:\\/\\/[^)]+)?\\/lib\\/[^)]+)\\)`));
    const fileUrl = previewUrls[markdownIndex] || repoLinkMatch?.[1] || '';
    const fileUuidMatch = fileUrl.match(/smart-link\/([-0-9a-f]{36})\//i);
    markdownIndex += 1;
    mdFiles.push({
      name: safeFileName,
      url,
      fileUrl,
      fileUuid: fileUuidMatch?.[1] || '',
      content: (content || '').trimStart(),
      kind: 'markdown_artifact',
      document_key: url,
    });
    return `[${safeFileName}](${url})`;
  });
};

export const transformLibraryFilesToLinks = (value = '', repoID = '') => {
  if (!value || !repoID) {
    return value;
  }

  return value.replace(LIBRARY_FILE_RE, (match, filePath) => {
    const path = filePath.trim();
    if (!path || path.includes('\n')) {
      return match;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (normalizedPath.split('/').includes('..')) {
      return match;
    }

    const url = URLDecorator.getUrl({
      type: 'open_with_default',
      repoID,
      filePath: normalizedPath,
    });
    if (!url) {
      return match;
    }
    return `[${escapeMarkdownLinkText(path)}](${url})`;
  });
};

export const buildReadonlyTips = (value = '') => {
  const tips = [];
  const nextValue = value.replace(MARKDOWN_READONLY_TIPS_RE, (match, content) => {
    if (content && content.trim()) {
      tips.push(content.trim());
    }
    return '';
  });
  return {
    value: nextValue,
    tips,
  };
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

export const buildAIReply = (value, sources, chatId, mdFiles = [], repoID = '') => {
  if (!value) {
    return '';
  }

  const { value: valueWithoutTips, tips } = buildReadonlyTips(value);
  const valueWithoutMarkdownFileLinks = transformMarkdownFilesToLinks(valueWithoutTips, mdFiles, chatId)
    .replace(MARKDOWN_FILE_LINK_RE, '')
    .replace(LIB_MARKDOWN_LINK_RE, '')
    .trim();
  const nextValue = transformLibraryFilesToLinks(valueWithoutMarkdownFileLinks, repoID);
  if (chatId === 'typing') {
    const typingValue = nextValue.replace(INTERNAL_REFERENCE_RE, '');
    if (tips.length === 0) {
      return typingValue;
    }
    return `${typingValue}\n\n${tips.map((tip) => `> ${tip}`).join('\n\n')}`;
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    if (tips.length === 0) {
      return nextValue;
    }
    return `${nextValue}\n\n${tips.map((tip) => `> ${tip}`).join('\n\n')}`;
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

  const replyWithSources = `${normalizedValue}\n\n${sourcesString}`;
  if (tips.length === 0) {
    return replyWithSources;
  }

  return `${replyWithSources}\n\n${tips.map((tip) => `> ${tip}`).join('\n\n')}`;
};
