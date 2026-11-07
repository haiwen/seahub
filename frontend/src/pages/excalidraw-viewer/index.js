import React, { useState, useEffect } from 'react';
import { gettext } from '@/utils/constants';
import editorApi from './editor-api';
import SimpleViewer from './simple-viewer';

import './index.css';

const ExcaliViewer = () => {
  const [fileContent, setFileContent] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isInSdoc, setIsInSdoc] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isResize, setIsResize] = useState(false);
  const [imageFiles, setImageFiles] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    editorApi.getExdrawContent().then(res => {
      const isSharedEmbed = Boolean(window.shared.pageOptions.sharedExdrawSceneUrl);
      const scene = isSharedEmbed ? res.data.scene : res.data;
      if (scene?.appState?.collaborators && !Array.isArray(scene.appState.collaborators)) {
        // collaborators.forEach is not a function
        scene.appState.collaborators = [];
      }
      setImageFiles(isSharedEmbed ? res.data.images : null);
      setFileContent(scene);
      setIsFetching(false);
    }).catch(() => {
      setError(true);
      setIsFetching(false);
    });
  }, []);

  // Use postMessage to communicate with parent Sdoc container
  useEffect(() => {
    window.parent.postMessage({ type: 'checkSdocParent' }, '*');

    const handleMessage = (event) => {
      if (event.data?.type === 'checkSdocParentResult') {
        if (event.data.isInSdoc === true && !isInSdoc) {
          setIsInSdoc(true);
        }
        if (event.data.isFullScreen === true && !isFullScreen) {
          setIsFullScreen(true);
        }
      }

      if (event.data?.type === 'resizeWindowWidth') {
        if (event.data.isResize === true) {
          setIsResize(prev => !prev);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  if (error) return <div role="alert">{gettext('Unable to view file')}</div>;

  return (
    <SimpleViewer
      isFetching={isFetching}
      sceneContent={fileContent}
      imageFiles={imageFiles}
      isInSdoc={isInSdoc}
      isFullScreen={isFullScreen}
      isResizeSdocPageWidth={isResize}
    />
  );
};

export default ExcaliViewer;
