import React, { useEffect, useRef, useState } from 'react';
import { Excalidraw, MainMenu, useHandleLibrary } from '@excalidraw/excalidraw';
import isHotkey from 'is-hotkey';
import Loading from '../../../components/loading';
import { langList } from '../constants';
import { LibraryIndexedDBAdapter } from '../library-adapter';

import '@excalidraw/excalidraw/index.css';

const UIOptions = {
  canvasActions: {
    saveToActiveFile: false,
    LoadScene: false
  },
  tools: { image: false },
};

const hasChanged = (elements, oldElements) => {
  if (elements.length !== oldElements.length) return true;

  return elements.some((element, index) => {
    return element.version !== oldElements[index]?.version;
  });
};

const SimpleEditor = ({ sceneContent = null, onChangeContent, onSaveContent, isFetching }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const prevElementsRef = useRef();

  useHandleLibrary({ excalidrawAPI, adapter: LibraryIndexedDBAdapter });

  const handleChange = () => {
    if (!prevElementsRef.current) {
      prevElementsRef.current = sceneContent?.elements || [];
    }

    const elements = excalidrawAPI.getSceneElements();
    if (hasChanged(elements, prevElementsRef.current)) {
      onChangeContent(elements);
      prevElementsRef.current = elements;
    }

  };

  useEffect(() => {
    const handleHotkeySave = (event) => {
      if (isHotkey('mod+s', event)) {
        event.preventDefault();
        onSaveContent(excalidrawAPI.getSceneElements());
      }
    };

    document.addEventListener('keydown', handleHotkeySave, true);
    return () => {
      document.removeEventListener('keydown', handleHotkeySave, true);
    };
  }, [excalidrawAPI, onSaveContent]);

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
