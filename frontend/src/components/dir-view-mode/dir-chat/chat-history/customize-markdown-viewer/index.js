import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { ELementTypes, MarkdownViewer } from '@seafile/seafile-editor';
import { mediaUrl, siteRoot } from '../../../../../utils/constants';
import { Utils } from '../../../../../utils/utils';
import { CHAT_MESSAGE_TYPE } from '../../constants';
import { useDocuments } from '../../hooks';
import CustomizeDefinition from '../customize-definition';
import CustomizeLink from '../customize-link';
import CustomizeLinkReference from '../customize-link-reference';
import { buildAIReply, normalizeSources } from '../utils';

import './index.css';

const VIEWER_RETRY_DELAY = 300;
const VIEWER_MAX_RETRIES = 4;

const buildDocumentUrl = (source, repoID) => {
  const repoId = source?.repo_id || repoID;
  const path = source?.path || '';
  if (!repoId || !path) {
    return '';
  }
  return `${siteRoot}lib/${repoId}/file${Utils.encodePath(path)}`;
};

const CustomizeMarkdownViewer = forwardRef(({ chatId, message, repoID }, ref) => {
  const { openDocument } = useDocuments();
  const containerRef = useRef(null);
  const retryCountRef = useRef(0);
  const [viewerKey, setViewerKey] = useState(0);
  const [aiMessageType, setAIMessageType] = useState('rich-text');
  const { value, sources, mdFiles } = useMemo(() => {
    const nextSources = normalizeSources(message?.[CHAT_MESSAGE_TYPE.SOURCES] || [], repoID);
    const nextMdFiles = [];
    return {
      value: buildAIReply(message?.[CHAT_MESSAGE_TYPE.AI_REPLY] || '', nextSources, chatId, nextMdFiles, repoID),
      sources: nextSources,
      mdFiles: nextMdFiles,
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
      [ELementTypes.LINK]: {
        render: (
          <CustomizeLink
            mdFiles={mdFiles}
            openDocument={openDocument}
            repoID={repoID}
          />
        ),
      },
    };
  }, [handleOpenDocument, mdFiles, openDocument, repoID, sources]);

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
