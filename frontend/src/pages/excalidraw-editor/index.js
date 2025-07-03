import React, { useEffect } from 'react';
import SimpleEditor from './editor';
import { Utils } from '../../utils/utils';

import './index.css';

const updateAppIcon = () => {
  const { docName } = window.app.pageOptions;
  const fileIcon = Utils.getFileIconUrl(docName);
  document.getElementById('favicon').href = fileIcon;
};

const ExcaliEditor = () => {

  useEffect(() => {
    updateAppIcon();
  }, []);

  return (
    <div className="file-view-content flex-1 p-0 border-0">
      <SimpleEditor />
    </div>
  );
};

export default ExcaliEditor;
