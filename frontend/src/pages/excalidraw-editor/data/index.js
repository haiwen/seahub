import { isInvisiblySmallElement, restore } from '@excalidraw/excalidraw';
import { DELETED_ELEMENT_TIMEOUT } from '../constants';
import { loadFromServerStorage } from './server-storage';

// Supply local state even if importing from backend to ensure we restore
// localStorage user settings which we do not persist on server.
// Non-optional so we don't forget to pass it even if `undefined`.
export const loadScene = async (localDataState) => {
  const serverData = await loadFromServerStorage();
  const data = restore(serverData, localDataState?.appState, localDataState?.elements, { repairBindings: true, refreshDimensions: false });
  return {
    elements: data.elements,
    appState: data.appState,
    // note: this will always be empty because we're not storing files
    // in the scene database/localStorage, and instead fetch them async
    // from a different database
    files: data.files,
  };
};

export const isSyncableElement = (element) => {
  if (element.isDeleted) {
    if (element.updated > Date.now() - DELETED_ELEMENT_TIMEOUT) {
      return true;
    }
    return false;
  }
  return !isInvisiblySmallElement(element);
};


export const getSyncableElements = (elements) => {
  return elements.filter((element) => isSyncableElement(element));
};
