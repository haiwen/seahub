import React, { useCallback, useMemo, useState } from 'react';
import classnames from 'classnames';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { MarkdownViewer } from '@seafile/seafile-editor';
import CenteredLoading from '../../../centered-loading';
import Icon from '../../../icon';
import OpIcon from '../../../op-icon';
import { mediaUrl, gettext } from '../../../../utils/constants';
import { Selector } from '../components';
import { useDocuments } from '../hooks';

import './index.css';

const MARKDOWN_ARTIFACT_KIND = 'markdown_artifact';

const downloadBlob = (blob, fileName, callback) => {
  const downloadLink = document.createElement('a');
  downloadLink.href = window.URL.createObjectURL(blob);
  downloadLink.download = fileName || 'answer.md';
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  window.setTimeout(() => {
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(downloadLink.href);
  }, 100);
  callback && callback();
};

const downloadContent = (content, fileName, callback) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, fileName, callback);
};

const Documents = () => {
  const {
    isShowDocuments,
    documents,
    currentDocument,
    isDocumentLoading,
    closeDocuments,
    setCurrentDocument,
  } = useDocuments();
  const [isFull, setIsFull] = useState(false);
  const [isMoreMenuShow, setIsMoreMenuShow] = useState(false);

  const isMarkdownArtifact = currentDocument?.kind === MARKDOWN_ARTIFACT_KIND;

  const documentsOptions = useMemo(() => {
    if (!Array.isArray(documents) || documents.length === 0) {
      return [];
    }
    return documents.map((document) => ({
      value: document.document_key,
      label: document.name,
      icon: document.kind === MARKDOWN_ARTIFACT_KIND ? 'ai-file' : null,
    }));
  }, [documents]);

  const handleToggleCurrentDocument = useCallback((documentKey) => {
    const nextDocument = documents.find((item) => item.document_key === documentKey);
    if (nextDocument) {
      setCurrentDocument(nextDocument);
    }
  }, [documents, setCurrentDocument]);

  const toggleMoreMenu = useCallback(() => {
    setIsMoreMenuShow((currentValue) => !currentValue);
  }, []);

  const handleDownload = useCallback(() => {
    downloadContent(currentDocument?.content || '', currentDocument?.name);
  }, [currentDocument]);

  const toggleFull = useCallback(() => {
    setIsFull((currentValue) => !currentValue);
  }, []);

  const handleOpenFile = useCallback(() => {
    if (!currentDocument?.fileUrl) {
      return;
    }
    window.open(currentDocument.fileUrl, '_blank', 'noopener');
  }, [currentDocument]);

  if (!isShowDocuments || !Array.isArray(documents) || documents.length === 0 || !currentDocument) {
    return null;
  }

  return (
    <div className={classnames('seafile-ai-chat-documents-wrapper', { 'full-content': isFull, 'markdown-artifact': isMarkdownArtifact })}>
      <div className="seafile-ai-chat-documents">
        <div className="seafile-ai-chat-documents-header">
          {isMarkdownArtifact ? (
            <Selector
              value={currentDocument.document_key}
              options={documentsOptions}
              icon="arrow-down"
              className="seafile-ai-chat-documents-selector"
              editorClassName="seafile-ai-chat-documents-selector-editor"
              iconPlacement="right"
              border={false}
              onChange={handleToggleCurrentDocument}
              isSearchEnabled={false}
              displayBgColor={true}
            >
              <Icon symbol="ai-file" className="seafile-ai-chat-document-icon" />
              <div className="seafile-ai-chat-documents-count ml-1">{documents.length}</div>
              <div className="seafile-ai-chat-documents-divider mx-2"></div>
              <div className="seafile-ai-chat-document-name text-truncate" title={currentDocument.name}>{currentDocument.name}</div>
            </Selector>
          ) : (
            <div className="d-flex align-items-center o-hidden">
              <Icon symbol="ai-file" className="mr-2" />
              <select
                className="form-control form-control-sm"
                value={currentDocument.document_key}
                onChange={(event) => setCurrentDocument(documents.find((item) => item.document_key === event.target.value) || currentDocument)}
              >
                {documents.map((document) => (
                  <option key={document.document_key} value={document.document_key}>{document.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="seafile-ai-chat-documents-header-btns">
            {isMarkdownArtifact && currentDocument?.fileUrl && (
              <Dropdown isOpen={isMoreMenuShow} toggle={toggleMoreMenu} className="d-flex">
                <DropdownToggle
                  tag={OpIcon}
                  id="seafile-ai-chat-documents-more-btn"
                  className="op-icon seafile-ai-chat-documents-more-btn"
                  symbol="more"
                  tooltip={gettext('More operations')}
                />
                <DropdownMenu end className="seafile-ai-chat-documents-dropdown-menu">
                  <DropdownItem onClick={handleOpenFile}>{gettext('Open file')}</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            )}
            <OpIcon
              id="seafile-ai-chat-documents-download-btn"
              className="op-icon seafile-ai-chat-documents-icon-btn"
              symbol="download"
              tooltip={gettext('Download')}
              op={handleDownload}
            />
            <OpIcon
              id="seafile-ai-chat-documents-expand-btn"
              className="op-icon seafile-ai-chat-documents-icon-btn"
              symbol={isMarkdownArtifact ? (isFull ? 'collapse' : 'view-issue') : (isFull ? 'minus-sign' : 'fullscreen')}
              tooltip={isFull ? gettext('Collapse') : gettext('Expand')}
              op={toggleFull}
            />
            <OpIcon
              id="seafile-ai-chat-documents-close-btn"
              className="op-icon seafile-ai-chat-documents-icon-btn"
              symbol="close"
              tooltip={gettext('Close')}
              op={closeDocuments}
            />
          </div>
        </div>
        <div className="seafile-ai-chat-documents-body">
          <div className={classnames('seafile-ai-chat-document-content', { 'seafile-ai-chat-document-md': isMarkdownArtifact })}>
            {isDocumentLoading ? (
              <div className="seafile-ai-chat-documents-loading">
                <CenteredLoading />
              </div>
            ) : (
              <MarkdownViewer
                key={currentDocument.document_key}
                value={currentDocument.content || ''}
                isFetching={false}
                isShowOutline={false}
                mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;
