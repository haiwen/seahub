import React, { useState, useEffect } from 'react';
import SimpleEditor from './editor';
import { updateAppIcon } from './utils/common-utils';
import context from './context';

import './index.css';

const ExcaliEditor = () => {
  const [isFetching, setIsFetching] = useState(true);
  const [fileContent, setFileContent] = useState(null);

  // saved file interval
  useEffect(() => {
    updateAppIcon();
  }, []);

  useEffect(() => {
    async function loadFileContent() {
      await context.initSettings();
      context.getSceneContent().then(res => {
        setFileContent(res.data);
        setIsFetching(false);
      });
    }
    loadFileContent();
  }, []);

  return (
    <div className="file-view-content flex-1 p-0 border-0">
      <SimpleEditor isFetching={isFetching} sceneContent={fileContent}/>
    </div>
  );
};

export default ExcaliEditor;
