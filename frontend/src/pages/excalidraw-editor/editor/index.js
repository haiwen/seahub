import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CaptureUpdateAction, Excalidraw, MainMenu, newElementWith, reconcileElements, restoreElements, useHandleLibrary } from '@excalidraw/excalidraw';
import { langList } from '../constants';
import { LibraryIndexedDBAdapter } from './library-adapter';
import context from '../context';
import TipMessage from './tip-message';
import { importFromLocalStorage } from '../data/local-storage';
import { resolvablePromise, updateStaleImageStatuses } from '../utils/exdraw-utils';
import { getFilename, isInitializedImageElement } from '../utils/element-utils';
import LocalData from '../data/local-data';
import SocketManager from '../socket/socket-manager';
import { loadFromServerStorage } from '../data/server-storage';

import '@excalidraw/excalidraw/index.css';

const { docUuid } = window.app.pageOptions;
window.name = `${docUuid}`;
const UIOptions = {
  canvasActions: {
    saveToActiveFile: false,
    LoadScene: false
  },
  tools: { image: true },
};

const initializeScene = async () => {
  // load local data from localstorage
  const docUuid = context.getDocUuid();
  const localDataState = importFromLocalStorage(docUuid); // {appState, elements}

  let data = null;
  // load remote data from server
  const scene = await loadFromServerStorage();
  const { elements } = scene;
  const restoredRemoteElements = restoreElements(elements, null);
  const reconciledElements = reconcileElements(
    localDataState.elements,
    restoredRemoteElements,
    localDataState.appState,
  );
  data = {
    elements: reconciledElements,
    appState: null,
    version: scene.version,
  };

  return {
    scene: data
  };
};

const SimpleEditor = () => {

  const initialStatePromiseRef = useRef({ promise: null });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise = resolvablePromise();
  }

  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  useHandleLibrary({ excalidrawAPI, adapter: LibraryIndexedDBAdapter });

  useEffect(() => {
    if (!excalidrawAPI) return;

    const loadImages = (data, isInitialLoad) => {
      if (!data.scene) return;
      const socketManager = SocketManager.getInstance();
      if (socketManager) {
        if (data.scene.elements) {
          socketManager.fetchImageFilesFromServer({
            elements: data.scene.elements,
            forceFetchFiles: true,
          }).then(({ loadedFiles, erroredFiles }) => {
            excalidrawAPI.addFiles(loadedFiles);
            updateStaleImageStatuses({
              excalidrawAPI,
              erroredFiles,
              elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
            });
          });
        }
      } else {
        const fileIds =
          data.scene.elements?.reduce((acc, element) => {
            if (isInitializedImageElement(element)) {
              return acc.concat(element.fileId);
            }
            return acc;
          }, []) || [];
        if (isInitialLoad && fileIds.length) {
          LocalData.fileStorage
            .getFiles(fileIds)
            .then(({ loadedFiles, erroredFiles }) => {
              if (loadedFiles.length) {
                excalidrawAPI.addFiles(loadedFiles);
              }
              updateStaleImageStatuses({
                excalidrawAPI,
                erroredFiles,
                elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
              });
            });

          LocalData.fileStorage.clearObsoleteFiles({ currentFileIds: fileIds });
        }
      }
    };

    context.initSettings().then(() => {
      const config = context.getSettings();
      initializeScene().then(async (data) => {
        // init socket
        SocketManager.getInstance(excalidrawAPI, data.scene, config);
        loadImages(data, /* isInitialLoad */true);
        initialStatePromiseRef.current.promise.resolve(data.scene);
      });
    });

  }, [excalidrawAPI]);

  const handleChange = useCallback((elements, appState, files) => {
    const socketManager = SocketManager.getInstance();
    socketManager.syncLocalElementsToOthers(elements);

    const docUuid = context.getDocUuid();
    if (!LocalData.isSavePaused()) {
      LocalData.save(docUuid, elements, appState, files, () => {
        if (excalidrawAPI) {
          let didChange = false;
          const oldElements = excalidrawAPI.getSceneElementsIncludingDeleted();
          const newElements = oldElements.map(element => {
            if (LocalData.fileStorage.shouldUpdateImageElementStatus(element)) {
              const filename = getFilename(element.fileId, files[element.fileId]);
              const newElement = newElementWith(element, { status: 'saved', filename });
              if (newElement !== element) {
                didChange = true;
              }
              return newElement;
            }
            return element;
          });
          if (didChange) {
            excalidrawAPI.updateScene({
              elements: newElements,
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          }
        }
      });
    }
  }, [excalidrawAPI]);

  const handlePointerUpdate = useCallback((payload) => {
    const socketManager = SocketManager.getInstance();
    socketManager.syncMouseLocationToOthers(payload);
  }, []);

  useEffect(() => {
    const beforeUnload = (event) => {
      // event.preventDefault();
      LocalData.flushSave();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);

  return (
    <div className='excali-container'>
      <div className='excali-tip-message'>
        <TipMessage />
      </div>
      <Excalidraw
        initialData={initialStatePromiseRef.current.promise}
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        UIOptions={UIOptions}
        langCode={langList[window.app.config.lang] || 'en'}
      >
        <MainMenu>
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
