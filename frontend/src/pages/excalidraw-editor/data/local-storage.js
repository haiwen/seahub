import { clearAppStateForLocalStorage, getDefaultAppState } from '../utils/app-state-utils';
import { SAVE_TO_LOCAL_STORAGE_TIMEOUT, STORAGE_KEYS, CANVAS_SEARCH_TAB, DEFAULT_SIDEBAR } from '../constants';
import { clearElementsForLocalStorage } from '../utils/element-utils';
import { updateBrowserStateVersion } from './tab-sync';
import { debounce } from '../../../utils/utils';

export const saveDataStateToLocalStorage = (elements, appState) => {
  try {
    const _appState = clearAppStateForLocalStorage(appState);
    if (_appState.openSidebar?.name === DEFAULT_SIDEBAR.name && _appState.openSidebar.tab === CANVAS_SEARCH_TAB) {
      _appState.openSidebar = null;
    }
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS, JSON.stringify(clearElementsForLocalStorage(elements)));
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_APP_STATE, JSON.stringify(_appState));
    updateBrowserStateVersion(STORAGE_KEYS.VERSION_DATA_STATE);
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

export const saveToLocalStorage = debounce((elements, appState) => {
  saveDataStateToLocalStorage(elements, appState);
}, SAVE_TO_LOCAL_STORAGE_TIMEOUT);

export const importFromLocalStorage = () => {
  let savedElements = null;
  let savedState = null;
  try {
    savedElements = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS);
    savedState = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_APP_STATE);
  }
  catch (error) {
    // Unable to access localStorage
    // eslint-disable-next-line no-console
    console.error(error);
  }
  let elements = [];
  if (savedElements) {
    try {
      elements = clearElementsForLocalStorage(JSON.parse(savedElements));
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

export const getElementsStorageSize = () => {
  try {
    const elements = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS);
    const elementsSize = elements?.length || 0;
    return elementsSize;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return 0;
  }
};

export const getTotalStorageSize = () => {
  try {
    const appState = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_APP_STATE);
    // const collab = localStorage.getItem(STORAGE_KEYS.LOCAL_STORAGE_COLLAB);

    const appStateSize = appState?.length || 0;
    // const collabSize = collab?.length || 0;

    return appStateSize + getElementsStorageSize();
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return 0;
  }
};

