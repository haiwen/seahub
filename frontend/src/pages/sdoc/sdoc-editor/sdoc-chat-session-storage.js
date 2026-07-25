import LocalStorage from '../../../utils/local-storage-utils';

const SDOC_CHAT_SESSION_STORAGE_KEY = 'sdoc_ai_doc_sessions';
const SDOC_CHAT_SESSION_STORAGE_VERSION = 1;
const MAX_SESSIONS_PER_DOC = 50;

const getDefaultStorage = () => ({
  version: SDOC_CHAT_SESSION_STORAGE_VERSION,
  docs: {},
});

const getDocKey = (repoID, docPath) => {
  if (!repoID || !docPath) {
    return '';
  }
  return `${repoID}:${docPath}`;
};

const getStorage = () => {
  const savedValue = LocalStorage.getItem(SDOC_CHAT_SESSION_STORAGE_KEY, getDefaultStorage());
  if (!savedValue || typeof savedValue !== 'object') {
    return getDefaultStorage();
  }

  const docs = savedValue.docs && typeof savedValue.docs === 'object' ? savedValue.docs : {};
  return {
    version: SDOC_CHAT_SESSION_STORAGE_VERSION,
    docs,
  };
};

const setStorage = (storage) => {
  LocalStorage.setItem(SDOC_CHAT_SESSION_STORAGE_KEY, storage);
};

const normalizeSessionItems = (sessions) => {
  if (!Array.isArray(sessions)) {
    return [];
  }

  return sessions
    .filter((session) => session && session.session_id)
    .sort((left, right) => (right.updated_at || 0) - (left.updated_at || 0));
};

export const getDocSessions = (repoID, docPath) => {
  const docKey = getDocKey(repoID, docPath);
  if (!docKey) {
    return [];
  }

  const storage = getStorage();
  const docState = storage.docs[docKey];
  return normalizeSessionItems(docState?.sessions || []);
};

export const getDocSessionIds = (repoID, docPath) => {
  return getDocSessions(repoID, docPath).map((session) => session.session_id);
};

export const getLatestDocSessionId = (repoID, docPath) => {
  return getDocSessionIds(repoID, docPath)[0] || null;
};

export const touchDocSession = (repoID, docPath, sessionId, updatedAt = Date.now()) => {
  if (!sessionId) {
    return;
  }

  const docKey = getDocKey(repoID, docPath);
  if (!docKey) {
    return;
  }

  const storage = getStorage();
  const docState = storage.docs[docKey] || {};
  const currentSessions = normalizeSessionItems(docState.sessions || []);
  const nextSessions = [
    { session_id: sessionId, updated_at: updatedAt },
    ...currentSessions.filter((session) => session.session_id !== sessionId),
  ].slice(0, MAX_SESSIONS_PER_DOC);

  storage.docs[docKey] = {
    updated_at: updatedAt,
    sessions: nextSessions,
  };
  setStorage(storage);
};

export const removeDocSession = (repoID, docPath, sessionId) => {
  if (!sessionId) {
    return;
  }

  const docKey = getDocKey(repoID, docPath);
  if (!docKey) {
    return;
  }

  const storage = getStorage();
  const docState = storage.docs[docKey];
  if (!docState) {
    return;
  }

  const nextSessions = normalizeSessionItems(docState.sessions || []).filter((session) => session.session_id !== sessionId);
  if (nextSessions.length === 0) {
    delete storage.docs[docKey];
  } else {
    storage.docs[docKey] = {
      updated_at: nextSessions[0].updated_at || Date.now(),
      sessions: nextSessions,
    };
  }

  setStorage(storage);
};

export const removeDocSessions = (repoID, docPath, sessionIds) => {
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return;
  }

  const docKey = getDocKey(repoID, docPath);
  if (!docKey) {
    return;
  }

  const sessionIdSet = new Set(sessionIds.filter(Boolean));
  if (sessionIdSet.size === 0) {
    return;
  }

  const storage = getStorage();
  const docState = storage.docs[docKey];
  if (!docState) {
    return;
  }

  const nextSessions = normalizeSessionItems(docState.sessions || []).filter((session) => !sessionIdSet.has(session.session_id));
  if (nextSessions.length === 0) {
    delete storage.docs[docKey];
  } else {
    storage.docs[docKey] = {
      updated_at: nextSessions[0].updated_at || Date.now(),
      sessions: nextSessions,
    };
  }

  setStorage(storage);
};
