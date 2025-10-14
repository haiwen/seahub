import React, { useEffect, useState } from 'react';
import SimpleEditor from './editor';
import Loading from '../../components/loading';
import { Utils } from '../../utils/utils';
import context from './context';
import editorApi from './api/editor-api';

import './index.css';

const { avatarURL, serviceURL } = window.app.config;
const { repoID, filePerm, docUuid, docName, docPath, excalidrawServerUrl } = window.app.pageOptions;
const userInfo = window.app.userInfo;

// used for support lib
window.name = `${docUuid}`;

window.excalidraw = {
  serviceURL,
  userInfo,
  avatarURL,
  repoID,
  filePerm,
  docUuid,
  docName,
  docPath,
  excalidrawServerUrl,
};

const updateAppIcon = () => {
  const { docName } = window.excalidraw;
  const fileIcon = Utils.getFileIconUrl(docName);
  document.getElementById('favicon').href = fileIcon;
};

const ExcaliEditor = () => {

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initExcalidraw = async () => {
      const accessToken = await editorApi.getExdrawToken();
      window.excalidraw = { ...window.excalidraw, accessToken: accessToken };
      setIsLoading(false);
      updateAppIcon();

      context.initSettings();
    };
    initExcalidraw();
  }, []);

  return (
    <div className="file-view-content flex-1 p-0 border-0">
      {isLoading ? <Loading /> : <SimpleEditor />}
    </div>
  );
};

export default ExcaliEditor;
