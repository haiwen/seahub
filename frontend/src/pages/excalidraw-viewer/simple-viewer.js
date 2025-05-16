import React, { useState } from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import CodeMirrorLoading from '../../components/code-mirror-loading';
import { langList } from './constants';

import '@excalidraw/excalidraw/index.css';

const SimpleViewer = ({ sceneContent = null, isFetching }) => {
  // eslint-disable-next-line
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const UIOptions = {
    canvasActions: {
      saveToActiveFile: false,
      LoadScene: false
    },
    tools: { image: false },
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
          UIOptions={UIOptions}
          langCode={langList[window.app.config.lang] || 'en'}
          viewModeEnabled={true}
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
    </>
  );
};

export default SimpleViewer;
