import React, { useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { siteRoot } from '../../../utils/constants';
import CenteredLoading from '../../centered-loading';
import Chat from './chat';
import Sessions from './sessions';
import Documents from './documents';
import { AskPageProvider, SessionsProvider, DocumentsProvider, AIChatToolsProvider, useAIChatTools, useAskPage, useSessions } from './hooks';
import { consumePendingAttachments } from './hooks/ai-chat-tools';
import { ASK_PAGE_SLUG_ID } from './constants';
import { chatAPI } from '../../../utils/chat-api';
import EventBus from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';

import './index.css';

const DEFAULT_SETTINGS = {
  developer_mode: false,
};

const ChatEvents = () => {
  const { updateAttachments } = useAIChatTools();

  useEffect(() => {
    const eventBus = EventBus.getInstance();
    if (!eventBus) return;

    const unsubscribeAttachFiles = eventBus.subscribe(EVENT_BUS_TYPE.CHAT_ATTACH_FILES, ({ attachments = [], reset = false } = {}) => {
      if (!Array.isArray(attachments) || attachments.length === 0) {
        return;
      }

      updateAttachments((currentAttachments) => {
        const nextAttachments = reset ? [] : currentAttachments.slice();
        const attachmentKeys = new Set(nextAttachments.map((item) => item.key));

        attachments.forEach((attachment) => {
          if (!attachmentKeys.has(attachment.key)) {
            nextAttachments.push(attachment);
            attachmentKeys.add(attachment.key);
          }
        });

        return nextAttachments;
      });
    });

    return () => {
      unsubscribeAttachFiles && unsubscribeAttachFiles();
    };
  }, [updateAttachments]);

  useEffect(() => {
    const attachments = consumePendingAttachments();
    if (!Array.isArray(attachments) || attachments.length === 0) {
      return;
    }

    updateAttachments((currentAttachments) => {
      const nextAttachments = currentAttachments.slice();
      const attachmentKeys = new Set(nextAttachments.map((item) => item.key));

      attachments.forEach((attachment) => {
        if (!attachmentKeys.has(attachment.key)) {
          nextAttachments.push(attachment);
          attachmentKeys.add(attachment.key);
        }
      });

      return nextAttachments;
    });
  }, [updateAttachments]);

  return null;
};

const Main = ({ repoID, settings }) => {
  const { isLoading: isAskPageLoading, pageSlugId, togglePageSlugId } = useAskPage();
  const { isLoading: isSessionsLoading, isShowSessions, toggleIsShowSessions } = useSessions();

  useEffect(() => {
    const eventBus = EventBus.getInstance();
    if (!eventBus) return;

    const unsubscribeNewSession = eventBus.subscribe(EVENT_BUS_TYPE.CHAT_NEW_SESSION, () => {
      togglePageSlugId(ASK_PAGE_SLUG_ID.NEW);
    });

    const unsubscribeToggleSessions = eventBus.subscribe(EVENT_BUS_TYPE.CHAT_TOGGLE_SESSIONS, () => {
      toggleIsShowSessions();
    });

    return () => {
      unsubscribeNewSession && unsubscribeNewSession();
      unsubscribeToggleSessions && unsubscribeToggleSessions();
    };
  }, [togglePageSlugId, toggleIsShowSessions]);

  const isLoading = isAskPageLoading || isSessionsLoading;

  return (
    <div className="ask-main-container">
      {isLoading ? (
        <CenteredLoading className="flex-1" />
      ) : (
        <>
          <div className="d-flex o-hidden flex-1">
            <ChatEvents />
            <Chat repoID={repoID} settings={settings} />
            <Documents />
          </div>
          {isShowSessions && <Sessions sessionId={pageSlugId} />}
        </>
      )}
    </div>
  );
};

Main.propTypes = {
  repoID: PropTypes.string.isRequired,
  settings: PropTypes.object,
};

const DirChat = ({ repoID, repoName, settings }) => {
  const resetURL = useCallback((pageSlugId) => {
    const baseUrl = `${siteRoot}library/${repoID}/${encodeURIComponent(repoName)}/?chat=true&path=/`;
    const url = pageSlugId === ASK_PAGE_SLUG_ID.NEW ? baseUrl : `${baseUrl}&chatSessionId=${pageSlugId}`;
    window.history.replaceState({}, '', url);
  }, [repoID, repoName]);

  const getInitialPageSlugId = useCallback(() => {
    const { search } = window.location;
    const match = search.match(/[?&]chatSessionId=([^&]+)/);
    if (!match) {
      return ASK_PAGE_SLUG_ID.NEW;
    }
    return match[1] || ASK_PAGE_SLUG_ID.NEW;
  }, []);

  const mergedSettings = useMemo(() => Object.assign({}, DEFAULT_SETTINGS, settings || {}), [settings]);

  return (
    <AskPageProvider resetURL={resetURL} getInitialPageSlugId={getInitialPageSlugId}>
      <SessionsProvider repoID={repoID} api={chatAPI}>
        <DocumentsProvider>
          <AIChatToolsProvider>
            <Main repoID={repoID} settings={mergedSettings} />
          </AIChatToolsProvider>
        </DocumentsProvider>
      </SessionsProvider>
    </AskPageProvider>
  );
};

DirChat.propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  settings: PropTypes.object,
};

export default DirChat;
