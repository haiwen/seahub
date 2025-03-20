import React, { useEffect, useState } from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import isHotkey from 'is-hotkey';
import CodeMirrorLoading from '../../components/code-mirror-loading';

import '@excalidraw/excalidraw/index.css';


const SimpleEditor = ({ sceneContent, onChangeContent, onSaveContent, isFetching }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const UIOptions = {
    canvasActions: {
      saveToActiveFile: false,
      LoadScene: false
    },
    tools: { image: false },
  };

  useEffect(() => {
    if (excalidrawAPI && sceneContent) {
      excalidrawAPI.updateScene(sceneContent);
    }
  }, [excalidrawAPI, sceneContent]);

  const handleChange = (newElements, newAppState) => {
    onChangeContent?.(newElements, newAppState);
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
        <CodeMirrorLoading />
      </div>
    );
  }

  return (
    <>
      <div className='excali-container' style={{ height: '100vh', width: '100vw' }}>
        <Excalidraw
          initialData={ sceneContent }
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handleChange}
          UIOptions={UIOptions}
        >
          <MainMenu>
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.SearchMenu />
            <MainMenu.DefaultItems.Help />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.ToggleTheme />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
        </Excalidraw>
      </div>
    </>
  );
};

export default SimpleEditor;
