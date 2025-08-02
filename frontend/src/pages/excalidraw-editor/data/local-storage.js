import { clearAppStateForLocalStorage, getDefaultAppState } from '../utils/app-state-utils';
import { SAVE_TO_LOCAL_STORAGE_TIMEOUT, STORAGE_KEYS, CANVAS_SEARCH_TAB, DEFAULT_SIDEBAR } from '../constants';
// import { clearElementsForLocalStorage } from '../utils/element-utils';
import { updateBrowserStateVersion } from './tab-sync';
import { debounce } from '../../../utils/utils';
import EventBus from '../../../components/common/event-bus';

export const saveDataStateToLocalStorage = (docUuid, elements, appState) => {
  try {
    const _appState = clearAppStateForLocalStorage(appState);
    if (_appState.openSidebar?.name === DEFAULT_SIDEBAR.name && _appState.openSidebar.tab === CANVAS_SEARCH_TAB) {
      _appState.openSidebar = null;
    }
    const elementsKey = `${STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS}_${docUuid}`;
    const stateKey = `${STORAGE_KEYS.LOCAL_STORAGE_APP_STATE}_${docUuid}`;
    localStorage.setItem(elementsKey, JSON.stringify(elements));
    localStorage.setItem(stateKey, JSON.stringify(_appState));
    updateBrowserStateVersion(STORAGE_KEYS.VERSION_DATA_STATE);
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

export const saveToLocalStorage = debounce((docUuid, elements, appState) => {
  saveDataStateToLocalStorage(docUuid, elements, appState);
  const eventBus = EventBus.getInstance();
  const lastSavedAt = new Date().getTime();
  eventBus.dispatch('saved', lastSavedAt);
}, SAVE_TO_LOCAL_STORAGE_TIMEOUT);

export const importFromLocalStorage = (docUuid) => {
  let savedElements = null;
  let savedState = null;
  const elementsKey = `${STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS}_${docUuid}`;
  const stateKey = `${STORAGE_KEYS.LOCAL_STORAGE_APP_STATE}_${docUuid}`;
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
    const elementsKey = `${STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS}_${docUuid}`;
    const elements = localStorage.getItem(elementsKey);
    const elementsSize = elements?.length || 0;
    return elementsSize;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return 0;
  }
};

export const getTotalStorageSize = (docUuid) => {
  try {
    const stateKey = `${STORAGE_KEYS.LOCAL_STORAGE_APP_STATE}_${docUuid}`;
    const appState = localStorage.getItem(stateKey);
    // const collab = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_COLLAB);

    const appStateSize = appState?.length || 0;
    // const collabSize = collab?.length || 0;

    return appStateSize + getElementsStorageSize(docUuid);
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return 0;
  }
};

