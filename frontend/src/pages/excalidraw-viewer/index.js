import React, { useState, useEffect } from 'react';
import SimpleViewer from './simple-viewer';
import editorApi from './editor-api';

const ExcaliViewer = () => {
  const [fileContent, setFileContent] = useState(null);
  const [isFetching, setIsFetching] = useState(true);

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


  return (
    <SimpleViewer
      isFetching={isFetching}
      sceneContent={fileContent}
    />
  );
};

export default ExcaliViewer;
