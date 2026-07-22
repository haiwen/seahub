import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import toaster from '../../../../components/toast';
import { eventBus } from '../../../../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../../../../components/common/event-bus-type';
import { ChatSession } from '../models';
import { useAskPage } from './page-type';
import { ASK_PAGE_SLUG_ID, SESSION_TAB_TYPE } from '../constants';

const SessionsContext = React.createContext(null);

export const SessionsProvider = ({ repoID, api, children, enableSessions = true }) => {
  const [isLoading, setLoading] = useState(enableSessions);
  const [sessions, setSessions] = useState([]);
  const [teamSessions, setTeamSessions] = useState([]);
  const [isTeamSessionsLoading, setIsTeamSessionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(SESSION_TAB_TYPE.MINE);
  const [isShowSessions, setIsShowSessions] = useState(false);
  const sendMessageRequestController = useRef({});
  const { pageSlugId, togglePageSlugId } = useAskPage();

  const normalizeSessions = useCallback((rawSessions) => {
    if (!Array.isArray(rawSessions) || rawSessions.length === 0) {
      return [];
    }
    return rawSessions.map((session) => new ChatSession(session));
  }, []);

  const loadSessions = useCallback(() => {
    if (!enableSessions) {
      setSessions([]);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return api.listChatSessions(repoID).then((res) => {
      setSessions(normalizeSessions(res.data.sessions));
    }).catch((error) => {
      toaster.danger(Utils.getErrorMsg(error));
      setSessions([]);
    }).finally(() => {
      setLoading(false);
    });
  }, [api, enableSessions, normalizeSessions, repoID]);

  const updateSessionCollection = useCallback((setter, sessionId, updater) => {
    setter((currentSessions) => {
      const nextSessions = currentSessions.slice(0);
      const sessionIndex = nextSessions.findIndex((session) => session._id === sessionId);
      if (sessionIndex < 0) {
        return currentSessions;
      }
      const nextSession = updater(nextSessions[sessionIndex]);
      if (!nextSession) {
        nextSessions.splice(sessionIndex, 1);
      } else {
        nextSessions[sessionIndex] = nextSession;
      }
      return nextSessions;
    });
  }, []);

  const updateSessionState = useCallback((sessionId, updater) => {
    updateSessionCollection(setSessions, sessionId, updater);
    updateSessionCollection(setTeamSessions, sessionId, updater);
  }, [updateSessionCollection]);

  const prependSession = useCallback((session) => {
    setSessions((currentSessions) => [session, ...currentSessions.filter((item) => item._id !== session._id)]);
  }, []);

  const createSession = useCallback((name) => {
    return api.createChatSession(repoID, name).then((res) => {
      const session = new ChatSession(res.data.session);
      prependSession(session);
      return session;
    });
  }, [api, prependSession, repoID]);

  const startChatFromConversation = useCallback((sessionId) => {
    return api.copyChatSession(sessionId).then((res) => {
      const session = new ChatSession(res.data.session);
      prependSession(session);
      setActiveTab(SESSION_TAB_TYPE.MINE);
      togglePageSlugId(session._id);
      toaster.success(gettext('Started a new chat from this conversation'));
      return session;
    }).catch((error) => {
      toaster.danger(Utils.getErrorMsg(error));
      throw error;
    });
  }, [api, prependSession, togglePageSlugId]);

  const modifySession = useCallback((sessionId, { name }) => {
    return api.modifyChatSession(sessionId, { session_name: name }).then((res) => {
      const updatedSession = new ChatSession(res.data.session);
      updateSessionState(sessionId, () => updatedSession);
      return updatedSession;
    });
  }, [api, updateSessionState]);

  const deleteSession = useCallback((sessionId) => {
    return api.deleteChatSession(sessionId).then(() => {
      updateSessionState(sessionId, () => null);
      if (pageSlugId === sessionId) {
        togglePageSlugId(ASK_PAGE_SLUG_ID.NEW);
      }
    });
  }, [api, pageSlugId, togglePageSlugId, updateSessionState]);

  const loadTeamSessions = useCallback(() => {
    if (!enableSessions) {
      setTeamSessions([]);
      setIsTeamSessionsLoading(false);
      return Promise.resolve();
    }
    setIsTeamSessionsLoading(true);
    return api.listTeamSharedSessions(repoID).then((res) => {
      setTeamSessions(normalizeSessions(res.data.sessions));
    }).catch((error) => {
      toaster.danger(Utils.getErrorMsg(error));
      setTeamSessions([]);
    }).finally(() => {
      setIsTeamSessionsLoading(false);
    });
  }, [api, enableSessions, normalizeSessions, repoID]);

  const shareSession = useCallback((sessionId) => {
    return api.shareChatSession(sessionId, true).then((res) => {
      const updatedSession = new ChatSession(res.data.session);
      updateSessionState(sessionId, () => updatedSession);
      setTeamSessions((currentSessions) => [updatedSession, ...currentSessions.filter((item) => item._id !== sessionId)]);
      toaster.success(gettext('Chat shared within library'));
      return updatedSession;
    }).catch((error) => {
      toaster.danger(Utils.getErrorMsg(error));
    });
  }, [api, updateSessionState]);

  const unshareSession = useCallback((sessionId) => {
    return api.shareChatSession(sessionId, false).then((res) => {
      const updatedSession = new ChatSession(res.data.session);
      updateSessionCollection(setSessions, sessionId, () => updatedSession);
      updateSessionCollection(setTeamSessions, sessionId, () => null);
      toaster.success(gettext('Chat unshared from library'));
      return updatedSession;
    }).catch((error) => {
      toaster.danger(Utils.getErrorMsg(error));
    });
  }, [api, updateSessionCollection]);

  const modifyLocalSession = useCallback((sessionId, update) => {
    const updater = (session) => {
      const nextSession = Object.assign(Object.create(Object.getPrototypeOf(session)), session);
      Object.keys(update).forEach((key) => {
        nextSession[key] = update[key];
      });
      return nextSession;
    };
    updateSessionState(sessionId, updater);
  }, [updateSessionState]);

  const markSessionRunningTask = useCallback((sessionId, runningTask) => {
    modifyLocalSession(sessionId, { running_task: runningTask });
  }, [modifyLocalSession]);

  const solveProblem = useCallback(({ sessionId, message: problem, attachments, model }) => {
    modifyLocalSession(sessionId, { is_replying: true, running_task: true, problem: null });

    const params = {
      repo_id: repoID,
      query: problem,
      session_uuid: sessionId,
      attachments,
      model,
    };

    const currentController = new AbortController();
    const options = {
      signal: currentController.signal,
    };

    sendMessageRequestController.current = {
      ...sendMessageRequestController.current,
      [sessionId]: currentController,
    };

    const callback = (targetSessionId, isStop = false) => {
      const controller = sendMessageRequestController.current[targetSessionId];
      if (!controller) {
        return;
      }
      if (isStop) {
        controller.abort();
      }
      delete sendMessageRequestController.current[targetSessionId];
    };

    api.sendChatMessageByStream(params, options).then((res) => {
      eventBus.dispatch(EVENT_BUS_TYPE.AI_STREAM_REPLY, sessionId, { res }, callback);
    }).catch((error) => {
      eventBus.dispatch(EVENT_BUS_TYPE.AI_STREAM_REPLY, sessionId, { error }, callback);
    });
  }, [api, modifyLocalSession, repoID]);

  const getChatMessage = useCallback((sessionId) => {
    markSessionRunningTask(sessionId, true);

    const currentController = new AbortController();
    const options = {
      signal: currentController.signal,
    };

    sendMessageRequestController.current = {
      ...sendMessageRequestController.current,
      [sessionId]: currentController,
    };

    const callback = (targetSessionId, isStop = false) => {
      const controller = sendMessageRequestController.current[targetSessionId];
      if (!controller) {
        return;
      }
      if (isStop) {
        controller.abort();
      }
      delete sendMessageRequestController.current[targetSessionId];
    };

    api.getChatMessage(repoID, sessionId, options).then((res) => {
      eventBus.dispatch(EVENT_BUS_TYPE.AI_REPLY, sessionId, { data: res.data }, callback);
    }).catch((error) => {
      eventBus.dispatch(EVENT_BUS_TYPE.AI_REPLY, sessionId, { error }, callback);
    });
  }, [api, markSessionRunningTask, repoID]);

  const openShowSessions = useCallback(() => {
    setIsShowSessions(true);
  }, []);

  const closeShowSessions = useCallback(() => {
    setIsShowSessions(false);
  }, []);

  const toggleIsShowSessions = useCallback(() => {
    setIsShowSessions((currentValue) => !currentValue);
  }, []);

  const getSession = useCallback((sessionId) => {
    if (!sessionId || sessionId === ASK_PAGE_SLUG_ID.NEW) {
      return null;
    }
    return sessions.find((session) => session._id === sessionId) ||
      teamSessions.find((session) => session._id === sessionId) ||
      null;
  }, [sessions, teamSessions]);

  useEffect(() => {
    if (!enableSessions) {
      setLoading(false);
      setSessions([]);
      setTeamSessions([]);
      setIsShowSessions(false);
      return;
    }

    loadSessions();
  }, [enableSessions, loadSessions]);

  useEffect(() => {
    const unsubscribeSendChatMessage = eventBus.subscribe(EVENT_BUS_TYPE.ASK_QUESTION, solveProblem);
    return () => {
      unsubscribeSendChatMessage();
    };
  }, [solveProblem]);

  useEffect(() => {
    return () => {
      Object.keys(sendMessageRequestController.current).forEach((sessionId) => {
        const controller = sendMessageRequestController.current[sessionId];
        if (controller) {
          try {
            controller.abort();
          } catch (error) {
            //
          }
        }
      });
    };
  }, []);

  const value = useMemo(() => ({
    isLoading,
    sessions,
    teamSessions,
    isTeamSessionsLoading,
    activeTab,
    setActiveTab,
    isShowSessions,
    openShowSessions,
    closeShowSessions,
    toggleIsShowSessions,
    loadSessions,
    loadTeamSessions,
    createSession,
    startChatFromConversation,
    modifySession,
    deleteSession,
    shareSession,
    unshareSession,
    modifyLocalSession,
    solveProblem,
    getChatMessage,
    markSessionRunningTask,
    prependSession,
    getSession,
  }), [
    activeTab,
    createSession,
    deleteSession,
    getSession,
    isLoading,
    isShowSessions,
    isTeamSessionsLoading,
    loadSessions,
    loadTeamSessions,
    getChatMessage,
    modifyLocalSession,
    modifySession,
    markSessionRunningTask,
    openShowSessions,
    closeShowSessions,
    prependSession,
    sessions,
    shareSession,
    solveProblem,
    startChatFromConversation,
    teamSessions,
    toggleIsShowSessions,
    unshareSession,
  ]);

  return (
    <SessionsContext.Provider value={value}>
      {children}
    </SessionsContext.Provider>
  );
};

export const useSessions = () => {
  const context = useContext(SessionsContext);
  if (!context) {
    throw new Error('SessionsContext is null');
  }
  return context;
};
