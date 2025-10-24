import React, { useState, useEffect } from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import classNames from 'classnames';
import { updateStaleImageStatuses } from '../excalidraw-editor/utils/exdraw-utils';
import CodeMirrorLoading from '../../components/code-mirror-loading';
import { isInitializedImageElement } from '../excalidraw-editor/utils/element-utils';
import { langList } from './constants';
import isUrl from 'is-url';

import '@excalidraw/excalidraw/index.css';

const { serviceURL } = window.app.config;
const { repoID, sharedToken } = window.shared.pageOptions;

export const getImageUrl = (fileName) => {
  const { serviceURL } = window.app.config;
  const { docUuid } = window.shared.pageOptions;
  const url = `${serviceURL}/api/v2.1/exdraw/download-image/${docUuid}/${fileName}`;
  return url;
};

const fetchImageFilesFromServer = (elements) => {
  const imageElements = elements.filter(element => {
    return isInitializedImageElement(element) && !element.isDeleted;
  });

  let loadedFiles = [];
  let erroredFiles = new Map();
  imageElements.forEach(element => {
    try {
      const { fileId, filename, dataURL } = element;
      let imageUrl = getImageUrl(filename);
      if (dataURL && isUrl(imageUrl)) {
        imageUrl = element.dataURL;
        const re = new RegExp(serviceURL + '/lib/' + repoID + '/file.*raw=1');
        if (re.test(dataURL)) {
          // get image path
          let index = dataURL.indexOf('/file');
          let index2 = dataURL.indexOf('?');
          imageUrl = dataURL.substring(index + 5, index2);
        }
        imageUrl = serviceURL + '/view-image-via-share-link/?token=' + sharedToken + '&path=' + imageUrl;
      }

      loadedFiles.push({
        mimeType: 'image/jpeg',
        id: fileId,
        dataURL: imageUrl,
        created: Date.now(),
        lastRetrieved: Date.now(),
      });
    } catch (error) {
      erroredFiles.set(element.id, true);
      // eslint-disable-next-line no-console
      console.error(error);
    }
  });
  return { loadedFiles, erroredFiles };
};

const SimpleViewer = ({ sceneContent = null, isFetching, isInSdoc, isFullScreen, isResizeSdocPageWidth }) => {
  // eslint-disable-next-line
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  const UIOptions = {
    canvasActions: {
      saveToActiveFile: false,
      LoadScene: false
    },
    tools: { image: false },
  };

  useEffect(() => {
    if (isFetching) return;
    if (!excalidrawAPI) return;
    const { elements } = sceneContent;
    const { loadedFiles, erroredFiles } = fetchImageFilesFromServer(elements);

    excalidrawAPI.addFiles(loadedFiles);
    updateStaleImageStatuses({
      excalidrawAPI,
      erroredFiles,
      elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
    });
  }, [excalidrawAPI, isFetching, sceneContent]);

  // Fit iframe inner element size within sdoc-editor
  useEffect(() => {
    if (excalidrawAPI && isFullScreen) {
      setTimeout(() => {
        excalidrawAPI.scrollToContent(sceneContent.elements, { fitToViewport: true });
      }, 100);
    }

    if (excalidrawAPI && isInSdoc) {
      setTimeout(() => {
        excalidrawAPI.scrollToContent(sceneContent.elements, { fitToViewport: true, viewportZoomFactor: 0.9 });
      }, 100);
    }
    // eslint-disable-next-line
  }, [excalidrawAPI, isResizeSdocPageWidth, isInSdoc, isFullScreen]);

  if (isFetching) {
    return (
      <div className='excali-container'>
        <CodeMirrorLoading />
      </div>
    );
  }

  return (
    <>
      <div className={classNames('excali-container', { 'in-sdoc': isInSdoc, 'full-screen': isFullScreen })} style={{ height: '100vh', width: '100vw' }}>
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
