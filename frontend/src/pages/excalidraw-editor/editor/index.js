import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Excalidraw, MainMenu, newElementWith, reconcileElements, restore, restoreElements, useHandleLibrary } from '@excalidraw/excalidraw';
import { langList } from '../constants';
import { LibraryIndexedDBAdapter } from './library-adapter';
import Collab from '../collaboration/collab';
import context from '../context';
import { importFromLocalStorage } from '../data/local-storage';
import { resolvablePromise, updateStaleImageStatuses } from '../utils/exdraw-utils';
import { getFilename, isInitializedImageElement } from '../utils/element-utils';
import LocalData from '../data/local-data';

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

const initializeScene = async (collabAPI) => {
  // load local data from localstorage
  const docUuid = context.getDocUuid();
  const localDataState = importFromLocalStorage(docUuid); // {appState, elements}

  let data = null;
  // load remote data from server
  if (collabAPI) {
    const scene = await collabAPI.startCollaboration();
    const { elements } = scene;
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
    scene: data
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

    const loadImages = (data, isInitialLoad) => {
      if (!data.scene) return;
      if (collabAPIRef.current && collabAPIRef.current.getIsCollaborating()) {
        if (data.scene.elements) {
          collabAPIRef.current.fetchImageFilesFromServer({
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
      const collabAPI = new Collab(excalidrawAPI, config);
      collabAPIRef.current = collabAPI;

      initializeScene(collabAPI).then(async (data) => {
        loadImages(data, /* isInitialLoad */true);
        initialStatePromiseRef.current.promise.resolve(data.scene);
      });
    });

  }, [excalidrawAPI]);

  const handleChange = useCallback((elements, appState, files) => {
    if (collabAPIRef.current) {
      collabAPIRef.current.syncElements(elements);
    }

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
    if (!collabAPIRef.current) return;
    collabAPIRef.current.syncPointer(payload);
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
