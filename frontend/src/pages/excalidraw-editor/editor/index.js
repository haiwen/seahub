import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Excalidraw, MainMenu, reconcileElements, restore, restoreElements, useHandleLibrary } from '@excalidraw/excalidraw';
import { langList } from '../constants';
import { LibraryIndexedDBAdapter } from './library-adapter';
import Collab from '../collaboration/collab';
import context from '../context';
import { importFromLocalStorage, saveToLocalStorage } from '../data/local-storage';
import { resolvablePromise } from '../utils/exdraw-utils';

import '@excalidraw/excalidraw/index.css';

const { docUuid } = window.app.pageOptions;
window.name = `${docUuid}`;

const UIOptions = {
  canvasActions: {
    saveToActiveFile: false,
    LoadScene: false
  },
  tools: { image: false },
};

const initializeScene = async (collabAPI) => {
  // load local data from localstorage
  const docUuid = context.getDocUuid();
  const localDataState = importFromLocalStorage(docUuid); // {appState, elements}

  let data = null;
  // load remote data from server
  if (collabAPI) {
    const screen = await collabAPI.startCollaboration();
    const { elements } = screen;
    const restoredRemoteElements = restoreElements(elements, null);

    const reconciledElements = reconcileElements(
      localDataState.elements,
      restoredRemoteElements,
      localDataState.appState,
    );
    data = {
      elements: reconciledElements,
      appState: localDataState.appState,
    };
  } else {
    data = restore(localDataState || null, null, null, {
      repairBindings: true,
    });
  }

  return {
    screen: data
  };
};

const SimpleEditor = () => {
  const collabAPIRef = useRef(null);
  const initialStatePromiseRef = useRef({ promise: null });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise = resolvablePromise();
  }

  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  useHandleLibrary({ excalidrawAPI, adapter: LibraryIndexedDBAdapter });

  useEffect(() => {
    if (!excalidrawAPI) return;

    context.initSettings().then(() => {
      const config = context.getSettings();
      const collabAPI = new Collab(excalidrawAPI, config);
      collabAPIRef.current = collabAPI;

      initializeScene(collabAPI).then(async (data) => {
        initialStatePromiseRef.current.promise.resolve(data.screen);
      });
    });

  }, [excalidrawAPI]);

  const handleChange = useCallback((elements, appState, files) => {
    if (!collabAPIRef.current) return;
    collabAPIRef.current.syncElements(elements);
    const docUuid = context.getDocUuid();

    saveToLocalStorage(docUuid, elements, appState);
  }, []);

  const handlePointerUpdate = useCallback((payload) => {
    if (!collabAPIRef.current) return;
    collabAPIRef.current.syncPointer(payload);
  }, []);

  return (
    <div className='excali-container' style={{ height: '100%', width: '100%' }}>
      <Excalidraw
        initialData={initialStatePromiseRef.current.promise}
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        UIOptions={UIOptions}
        langCode={langList[window.app.config.lang] || 'en'}
      >
        <MainMenu>
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
    </div>
  );
};

export default SimpleEditor;
