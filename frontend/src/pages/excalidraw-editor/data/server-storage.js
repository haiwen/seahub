import {
  getSceneVersion,
  reconcileElements,
  restoreElements,
} from '@excalidraw/excalidraw';
import { getSyncableElements } from '.';
import context from '../context';

class ServerScreenCache {
  static cache = new Map();

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

  // const result = await loadFromServerStorage();
  // const { elements: prevStoredElements } = result;

  // const prevElements = getSyncableElements(restoreElements(prevStoredElements));
  // const storedElements = getSyncableElements(reconcileElements(elements, prevElements, appState));

  const saveResult = await saveToBackend(JSON.stringify({ version, elements }));
  if (!saveResult.success) return null;

  ServerScreenCache.set(socketId, elements);
  let storedElements = null;
  if (!saveResult.updated) {
    const { elements: prevStoredElements } = saveResult;
    const prevElements = getSyncableElements(restoreElements(prevStoredElements));
    storedElements = getSyncableElements(reconcileElements(elements, prevElements, appState));
    return { ...saveResult, storedElements };
  }
  return { ...saveResult };
};

export const saveInitDataToServer = async (content, localData) => {
  const currentVersion = getSceneVersion(content.elements);
  const localVersion = getSceneVersion(localData?.elements || []);
  if (currentVersion === localVersion) return;
  await saveToBackend(JSON.stringify(content));
};

/**
 *
 * @param {*} addedFiles Map
 */
export const saveFilesToServer = async (addedFiles) => {
  const savedFiles = [];
  const erroredFiles = [];

  await Promise.all([...addedFiles].map(async ([id, file]) => {
    try {
      await context.uploadExdrawImage(id, file);
      savedFiles.push(id);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      erroredFiles.push(id);
    }
  }));

  return { savedFiles, erroredFiles };

};

export const saveFilesToRepo = async (addedFiles) => {
  const savedFiles = [];
  const erroredFiles = [];

  await Promise.all([...addedFiles].map(async ([id, file]) => {
    try {
      savedFiles.push(id);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      erroredFiles.push(id);
    }
  }));

  return { savedFiles, erroredFiles };

};

const getImageUrl = (fileName) => {
  const docUuid = context.getDocUuid();
  const { server } = window.app.pageOptions;
  const url = `${server}/api/v2.1/exdraw/download-image/${docUuid}/${fileName}`;
  return url;
};

export const loadFilesFromServer = async (fileIds) => {
  const loadedFiles = [];
  const erroredFiles = new Map();
  await Promise.all([...new Set(fileIds)].map(async (id) => {
    try {
      const imageUrl = getImageUrl(id);
      loadedFiles.push({
        mimeType: 'image/jpeg',
        id: id.split('.')[0],
        dataURL: 'http://127.0.0.1/thumbnail/9ff8f352-2c82-4802-8484-e7f90d2d0148/1024/qe.png?mtime=1756964849',
        created: Date.now(),
        lastRetrieved: Date.now(),
      });
    } catch (error) {
      erroredFiles.set(id, true);
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }));

  return { loadedFiles, erroredFiles };
};

export const loadFilesFromRepo = async (fileIds) => {
  const loadedFiles = [];
  const erroredFiles = new Map();
  await Promise.all([...new Set(fileIds)].map(async (id) => {
    try {
      // const { data } = await context.downloadRepoImage(id);

      loadedFiles.push({
        mimeType: 'image/jpeg',
        id: id.split('.')[0],
        dataURL: 'http://127.0.0.1/thumbnail/9ff8f352-2c82-4802-8484-e7f90d2d0148/1024/qe.png?mtime=1756964849',
        created: Date.now(),
        lastRetrieved: Date.now(),
        origin: 'repo'
      });
    } catch (error) {
      erroredFiles.set(id, true);
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }));

  return { loadedFiles, erroredFiles };
};
