import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Utils } from '../../../../utils/utils';
import toaster from '../../../../components/toast';
import { eventBus } from '../../../../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../../../../components/common/event-bus-type';
import { ChatSession } from '../models';
import { useAskPage } from './page-type';
import { ASK_PAGE_SLUG_ID } from '../constants';

const SessionsContext = React.createContext(null);

export const SessionsProvider = ({ repoID, api, children }) => {
  const [isLoading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
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
    setLoading(true);
    return api.listChatSessions(repoID).then((res) => {
      setSessions(normalizeSessions(res.data.sessions));
    }).catch((error) => {
      toaster.danger(Utils.getErrorMsg(error));
      setSessions([]);
    }).finally(() => {
      setLoading(false);
    });
  }, [api, normalizeSessions, repoID]);

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

  const modifySession = useCallback((sessionId, update) => {
    const payload = {};
    if (Object.prototype.hasOwnProperty.call(update, 'name')) {
      payload.session_name = update.name;
    }
    return api.modifyChatSession(sessionId, payload).then((res) => {
      const updatedSession = new ChatSession(res.data.session);
      updateSessionCollection(setSessions, sessionId, () => updatedSession);
      return updatedSession;
    });
  }, [api, updateSessionCollection]);

  const deleteSession = useCallback((sessionId) => {
    return api.deleteChatSession(sessionId).then(() => {
      updateSessionCollection(setSessions, sessionId, () => null);
      if (pageSlugId === sessionId) {
        togglePageSlugId(ASK_PAGE_SLUG_ID.NEW);
      }
    });
  }, [api, pageSlugId, togglePageSlugId, updateSessionCollection]);

  const modifyLocalSession = useCallback((sessionId, update) => {
    const updater = (session) => {
      const nextSession = Object.assign(Object.create(Object.getPrototypeOf(session)), session);
      Object.keys(update).forEach((key) => {
        nextSession[key] = update[key];
      });
      return nextSession;
    };
    updateSessionCollection(setSessions, sessionId, updater);
  }, [updateSessionCollection]);

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

  const getSession = useCallback((sessionId) => {
    if (!sessionId || sessionId === ASK_PAGE_SLUG_ID.NEW) {
      return null;
    }
    return sessions.find((session) => session._id === sessionId) || null;
  }, [sessions]);

  const openShowSessions = useCallback(() => {
    setIsShowSessions(true);
  }, []);

  const closeShowSessions = useCallback(() => {
    setIsShowSessions(false);
  }, []);

  const toggleIsShowSessions = useCallback(() => {
    setIsShowSessions((currentValue) => !currentValue);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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
    isShowSessions,
    openShowSessions,
    closeShowSessions,
    toggleIsShowSessions,
    loadSessions,
    createSession,
    modifySession,
    deleteSession,
    modifyLocalSession,
    solveProblem,
    getChatMessage,
    markSessionRunningTask,
    prependSession,
    getSession,
  }), [
    createSession,
    deleteSession,
    getSession,
    isLoading,
    isShowSessions,
    loadSessions,
    getChatMessage,
    modifyLocalSession,
    modifySession,
    markSessionRunningTask,
    openShowSessions,
    closeShowSessions,
    prependSession,
    sessions,
    solveProblem,
    toggleIsShowSessions,
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
