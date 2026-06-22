import React from 'react';
import { MarkdownViewer } from '@seafile/seafile-editor';
import Icon from '../../../icon';
import { mediaUrl, gettext } from '../../../../utils/constants';
import { useDocuments } from '../hooks';

import './index.css';

const Documents = () => {
  const {
    isShowDocuments,
    documents,
    currentDocument,
    closeDocuments,
    setCurrentDocument,
  } = useDocuments();

  if (!isShowDocuments || !Array.isArray(documents) || documents.length === 0 || !currentDocument) {
    return null;
  }

  return (
    <div className="sea-ticket-chat-documents-wrapper">
      <div className="sea-ticket-chat-documents">
        <div className="sea-ticket-chat-documents-header">
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
          <div className="sea-ticket-chat-documents-header-btns">
            <button type="button" className="btn btn-icon p-0" onClick={closeDocuments} title={gettext('Close')}>
              <Icon symbol="close" />
            </button>
          </div>
        </div>
        <div className="sea-ticket-chat-documents-body">
          <div className="sea-ticket-chat-document-content">
            <MarkdownViewer
              value={currentDocument.content || ''}
              isFetching={false}
              isShowOutline={false}
              mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;
