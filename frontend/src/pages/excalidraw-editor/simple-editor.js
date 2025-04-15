import React, { useEffect, useRef, useState } from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import isHotkey from 'is-hotkey';
import CodeMirrorLoading from '../../components/code-mirror-loading';
import { langList } from './constants';

import '@excalidraw/excalidraw/index.css';

const SimpleEditor = ({
  sceneContent = null,
  onChangeContent,
  onSaveContent,
  isFetching
}) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const prevElementsRef = useRef([]);
  const UIOptions = {
    canvasActions: {
      saveToActiveFile: false,
      LoadScene: false
    },
    tools: { image: false },
  };
  const handleChange = () => {
    const elements = excalidrawAPI.getSceneElements();
    if (hasChanged(elements, prevElementsRef.current)) {
      onChangeContent(elements);
    }
    prevElementsRef.current = elements;
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

  const hasChanged = (prev, current) => {
    if (prev.length !== current.length) return true;

    return current.some((element, index) => {
      return element.version !== prev[index]?.version;
    });
  };

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
          initialData={sceneContent}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handleChange}
          UIOptions={UIOptions}
          langCode={langList[window.app.config.lang] || 'en'}
          renderTopRightUI={() => {
            return (
              <button
                style={{
                  background: '#70b1ec',
                  border: 'none',
                  color: '#fff',
                  width: 'max-content',
                  fontWeight: 'bold',
                }}
                onClick={() => onSaveContent(excalidrawAPI.getSceneElements())}
              >
                Click me
              </button>
            );
          }}
        >
          <MainMenu>
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.LiveCollaborationTrigger
              // isCollaborating={isCollaborating}
              // onSelect={() => onCollabDialogOpen()}
            />
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
