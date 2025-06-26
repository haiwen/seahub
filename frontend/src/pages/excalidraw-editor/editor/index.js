import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Excalidraw, MainMenu, useHandleLibrary } from '@excalidraw/excalidraw';
import Loading from '../../../components/loading';
import { langList } from '../constants';
import { LibraryIndexedDBAdapter } from './library-adapter';
import SocketManager from '../cllab/socket-manager';
import context from '../context';

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

const SimpleEditor = ({ sceneContent = null, isFetching }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const socketRef = useRef(null);

  useHandleLibrary({ excalidrawAPI, adapter: LibraryIndexedDBAdapter });

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
