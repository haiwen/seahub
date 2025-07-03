import {
  getSceneVersion,
  reconcileElements,
  restoreElements,
} from '@excalidraw/excalidraw';
import { getSyncableElements } from '.';
import context from '../context';

class ServerScreenCache {
  static cache = new WeakMap();

  static get = (socket) => {
    return ServerScreenCache.cache.get(socket);
  };

  static set = (socket, elements) => {
    const screenVersion = getSceneVersion(elements);
    ServerScreenCache.cache.set(socket, screenVersion);
  };
}

export const loadFromServerStorage = async () => {
  try {
    const response = await context.getSceneContent();
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return {};
  }
};

export const saveToBackend = async (content) => {
  const response = await context.saveSceneContent(content);
  return response.data;
};

export const isSavedToServerStorage = (socketId, elements) => {
  if (socketId && elements) {
    const prevVersion = ServerScreenCache.get(socketId);
    const currVersion = getSceneVersion(elements);
    return prevVersion === currVersion;
  }
  return true;
};

export const saveToServerStorage = async (socketId, exdrawContent, appState) => {
  const { version, elements } = exdrawContent;
  if (!socketId || isSavedToServerStorage(socketId, elements)) {
    return null;
  }
  const result = await loadFromServerStorage();
  const { elements: prevStoredElements } = result;

  const prevElements = getSyncableElements(restoreElements(prevStoredElements));
  const storedElements = getSyncableElements(reconcileElements(elements, prevElements, appState));

  const saveResult = await saveToBackend(JSON.stringify({ version, elements: storedElements }));
  return { ...saveResult, storedElements };
};

export const saveInitDataToServer = async (content, localData) => {
  const currentVersion = getSceneVersion(content.elements);
  const localVersion = getSceneVersion(localData?.elements || []);
  if (currentVersion === localVersion) return;
  await saveToBackend(JSON.stringify(content));
};

