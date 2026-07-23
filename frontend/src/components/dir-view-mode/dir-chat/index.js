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

const mergeAttachments = (currentAttachments, attachments, reset = false) => {
  const nextAttachments = reset ? [] : currentAttachments.slice();
  const attachmentKeys = new Set(nextAttachments.map((item) => item.key));

  attachments.forEach((attachment) => {
    if (!attachmentKeys.has(attachment.key)) {
      nextAttachments.push(attachment);
      attachmentKeys.add(attachment.key);
    }
  });

  return nextAttachments;
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
        return mergeAttachments(currentAttachments, attachments, reset);
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
      return mergeAttachments(currentAttachments, attachments);
    });
  }, [updateAttachments]);

  return null;
};

const Main = ({ repoID, settings, showDocuments = true, compact = false, enableSessions = true, defaultShowSessions, onEmbeddedViewChange }) => {
  const { isLoading: isAskPageLoading, pageSlugId, togglePageSlugId } = useAskPage();
  const {
    isLoading: isSessionsLoading,
    isShowSessions,
    toggleIsShowSessions,
    openShowSessions,
    closeShowSessions
  } = useSessions();
  const showSessionsView = enableSessions && isShowSessions;

  useEffect(() => {
    const eventBus = EventBus.getInstance();
    if (!eventBus) return;

    const unsubscribeNewSession = eventBus.subscribe(EVENT_BUS_TYPE.CHAT_NEW_SESSION, () => {
      togglePageSlugId(ASK_PAGE_SLUG_ID.NEW);
    });

    const unsubscribeToggleSessions = enableSessions ? eventBus.subscribe(EVENT_BUS_TYPE.CHAT_TOGGLE_SESSIONS, () => {
      toggleIsShowSessions();
    }) : null;

    return () => {
      unsubscribeNewSession && unsubscribeNewSession();
      unsubscribeToggleSessions && unsubscribeToggleSessions();
    };
  }, [enableSessions, togglePageSlugId, toggleIsShowSessions]);

  useEffect(() => {
    if (!enableSessions) {
      closeShowSessions();
    }
  }, [closeShowSessions, enableSessions]);

  useEffect(() => {
    if (!enableSessions || !compact || typeof defaultShowSessions !== 'boolean') {
      return;
    }

    if (defaultShowSessions) {
      openShowSessions();
      return;
    }

    closeShowSessions();
  }, [closeShowSessions, compact, defaultShowSessions, enableSessions, openShowSessions]);

  useEffect(() => {
    if (typeof onEmbeddedViewChange === 'function' && compact) {
      onEmbeddedViewChange({
        isShowSessions: showSessionsView,
        view: showSessionsView ? 'sessions' : 'chat',
      });
    }
  }, [compact, onEmbeddedViewChange, showSessionsView]);

  const isLoading = isAskPageLoading || (enableSessions && isSessionsLoading);

  return (
    <div className="ask-main-container">
      {isLoading ? (
        <CenteredLoading className="flex-1" />
      ) : (
        <>
          <div className="d-flex o-hidden flex-1">
            <ChatEvents />
            {compact && showSessionsView ? (
              <Sessions
                sessionId={pageSlugId}
                embedded={true}
                onSelect={closeShowSessions}
              />
            ) : (
              <>
                <Chat
                  repoID={repoID}
                  settings={settings}
                  forceSmallPage={compact}
                  hideSessionHeader={compact}
                />
                {showDocuments && <Documents />}
              </>
            )}
          </div>
          {!compact && showSessionsView && <Sessions sessionId={pageSlugId} />}
        </>
      )}
    </div>
  );
};

Main.propTypes = {
  repoID: PropTypes.string.isRequired,
  settings: PropTypes.object,
  showDocuments: PropTypes.bool,
  compact: PropTypes.bool,
  enableSessions: PropTypes.bool,
  defaultShowSessions: PropTypes.bool,
  onEmbeddedViewChange: PropTypes.func,
};

const DirChat = ({ repoID, repoName, settings, embedded = false, initialAttachments = [], hideDocuments = false, enableSessions = true, defaultShowSessions, resetURL, getInitialPageSlugId, onEmbeddedViewChange }) => {
  const defaultResetURL = useCallback((pageSlugId) => {
    const baseUrl = `${siteRoot}library/${repoID}/${encodeURIComponent(repoName)}/?chat=true&path=/`;
    const url = pageSlugId === ASK_PAGE_SLUG_ID.NEW ? baseUrl : `${baseUrl}&chat_session_id=${pageSlugId}`;
    window.history.replaceState({}, '', url);
  }, [repoID, repoName]);

  const defaultGetInitialPageSlugId = useCallback(() => {
    const { search } = window.location;
    const match = search.match(/[?&]chat_session_id=([^&]+)/);
    if (!match) {
      return ASK_PAGE_SLUG_ID.NEW;
    }
    return match[1] || ASK_PAGE_SLUG_ID.NEW;
  }, []);

  const mergedSettings = useMemo(() => Object.assign({}, DEFAULT_SETTINGS, settings || {}), [settings]);
  const normalizedInitialAttachments = useMemo(() => {
    return Array.isArray(initialAttachments) ? initialAttachments.filter(Boolean) : [];
  }, [initialAttachments]);
  const effectiveResetURL = embedded ? resetURL : (resetURL || defaultResetURL);
  const effectiveGetInitialPageSlugId = embedded ? getInitialPageSlugId : (getInitialPageSlugId || defaultGetInitialPageSlugId);

  return (
    <AskPageProvider resetURL={effectiveResetURL} getInitialPageSlugId={effectiveGetInitialPageSlugId}>
      <SessionsProvider repoID={repoID} api={chatAPI} enableSessions={enableSessions}>
        <DocumentsProvider>
          <AIChatToolsProvider initialAttachments={normalizedInitialAttachments}>
            <Main
              repoID={repoID}
              settings={mergedSettings}
              showDocuments={!hideDocuments}
              compact={embedded}
              enableSessions={enableSessions}
              defaultShowSessions={defaultShowSessions}
              onEmbeddedViewChange={onEmbeddedViewChange}
            />
          </AIChatToolsProvider>
        </DocumentsProvider>
      </SessionsProvider>
    </AskPageProvider>
  );
};

DirChat.propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string,
  settings: PropTypes.object,
  embedded: PropTypes.bool,
  initialAttachments: PropTypes.array,
  hideDocuments: PropTypes.bool,
  enableSessions: PropTypes.bool,
  defaultShowSessions: PropTypes.bool,
  resetURL: PropTypes.func,
  getInitialPageSlugId: PropTypes.func,
  onEmbeddedViewChange: PropTypes.func,
};

export default DirChat;
