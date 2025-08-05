export const SAVE_INTERVAL_TIME = 3 * 60 * 1000;

export const langList = {
  'zh-cn': 'zh-CN',
  'en': 'en',
  'zh-tw': 'zh-TW',
  'ru': 'ru-RU',
  'it': 'it-IT',
  'fr': 'fr-FR',
  'es-ms': 'en',
  'es-ar': 'en',
  'es': 'es-ES',
  'de': 'de-DE',
  'cs': 'cs-CZ',
};

export const STORAGE_KEYS = {
  LOCAL_STORAGE_ELEMENTS: 'excalidraw',
  LOCAL_STORAGE_APP_STATE: 'excalidraw-state',
  IDB_LIBRARY: 'excalidraw-library',
  VERSION_DATA_STATE: 'version-dataState',
  VERSION_FILES: 'version-files',
};

export const DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 1 day
export const SYNC_FULL_SCENE_INTERVAL_MS = 20000;
export const CURSOR_SYNC_TIMEOUT = 33; // ~30fps
export const SAVE_TO_LOCAL_STORAGE_TIMEOUT = 300;
export const INITIAL_SCENE_UPDATE_TIMEOUT = 5000;
export const FILE_UPLOAD_TIMEOUT = 300;
export const LOAD_IMAGES_TIMEOUT = 500;

export const LIBRARY_SIDEBAR_TAB = 'library';
export const CANVAS_SEARCH_TAB = 'search';

export const DEFAULT_SIDEBAR = {
  name: 'default',
  defaultTab: LIBRARY_SIDEBAR_TAB,
};

export const WS_SUBTYPES = {
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  INIT: 'SCENE_INIT',
  UPDATE: 'SCENE_UPDATE',
  MOUSE_LOCATION: 'MOUSE_LOCATION',
  IDLE_STATUS: 'IDLE_STATUS',
  USER_VISIBLE_SCENE_BOUNDS: 'USER_VISIBLE_SCENE_BOUNDS',
};

export const MIMETYPE_TO_FILE_SUFFIX = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/x-icon': 'ico',
  'image/avif': 'avif',
  'image/jfif': 'jfif'
};

