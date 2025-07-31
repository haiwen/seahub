import React, { useState, useEffect } from 'react';
import SimpleViewer from './simple-viewer';
import editorApi from './editor-api';

import './index.css';

const ExcaliViewer = () => {
  const [fileContent, setFileContent] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isInSdoc, setIsInSdoc] = useState(false);
  const [isResize, setIsResize] = useState(false);

  useEffect(() => {
    editorApi.getFileContent().then(res => {
      if (res.data?.appState?.collaborators && !Array.isArray(res.data.appState.collaborators)) {
        // collaborators.forEach is not a function
        res.data['appState']['collaborators'] = [];
      }
      setFileContent(res.data);
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


  return (
    <SimpleViewer
      isFetching={isFetching}
      sceneContent={fileContent}
      isInSdoc={isInSdoc}
      isResizeSdocPageWidth={isResize}
    />
  );
};

export default ExcaliViewer;
