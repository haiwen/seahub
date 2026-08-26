import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import DirChat from '../../../components/dir-view-mode/dir-chat';
import ChatToolbar from '../../../components/toolbar/chat-toolbar';
import Icon from '../../../components/icon';
import OpIcon from '../../../components/op-icon';
import { AttachmentObject, ChatMessage } from '../../../components/dir-view-mode/dir-chat/models';
import { ASK_PAGE_SLUG_ID, CHAT_MESSAGE_TYPE } from '../../../components/dir-view-mode/dir-chat/constants';
import { chatAPI } from '../../../utils/chat-api';
import { gettext } from '../../../utils/constants';
import { getDocSessionIds, getLatestDocSessionId, removeDocSession, removeDocSessions, touchDocSession } from './sdoc-chat-session-storage';
import SdocReviewCard from './sdoc-review-card';
import SdocReviewProgress from './sdoc-review-progress';

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

  const getInitialPageSlugId = useCallback(() => {
    return getLatestDocSessionId(repoID, docPath) || ASK_PAGE_SLUG_ID.NEW;
  }, [docPath, repoID]);

  const getSessionIdsFilter = useCallback(() => {
    return getDocSessionIds(repoID, docPath);
  }, [docPath, repoID]);

  const onSessionTouch = useCallback((sessionId) => {
    touchDocSession(repoID, docPath, sessionId);
  }, [docPath, repoID]);

  const onSessionDelete = useCallback((sessionId) => {
    removeDocSession(repoID, docPath, sessionId);
  }, [docPath, repoID]);

  const onSessionIdsMissing = useCallback((sessionIds) => {
    removeDocSessions(repoID, docPath, sessionIds);
  }, [docPath, repoID]);

  const mapMessages = useCallback((rawMessages) => {
    return (rawMessages || []).map((item) => {
      if (item.role === 'user') {
        return new ChatMessage({
          id: item.id,
          message: {
            [CHAT_MESSAGE_TYPE.TEXT]: item.content,
            [CHAT_MESSAGE_TYPE.ATTACHMENTS]: item.attachments || [],
          },
          isUserSpeak: true,
        });
      }
      return new ChatMessage({
        id: item.id,
        type: CHAT_MESSAGE_TYPE.GROUP,
        extensions: item.extensions || [],
        message: {
          [CHAT_MESSAGE_TYPE.AI_REPLY]: item.content || '',
          [CHAT_MESSAGE_TYPE.SOURCES]: item.sources || [],
        },
      });
    });
  }, []);

  const onReviewSubmit = useCallback(async ({ sessionId, message, createSession, onProgress }) => {
    let reviewSessionId = sessionId;
    if (reviewSessionId === ASK_PAGE_SLUG_ID.NEW) {
      const session = await createSession(message.slice(0, 100));
      reviewSessionId = session._id;
    }

    onProgress?.('reading_document');
    const improvingTimer = window.setTimeout(() => onProgress?.('drafting_suggestion'), 700);
    const response = await chatAPI.createSdocReview({
      repo_id: repoID,
      path: docPath,
      prompt: message,
      session_uuid: reviewSessionId,
    }).finally(() => {
      window.clearTimeout(improvingTimer);
    });

    const route = response.data.route;
    if (route === 'answer') {
      return { sessionId: reviewSessionId, fallbackToChat: true, message };
    }

    const task = response.data.task || {};
    const userMessages = mapMessages(response.data.messages);
    if (['queued', 'reading', 'drafting'].includes(task.generation_status)) {
      return {
        sessionId: reviewSessionId,
        messages: [
          ...userMessages,
          new ChatMessage({
            type: CHAT_MESSAGE_TYPE.GROUP,
            extensions: [{ type: 'sdoc_review', review_task_id: task.id }],
            message: { [CHAT_MESSAGE_TYPE.AI_REPLY]: gettext('Reviewing the document…') },
          }),
        ],
      };
    }

    return { sessionId: reviewSessionId, messages: userMessages };
  }, [docPath, repoID, mapMessages]);

  const messageRenderers = useMemo(() => ({
    sdoc_review: ({ extension }) => <SdocReviewCard reviewTaskId={extension.review_task_id} />,
    sdoc_review_progress: ({ extension }) => (
      <SdocReviewProgress phase={extension.phase} completed={extension.completed} total={extension.total} />
    ),
  }), []);

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
            <ChatToolbar className="sdoc-chat-panel-toolbar-actions" isCompact={true} showHistory={true} />
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
            enableSessions={true}
            getInitialPageSlugId={getInitialPageSlugId}
            getSessionIdsFilter={getSessionIdsFilter}
            onSessionTouch={onSessionTouch}
            onSessionDelete={onSessionDelete}
            onSessionIdsMissing={onSessionIdsMissing}
            fallbackToNewWhenSessionMissing={true}
            messageRenderers={messageRenderers}
            onReviewSubmit={onReviewSubmit}
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
