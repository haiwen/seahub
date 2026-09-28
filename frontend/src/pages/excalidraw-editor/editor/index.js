import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CaptureUpdateAction, Excalidraw, MainMenu, newElementWith, reconcileElements, restoreElements, useHandleLibrary } from '@excalidraw/excalidraw';
import isHotkey from 'is-hotkey';
import isUrl from 'is-url';
import { gettext } from '@/utils/constants';
import { langList } from '../constants';
import context from '../context';
import { getSyncableElements } from '../data';
import LocalData from '../data/local-data';
import { importFromLocalStorage } from '../data/local-storage';
import { loadFromServerStorage } from '../data/server-storage';
import SelectSdocFileDialog from '../extension/select-image-dialog';
import SocketManager from '../socket/socket-manager';
import { getFilename, isInitializedImageElement } from '../utils/element-utils';
import { generateImageElement, resolvablePromise, updateStaleImageStatuses } from '../utils/exdraw-utils';
import { LibraryIndexedDBAdapter } from './library-adapter';
import TipMessage from './tip-message';

import '@excalidraw/excalidraw/index.css';

const LinkImageIcon = (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 8h.01" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 20H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m4 15 4-4c.928-.893 2.072-.893 3 0l4 4" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m14 14 1-1c.617-.593 1.328-.793 2.009-.598" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 22v-6M16 19l3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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

  // load remote data from server
  const scene = await loadFromServerStorage();
  const remoteElements = Array.isArray(scene?.elements) ? scene.elements : [];
  const remoteVersion = Number.isFinite(scene?.version) ? scene.version : 0;
  const restoredRemoteElements = restoreElements(remoteElements, null);
  const reconciledElements = reconcileElements(
    localDataState.elements || [],
    restoredRemoteElements,
    localDataState.appState,
  );
  return {
    scene: {
      elements: reconciledElements,
      appState: localDataState.appState,
      version: remoteVersion,
    },
    remoteElements,
  };
};

const SimpleEditor = ({ isSharedView = false }) => {

  const filePermRef = useRef(null);
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
            if (element.dataURL && isUrl(element.dataURL)) return acc;
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

    const config = context.getExdrawConfig();
    initializeScene().then(async (data) => {
      // init socket
      const socketManager = SocketManager.getInstance(excalidrawAPI, data.scene, config);
      // Track last synced version with remote scene so local offline edits can be auto-synced.
      socketManager.setLastBroadcastedOrReceivedSceneVersion(data.remoteElements);
      if (socketManager.isNeedToSync(data.scene.elements)) {
        socketManager.syncLocalElementsToOthers(data.scene.elements);
      }
      loadImages(data, /* isInitialLoad */true);
      initialStatePromiseRef.current.promise.resolve(data.scene);
    });

  }, [excalidrawAPI]);

  useEffect(() => {
    filePermRef.current = context.getSetting('filePerm');
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
    if (filePermRef.current === 'r') return;
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
    if (filePermRef.current === 'r') return;
    const socketManager = SocketManager.getInstance();
    socketManager.syncMouseLocationToOthers(payload);
  }, []);

  const beforeUnload = useCallback((event) => {
    LocalData.flushSave();
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

  const onCustomImageDialogToggle = useCallback(() => {
    setIsShowImageDialog(!isShowImageDialog);
  }, [isShowImageDialog]);

  const insertCustomImage = useCallback(async (filePath) => {
    const oldElements = excalidrawAPI.getSceneElementsIncludingDeleted();
    const newImage = generateImageElement(filePath);
    // add image elements
    excalidrawAPI.updateScene({
      elements: [...oldElements, newImage],
      captureUpdate: CaptureUpdateAction.NEVER,
    });

    // add image content to canvas
    const socketManager = SocketManager.getInstance();
    socketManager.loadImageFiles();

  }, [excalidrawAPI]);

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
        viewModeEnabled={filePermRef.current === 'r'}
      >
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          {!isSharedView && (
            <MainMenu.Item icon={LinkImageIcon} onClick={onCustomImageDialogToggle}>
              {gettext('Link image')}
            </MainMenu.Item>
          )}
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
      <SelectSdocFileDialog isOpen={isShowImageDialog} insertImage={insertCustomImage} closeDialog={onCustomImageDialogToggle}/>
    </div>
  );
};

export default SimpleEditor;
