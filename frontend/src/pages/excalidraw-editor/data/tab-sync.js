import { STORAGE_KEYS } from '../constants';

const LOCAL_STATE_VERSIONS = {
  [STORAGE_KEYS.VERSION_DATA_STATE]: -1,
  [STORAGE_KEYS.VERSION_FILES]: -1,
};

export const isBrowserStorageStateNewer = (type) => {
  const storageTimestamp = JSON.parse(localStorage.getItem(type) || '-1');
  return storageTimestamp > LOCAL_STATE_VERSIONS[type];
};

export const updateBrowserStateVersion = (type) => {
  const timestamp = Date.now();
  try {
    localStorage.setItem(type, JSON.stringify(timestamp));
    LOCAL_STATE_VERSIONS[type] = timestamp;
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error('error while updating browser state version', error);
  }
};

export const resetBrowserStateVersions = () => {
  try {
    for (const key of Object.keys(LOCAL_STATE_VERSIONS)) {
      const timestamp = -1;
      localStorage.setItem(key, JSON.stringify(timestamp));
      LOCAL_STATE_VERSIONS[key] = timestamp;
    }
  }
  catch (error) {
    // eslint-disable-next-line no-console
    console.error('error while resetting browser state verison', error);
  }
};

