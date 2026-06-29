import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { ELementTypes, MarkdownViewer } from '@seafile/seafile-editor';
import { mediaUrl, siteRoot } from '../../../../../utils/constants';
import { Utils } from '../../../../../utils/utils';
// import { useDocuments } from '../../hooks';
import { CHAT_MESSAGE_TYPE } from '../../constants';
import CustomizeDefinition from '../customize-definition';
import CustomizeLinkReference from '../customize-link-reference';

import './index.css';

const VIEWER_RETRY_DELAY = 300;
const VIEWER_MAX_RETRIES = 4;
const INTERNAL_REFERENCE_RE = /<reference_(\d+)>/g;
const GROUPED_REFERENCE_RE = /\((?:\s*(?:Reference|Source|Document|Documents|Docs|Doc)\s*\d+\s*,?)+\s*\)/gi;
const REFERENCE_GROUP_FORMAT_RE = /([[\(])(Reference|Source|Document|Documents|Docs|Doc)\s*(\d+(?:\s*,\s*(?:\d+|(?:Reference|Source|Document|Documents|Docs|Doc)\s*\d+))*)\s*([\]\)])/gi;
const REFERENCE_MARK_RE = /\[(Reference)\s+(\d+)\]/g;
const REFERENCE_MARK_WORD_RE = /(Reference|Source|Document|Documents|Docs|Doc)\s*/gi;
const REFERENCE_PARENTHESES_RE = /\((\s*\[Reference \d+\](?:\s*,\s*\[Reference \d+\])*)\s*\)/gi;
const REFERENCE_COMMA_RE = /(\[Reference\s+\d+\](?:\s*,\s*\[Reference\s+\d+\])+)/g;

const getSourceTitle = (source, index) => {
  return source?.title || source?.name || source?.path || `Reference ${index}`;
};

const normalizeSources = (originSources, repoID) => {
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

const normalizeReferenceGroups = (value) => {
  return value.replace(GROUPED_REFERENCE_RE, (match) => {
    const items = match.match(/\d+/g) || [];
    if (items.length === 0) {
      return '';
    }
    return items.map((item) => ` [Reference ${item}]`).join('');
  });
};

const buildAIReply = (value, sources, chatId) => {
  if (!value) {
    return '';
  }

  if (chatId === 'typing') {
    return value.replace(INTERNAL_REFERENCE_RE, '');
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    return value;
  }

  const normalizedValue = normalizeReferenceGroups(value)
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

// const buildDocumentPayload = (source, repoID) => {
//   const repoId = source?.repo_id || repoID;
//   const path = source?.path || '';
//   const title = source?.title || source?.name || path;
//   return {
//     ...source,
//     repo_id: repoId,
//     path,
//     name: title,
//     title,
//     content: source?.ai_summary || source?.content || '',
//     document_key: source?.document_key || `${repoId}:${path || title}`,
//   };
// };

const buildDocumentUrl = (source, repoID) => {
  const repoId = source?.repo_id || repoID;
  const path = source?.path || '';
  if (!repoId || !path) {
    return '';
  }
  return `${siteRoot}lib/${repoId}/file${Utils.encodePath(path)}`;
};

const CustomizeMarkdownViewer = forwardRef(({ chatId, message, repoID }, ref) => {
  // const { openDocument } = useDocuments();
  const containerRef = useRef(null);
  const retryCountRef = useRef(0);
  const [viewerKey, setViewerKey] = useState(0);
  const [aiMessageType, setAIMessageType] = useState('rich-text');
  const { value, sources } = useMemo(() => {
    const nextSources = normalizeSources(message?.[CHAT_MESSAGE_TYPE.SOURCES] || [], repoID);
    return {
      value: buildAIReply(message?.[CHAT_MESSAGE_TYPE.AI_REPLY] || '', nextSources, chatId),
      sources: nextSources,
    };
  }, [chatId, message, repoID]);

  useImperativeHandle(ref, () => ({
    getAIReply: () => value,
  }), [value]);

  useEffect(() => {
    retryCountRef.current = 0;
    setViewerKey(0);
  }, [value]);

  useEffect(() => {
    if (!value) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const loadingNode = containerRef.current?.querySelector('.empty-loading-page');
      if (!loadingNode) {
        return;
      }
      if (retryCountRef.current >= VIEWER_MAX_RETRIES) {
        return;
      }
      retryCountRef.current += 1;
      setViewerKey((currentValue) => currentValue + 1);
    }, VIEWER_RETRY_DELAY);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, viewerKey]);

  const handleOpenDocument = useCallback((source) => {
    const url = buildDocumentUrl(source, repoID);
    if (!url) {
      return;
    }

    // openDocument(buildDocumentPayload(source, repoID));
    if (Utils.isWeChat()) {
      location.href = url;
      return;
    }
    window.open(url);
  }, [repoID]);

  const options = useMemo(() => {
    return {
      [ELementTypes.LINK_REFERENCE]: {
        render: (<CustomizeLinkReference />),
      },
      [ELementTypes.DEFINITION]: {
        render: (<CustomizeDefinition sources={sources} onOpen={handleOpenDocument} />),
      },
    };
  }, [handleOpenDocument, sources]);

  const beforeRenderCallback = useCallback((nodes) => {
    const valueCount = Array.isArray(nodes) ? nodes.length : 0;
    if (valueCount === 1 && nodes[0]?.type === 'paragraph') {
      setAIMessageType('text');
      return nodes;
    }
    setAIMessageType('rich-text');
    return nodes;
  }, []);

  if (!value) {
    return null;
  }

  return (
    <div className={classNames('sea-ai-message-reply', aiMessageType)} ref={containerRef}>
      <MarkdownViewer
        key={viewerKey}
        value={value}
        isFetching={false}
        isShowOutline={false}
        mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
        options={options}
        beforeRenderCallback={beforeRenderCallback}
        onDefinitionClick={() => {}}
      />
    </div>
  );
});

CustomizeMarkdownViewer.propTypes = {
  chatId: PropTypes.string,
  message: PropTypes.object,
  repoID: PropTypes.string,
};

export default CustomizeMarkdownViewer;
