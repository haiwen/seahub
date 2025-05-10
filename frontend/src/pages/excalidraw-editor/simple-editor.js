import React, { useEffect, useRef, useState } from 'react';
import {
  CaptureUpdateAction,
  Excalidraw,
  getSceneVersion,
  MainMenu,
  reconcileElements,
  restoreElements
} from '@excalidraw/excalidraw';
import isHotkey from 'is-hotkey';
import CodeMirrorLoading from '../../components/code-mirror-loading';
import { langList } from './constants';
import { isSyncableElement } from './collab/utils';

import '@excalidraw/excalidraw/index.css';

const SimpleEditor = ({
  sceneContent = null,
  onChangeContent,
  onSaveContent,
  isFetching,
  exdrawClient
}) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const UIOptions = {
    canvasActions: {
      saveToActiveFile: false,
      LoadScene: true
    },
    tools: { image: false },
  };
  const lastBroadcastedOrReceivedSceneVersion = useRef(-1);

  const handleChange = (_elements) => {
    broadcastElements(_elements);
  };

  useEffect(() => {
    handleRemoteSceneUpdate(_reconcileElements(sceneContent?.elements));
  }, [sceneContent]);

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

  const handleRemoteSceneUpdate = (elements) => {
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({
        elements,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    }
  };

  const _reconcileElements = (remoteElements) => {
    if (!remoteElements || !excalidrawAPI) return;
    const localElements = getSceneElementsIncludingDeleted();
    const appState = excalidrawAPI.getAppState();
    const restoredRemoteElements = restoreElements(remoteElements, null);
    const reconciledElements = reconcileElements(
      localElements,
      restoredRemoteElements,
      appState
    );

    setLastBroadcastedOrReceivedSceneVersion(
      getSceneVersion(reconciledElements)
    );
    return reconciledElements;
  };

  const broadcastElements = (elements) => {
    if (
      getSceneVersion(elements) >
      lastBroadcastedOrReceivedSceneVersion.current
    ) {
      broadcastScene('SCENE_UPDATE', elements);
      lastBroadcastedOrReceivedSceneVersion.current = getSceneVersion(elements);
    }
  };

  const broadcastScene = (updateType, elements) => {
    const data = {
      type: updateType,
      payload: {
        elements: elements,
      },
    };
    exdrawClient.emit('update-document', JSON.stringify(data.payload.elements));
    onChangeContent({
      elements: data.payload.elements,
    });
  };

  const getSceneElementsIncludingDeleted = () => {
    return excalidrawAPI?.getSceneElementsIncludingDeleted();
  };

  const setLastBroadcastedOrReceivedSceneVersion = (version) => {
    lastBroadcastedOrReceivedSceneVersion.current = version;
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
                Save me
              </button>
            );
          }}
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

export default SimpleEditor;
