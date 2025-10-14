import React, { useState, useEffect } from 'react';
import SimpleViewer from './simple-viewer';
import editorApi from './editor-api';

import './index.css';

const ExcaliViewer = () => {
  const [fileContent, setFileContent] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isInSdoc, setIsInSdoc] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isResize, setIsResize] = useState(false);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = isInSdoc ? await editorApi.getFileContent() : await editorApi.getExdrawContent();

        const data = res.data;
        if (data?.appState?.collaborators && !Array.isArray(data.appState.collaborators)) {
          // collaborators.forEach is not a function
          data['appState']['collaborators'] = [];
        }

        setFileContent(data);
        setIsFetching(false);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [isInSdoc]);

  return (
    <SimpleViewer
      isFetching={isFetching}
      sceneContent={fileContent}
      isInSdoc={isInSdoc}
      isFullScreen={isFullScreen}
      isResizeSdocPageWidth={isResize}
    />
  );
};

export default ExcaliViewer;
