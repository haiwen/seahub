import { clearAppStateForLocalStorage, getDefaultAppState } from '../utils/app-state-utils';
import { SAVE_TO_LOCAL_STORAGE_TIMEOUT, STORAGE_KEYS, CANVAS_SEARCH_TAB, DEFAULT_SIDEBAR } from '../constants';
// import { clearElementsForLocalStorage } from '../utils/element-utils';
import { updateBrowserStateVersion } from './tab-sync';
import { debounce } from '../../../utils/utils';

const MAX_DOC_STORAGE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_STORAGE_BYTES = 4 * 1024 * 1024;
const STORAGE_INDEX_KEY = 'excalidraw-storage-index';

const getElementsKey = (docUuid) => `${STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS}_${docUuid}`;
const getStateKey = (docUuid) => `${STORAGE_KEYS.LOCAL_STORAGE_APP_STATE}_${docUuid}`;

const getStringSize = (value) => {
  if (!value) return 0;
  try {
    return new Blob([value]).size;
  } catch (error) {
    return value.length;
  }
};

const parseDocUuidByKey = (key) => {
  const elementsPrefix = `${STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS}_`;
  const statePrefix = `${STORAGE_KEYS.LOCAL_STORAGE_APP_STATE}_`;
  if (key.startsWith(elementsPrefix)) {
    return key.slice(elementsPrefix.length);
  }
  if (key.startsWith(statePrefix)) {
    return key.slice(statePrefix.length);
  }
  return null;
};

const getStorageIndex = () => {
  try {
    const index = localStorage.getItem(STORAGE_INDEX_KEY);
    if (!index) return {};
    const parsed = JSON.parse(index);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(error);
    return {};
  }
};

const saveStorageIndex = (index) => {
  try {
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(error);
  }
};

const getTrackedDocUuids = () => {
  const tracked = new Set(Object.keys(getStorageIndex()));
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const docUuid = parseDocUuidByKey(key);
      if (docUuid) tracked.add(docUuid);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(error);
  }
  return [...tracked];
};

const getDocStorageSize = (docUuid) => {
  try {
    const elements = localStorage.getItem(getElementsKey(docUuid));
    const appState = localStorage.getItem(getStateKey(docUuid));
    return getStringSize(elements) + getStringSize(appState);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(error);
    return 0;
  }
};

const getAllDocsStorageSize = () => {
  return getTrackedDocUuids().reduce((acc, docUuid) => acc + getDocStorageSize(docUuid), 0);
};

const deleteDocLocalData = (docUuid) => {
  try {
    localStorage.removeItem(getElementsKey(docUuid));
    localStorage.removeItem(getStateKey(docUuid));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(error);
  }
};

const pickPayload = (elementsStr, appStateStr) => {
  const payloads = [
    { elementsStr, appStateStr },
    { elementsStr: '[]', appStateStr },
    { elementsStr: '[]', appStateStr: 'null' },
  ];

  for (const payload of payloads) {
    const payloadSize = getStringSize(payload.elementsStr) + getStringSize(payload.appStateStr);
    if (payloadSize <= MAX_DOC_STORAGE_BYTES) {
      return { ...payload, payloadSize };
    }
  }

  const fallback = payloads[payloads.length - 1];
  return {
    ...fallback,
    payloadSize: getStringSize(fallback.elementsStr) + getStringSize(fallback.appStateStr),
  };
};

const ensureStorageRoom = (docUuid, payloadSize) => {
  const index = getStorageIndex();
  let totalSize = getAllDocsStorageSize();
  const currentDocSize = getDocStorageSize(docUuid);
  let projectedSize = totalSize - currentDocSize + payloadSize;
  if (projectedSize <= MAX_TOTAL_STORAGE_BYTES) {
    return true;
  }

  const candidates = getTrackedDocUuids()
    .filter((uuid) => uuid !== docUuid)
    .sort((a, b) => (index[a] || 0) - (index[b] || 0));

  for (const candidateUuid of candidates) {
    const deletedSize = getDocStorageSize(candidateUuid);
    deleteDocLocalData(candidateUuid);
    delete index[candidateUuid];
    totalSize -= deletedSize;
    projectedSize = totalSize - currentDocSize + payloadSize;
    if (projectedSize <= MAX_TOTAL_STORAGE_BYTES) {
      break;
    }
  }

  saveStorageIndex(index);
  return projectedSize <= MAX_TOTAL_STORAGE_BYTES;
};

