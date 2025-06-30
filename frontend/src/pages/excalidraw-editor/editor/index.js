import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Excalidraw, MainMenu, reconcileElements, restore, useHandleLibrary } from '@excalidraw/excalidraw';
import Loading from '../../../components/loading';
import { langList } from '../constants';
import { LibraryIndexedDBAdapter } from './library-adapter';
import SocketManager from '../collaborator/socket-manager';
import context from '../context';
import { importFromLocalStorage, saveToLocalStorage } from '../data/local-storage';

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

const initializeScene = async (excalidrawAPI) => {
  // load local data from localstorage
  const localDataState = importFromLocalStorage(); // {appState, elements}

  await context.initSettings();
  let data = null;
  let elements = [];
  let version = 0;
  let last_modifier = '';
  // load remote data from server

  try {
    const response = await context.getSceneContent(); // { elements, version, last_modifier}
    const remoteScene = response.data;
    ({ elements, version, last_modifier } = remoteScene);
    data = {
      ...localDataState,
      elements: reconcileElements(
        elements || [],
        excalidrawAPI.getSceneElementsIncludingDeleted(),
        excalidrawAPI.getAppState(),
      ),
    };
    data = restore(
      { elements },
      localDataState?.appState,
      localDataState?.elements,
      { repairBindings: true, refreshDimensions: false },
    );

  } catch {
    data = restore(localDataState || null, null, null, {
      repairBindings: true,
    });
  }

  return {
    elements: data.elements,
    appState: data.appState,
    version: version,
    last_modifier,
  };
};

const SimpleEditor = () => {
  const socketRef = useRef(null);
  const [isFetching, setIsFetching] = useState(true);
  const [sceneContent, setSceneContent] = useState(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  useHandleLibrary({ excalidrawAPI, adapter: LibraryIndexedDBAdapter });

  useEffect(() => {
    async function loadFileContent() {
      const result = await initializeScene();
      setSceneContent(result);
      setIsFetching(false);
    }
    loadFileContent();
  }, []);

  useEffect(() => {
    if (!excalidrawAPI) return;

    const config = context.getSettings();
    const socketManager = SocketManager.getInstance(excalidrawAPI, sceneContent, config);
    socketRef.current = socketManager;

    return () => {
      socketManager.closeSocketConnect();
    };
  }, [excalidrawAPI, sceneContent]);

  const handleChange = useCallback((elements, appState, files) => {
    if (!socketRef.current) return;
    socketRef.current.syncElements(elements);

    saveToLocalStorage(elements, appState);
  }, []);

  const handlePointerUpdate = useCallback((payload) => {
    if (!socketRef.current) return;
    socketRef.current.syncPointer(payload);
  }, []);

  if (isFetching) {
    return (
      <div className='excali-container'>
        <Loading />
      </div>
    );
  }

  return (
    <div className='excali-container' style={{ height: '100%', width: '100%' }}>
      <Excalidraw
        initialData={sceneContent}
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
