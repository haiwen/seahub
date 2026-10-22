import { getColorScheme } from '@/utils/utils';

const listeners = new Set();
let query;
let users = 0;
let manualMode;

const readManualMode = () => {
  try {
    const value = localStorage.getItem('sf_color_mode');
    return value === 'light' || value === 'dark' ? value : null;
  } catch (error) {
    return null;
  }
};

export const getEffectiveColorMode = () => manualMode || getColorScheme();

const applyColorMode = () => {
  const mode = getEffectiveColorMode();
  document.body.setAttribute('data-bs-theme', mode);
  listeners.forEach(listener => listener(mode));
};

const onSystemChange = () => {
  if (!manualMode) applyColorMode();
};

const onStorage = (event) => {
  if (event.storageArea !== localStorage || (event.key !== null && event.key !== 'sf_color_mode')) return;
  manualMode = readManualMode();
  applyColorMode();
};

export const subscribeColorMode = (listener) => {
  if (users++ === 0) {
    manualMode = readManualMode();
    query = window.matchMedia('(prefers-color-scheme: dark)');
    if (query.addEventListener) {
      query.addEventListener('change', onSystemChange);
    } else {
      query.addListener(onSystemChange);
    }
    window.addEventListener('storage', onStorage);
  }
  listeners.add(listener);
  applyColorMode();
  return () => {
    listeners.delete(listener);
    if (--users === 0) {
      if (query.removeEventListener) {
        query.removeEventListener('change', onSystemChange);
      } else {
        query.removeListener(onSystemChange);
      }
      window.removeEventListener('storage', onStorage);
    }
  };
};

export const setColorMode = (mode) => {
  if (mode !== 'light' && mode !== 'dark') return;
  manualMode = mode;
  try {
    localStorage.setItem('sf_color_mode', mode);
  } catch (error) {
    // Keep the selection for this page when browser storage is unavailable.
  }
  applyColorMode();
};