const isQuotaExceededError = (error) => {
  if (!error) return false;
  return error.name === 'QuotaExceededError' || error.code === 22;
};

export const saveDataStateToLocalStorage = (docUuid, elements, appState) => {
  try {
    const _appState = clearAppStateForLocalStorage(appState);
    if (_appState.openSidebar?.name === DEFAULT_SIDEBAR.name && _appState.openSidebar.tab === CANVAS_SEARCH_TAB) {
      _appState.openSidebar = null;
    }
    const elementsKey = getElementsKey(docUuid);
    const stateKey = getStateKey(docUuid);

    const preparedPayload = pickPayload(JSON.stringify(elements), JSON.stringify(_appState));
    if (!ensureStorageRoom(docUuid, preparedPayload.payloadSize)) {
      // eslint-disable-next-line no-console
      console.warn('Not enough localStorage room for excalidraw draft, skip element persistence.');
      localStorage.setItem(elementsKey, '[]');
      localStorage.setItem(stateKey, preparedPayload.appStateStr);
    } else {
      localStorage.setItem(elementsKey, preparedPayload.elementsStr);
      localStorage.setItem(stateKey, preparedPayload.appStateStr);
    }

    const index = getStorageIndex();
    index[docUuid] = Date.now();
    saveStorageIndex(index);
    updateBrowserStateVersion(STORAGE_KEYS.VERSION_DATA_STATE);
  }
  catch (error) {
    if (isQuotaExceededError(error)) {
      try {
        const index = getStorageIndex();
        const payload = pickPayload('[]', JSON.stringify(clearAppStateForLocalStorage(appState)));
        const candidates = getTrackedDocUuids()
          .filter((uuid) => uuid !== docUuid)
          .sort((a, b) => (index[a] || 0) - (index[b] || 0));

        for (const candidateUuid of candidates) {
          deleteDocLocalData(candidateUuid);
          delete index[candidateUuid];
        }

        if (ensureStorageRoom(docUuid, payload.payloadSize)) {
          localStorage.setItem(getElementsKey(docUuid), payload.elementsStr);
          localStorage.setItem(getStateKey(docUuid), payload.appStateStr);
        }

        index[docUuid] = Date.now();
        saveStorageIndex(index);
        updateBrowserStateVersion(STORAGE_KEYS.VERSION_DATA_STATE);
      } catch (retryError) {
        // eslint-disable-next-line no-console
        console.error(retryError);
      }
      return;
    }
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

export const saveToLocalStorage = debounce((docUuid, elements, appState) => {
  saveDataStateToLocalStorage(docUuid, elements, appState);
}, SAVE_TO_LOCAL_STORAGE_TIMEOUT);

export const importFromLocalStorage = (docUuid) => {
  let savedElements = null;
  let savedState = null;
  const elementsKey = getElementsKey(docUuid);
  const stateKey = getStateKey(docUuid);
  try {
    savedElements = localStorage.getItem(elementsKey);
    savedState = localStorage.getItem(stateKey);
  }
  catch (error) {
    // Unable to access localStorage
    // eslint-disable-next-line no-console
    console.error(error);
  }
  let elements = [];
  if (savedElements) {
    try {
      elements = JSON.parse(savedElements);
    }
    catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      // Do nothing because elements array is already empty
    }
  }
  let appState = null;
  if (savedState) {
    try {
      appState = Object.assign(Object.assign({}, getDefaultAppState()), clearAppStateForLocalStorage(JSON.parse(savedState)));
    }
    catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      // Do nothing because appState is already null
    }
  }
  return { elements, appState };
};

export const getElementsStorageSize = (docUuid) => {
  try {
    const elementsKey = getElementsKey(docUuid);
    const elements = localStorage.getItem(elementsKey);
    const elementsSize = getStringSize(elements);
    return elementsSize;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return 0;
  }
};

export const getTotalStorageSize = (docUuid) => {
  try {
    const stateKey = getStateKey(docUuid);
    const appState = localStorage.getItem(stateKey);
    // const collab = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_COLLAB);

    const appStateSize = getStringSize(appState);
    // const collabSize = collab?.length || 0;

    return appStateSize + getElementsStorageSize(docUuid);
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return 0;
  }
};
