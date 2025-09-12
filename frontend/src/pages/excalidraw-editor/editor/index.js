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
import { getSyncableElements } from '../data';
import { gettext } from '../../../utils/constants';
import SelectSdocFileDialog from '../extension/select-image-dialog';
import isHotkey from 'is-hotkey';

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
  const [isShowImageDialog, setIsShowImageDialog] = useState(false);
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

  useEffect(() => {
    const handleHotkeySave = (event) => {
      if (isHotkey('mod+s', event)) {
        // delete cmd+s
        event.preventDefault();
      }
    };
    document.addEventListener('keydown', handleHotkeySave, true);
    return () => {
      document.removeEventListener('keydown', handleHotkeySave, true);
    };
  }, []);

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

  const beforeUnload = useCallback((event) => {
    const socketManager = SocketManager.getInstance();
    const fileManager = socketManager.fileManager;
    const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
    const syncableElements = getSyncableElements(elements);
    if (fileManager.shouldPreventUnload(syncableElements)) {
      // eslint-disable-next-line no-console
      console.warn('The uploaded image has not been saved yet. Please close this page later.');
      event.preventDefault();
      event.returnValue = gettext('The uploaded image has not been saved yet. Please close this page later.');
    }
    return;
  }, [excalidrawAPI]);

  useEffect(() => {
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [beforeUnload]);

  const closeDialog = useCallback(() => {
    setIsShowImageDialog(false);
  }, []);

  const handleCustomAction = () => {
    setIsShowImageDialog(true);
  };

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
          <button
            onClick={handleCustomAction}
            data-testid="upload_image"
            title='上传资料库图片'
            className='dropdown-menu-item dropdown-menu-item-base'
          >
            <div className="dropdown-menu-item__icon">
              {/* <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" class="" fill="none" stroke-width="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="1.5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="17" x2="12" y2="17.01"></line><path d="M12 13.5a1.5 1.5 0 0 1 1 -1.5a2.6 2.6 0 1 0 -3 -4"></path></g></svg> */}
            </div>
            <div class="dropdown-menu-item__text">上传资料库图片</div>
          </button>
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />

        </MainMenu>
      </Excalidraw>
      {isShowImageDialog && <SelectSdocFileDialog excalidrawAPI={excalidrawAPI} closeDialog={closeDialog}/>}
    </div>
  );
};

export default SimpleEditor;
