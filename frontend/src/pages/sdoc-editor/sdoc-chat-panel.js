import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import { Tooltip } from '@seafile/sdoc-editor';
import PropTypes from 'prop-types';
import { chatAPI } from '@/api/chat-api';
import DirChat from '@/components/dir-chat';
import { ASK_PAGE_SLUG_ID, CHAT_MESSAGE_TYPE } from '@/components/dir-chat/constants';
import { AttachmentObject, ChatMessage } from '@/components/dir-chat/models';
import Icon from '@/components/icon';
import OpIcon from '@/components/op-icon';
import ChatToolbar from '@/components/toolbar/chat-toolbar';
import { gettext } from '@/utils/constants';
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

  const submitReview = useCallback(async ({ sessionId, message, createSession, onProgress }) => {
    const progressId = `review-progress-${Date.now()}`;
    const showProgress = (phase) => onProgress(new ChatMessage({
      id: progressId,
      message: {},
      type: CHAT_MESSAGE_TYPE.TIP,
      extensions: [{ type: 'sdoc_review_progress', phase }],
    }));
    showProgress('reading_document');
    let reviewSessionId = sessionId;
    if (reviewSessionId === ASK_PAGE_SLUG_ID.NEW) {
      const session = await createSession(message.slice(0, 100));
      reviewSessionId = session._id;
    }

    const improvingTimer = window.setTimeout(() => showProgress('drafting_suggestion'), 700);
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
    const userMessages = (response.data.messages || []).map(ChatMessage.fromServer);
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
        runningTask: true,
      };
    }

    return { sessionId: reviewSessionId, messages: userMessages };
  }, [docPath, repoID]);

  const cancelReview = useCallback(async (taskId) => {
    const response = await chatAPI.cancelSdocReview(taskId);
    const content = response.data.task.assistant_content || gettext('Review stopped.');
    return (messages) => messages.map((chat) => {
      if (!chat.extensions.some((extension) => extension.type === 'sdoc_review' && extension.review_task_id === taskId)) return chat;
      return new ChatMessage({
        id: chat._id,
        message: { ...chat.message, [CHAT_MESSAGE_TYPE.AI_REPLY]: content },
        isUserSpeak: chat.isUserSpeak,
        type: chat.type,
        extensions: chat.extensions.filter((extension) => extension.review_task_id !== taskId),
      });
    });
  }, []);

  const messageWorkflow = useMemo(() => ({
    submit: submitReview,
    cancel: cancelReview,
    handlesTask: (type) => type === 'sdoc_review',
  }), [submitReview, cancelReview]);

  const messageRenderers = useMemo(() => ({
    sdoc_review: ({ extension, onMessageContentChange, onTaskRunningChange }) => (
      <SdocReviewCard
        reviewTaskId={extension.review_task_id}
        onMessageContentChange={onMessageContentChange}
        onTaskRunningChange={onTaskRunningChange}
      />
    ),
    sdoc_review_progress: ({ extension }) => (
      <SdocReviewProgress phase={extension.phase} />
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
            messageWorkflow={messageWorkflow}
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
    <span id="sdoc-chat-plugin-icon" className="d-flex align-items-center justify-content-center w-100 h-100">
      <Icon symbol="new-chat" style={{ width: 16, height: 16 }} />
      <Tooltip target="sdoc-chat-plugin-icon">{gettext('Chat with AI')}</Tooltip>
    </span>
  );
};

export default SdocChatPanel;
