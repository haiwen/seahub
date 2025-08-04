import React, { useState, useEffect } from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import classNames from 'classnames';
import CodeMirrorLoading from '../../components/code-mirror-loading';
import { langList } from './constants';

import '@excalidraw/excalidraw/index.css';

const SimpleViewer = ({ sceneContent = null, isFetching, isInSdoc, isResizeSdocPageWidth }) => {
  // eslint-disable-next-line
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  const UIOptions = {
    canvasActions: {
      saveToActiveFile: false,
      LoadScene: false
    },
    tools: { image: false },
  };

  // Fit iframe inner element size within sdoc-editor
  useEffect(() => {
    if (excalidrawAPI && isInSdoc) {
      setTimeout(() => {
        excalidrawAPI.scrollToContent(sceneContent.elements, { fitToViewport: true, viewportZoomFactor: 0.9 });
      }, 100);
    }
  }, [excalidrawAPI, isResizeSdocPageWidth, isInSdoc]);

  if (isFetching) {
    return (
      <div className='excali-container'>
        <CodeMirrorLoading />
      </div>
    );
  }

  return (
    <>
      <div className={classNames('excali-container', { 'in-sdoc': isInSdoc })} style={{ height: '100vh', width: '100vw' }}>
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
