import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import DirChat from '../../../components/dir-view-mode/dir-chat';
import ChatToolbar from '../../../components/toolbar/chat-toolbar';
import Icon from '../../../components/icon';
import OpIcon from '../../../components/op-icon';
import { AttachmentObject } from '../../../components/dir-view-mode/dir-chat/models';
import { ASK_PAGE_SLUG_ID } from '../../../components/dir-view-mode/dir-chat/constants';
import { gettext } from '../../../utils/constants';

import './sdoc-chat-panel.css';

const SdocChatPanel = ({ onClose, width }) => {
  const { repoID, docPath, docName } = window.seafile;

  const initialAttachments = useMemo(() => {
    return [new AttachmentObject({
      repo_id: repoID,
      path: docPath,
      name: docName,
    })];
  }, [docName, docPath, repoID]);

  const getInitialPageSlugId = useCallback(() => ASK_PAGE_SLUG_ID.NEW, []);

  useLayoutEffect(() => {
    const panel = document.getElementById('sdoc-content-right-panel');
    const panelWrapper = panel?.closest('.sdoc-content-right-panel-wrapper');
    const editorScrollContainer = document.getElementById('sdoc-scroll-container');

    if (!panelWrapper || !editorScrollContainer) {
      return undefined;
    }

    const syncScrollPosition = () => {
      editorScrollContainer.scrollLeft = panelWrapper.offsetWidth + 36;
    };

    panelWrapper.classList.add('sdoc-chat-panel-wrapper', 'open');
    syncScrollPosition();

    const rafId = window.requestAnimationFrame(syncScrollPosition);
    const timer = window.setTimeout(syncScrollPosition, 320);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timer);
      panelWrapper.classList.remove('sdoc-chat-panel-wrapper');
    };
  }, []);

  return (
    <div
      className={`cur-view-detail sdoc-chat-panel ${width < 400 ? 'cur-view-detail-small' : 'cur-view-detail-large'}`}
      style={{ width }}
    >
      <div className="sdoc-chat-panel-header">
        <div className="sdoc-chat-panel-header-left">
          <span className="sdoc-chat-panel-title">{gettext('Chat with AI')}</span>
        </div>
        <div className="sdoc-chat-panel-header-right">
          <div className="sdoc-chat-panel-toolbar">
            <ChatToolbar className="sdoc-chat-panel-toolbar-actions" isCompact={true} showHistory={false} />
          </div>
          <OpIcon
            id="sdoc-chat-panel-close-btn"
            className="sdoc-chat-panel-header-op"
            symbol="close"
            tooltip={gettext('Close')}
            op={onClose}
          />
        </div>
      </div>
      <div className="sdoc-chat-panel-body">
        <div className="sdoc-chat-panel-content">
          <DirChat
            repoID={repoID}
            repoName=""
            embedded={true}
            initialAttachments={initialAttachments}
            hideDocuments={true}
            enableSessions={false}
            getInitialPageSlugId={getInitialPageSlugId}
          />
        </div>
      </div>
    </div>
  );
};

SdocChatPanel.propTypes = {
  onClose: PropTypes.func,
  width: PropTypes.number,
};

export const SdocChatPluginIcon = () => {
  return (
    <span className="d-flex align-items-center" title={gettext('Chat with AI')}>
      <Icon symbol="new-chat" style={{ width: 16, height: 16 }} />
    </span>
  );
};

export default SdocChatPanel;
