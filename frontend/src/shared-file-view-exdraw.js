import React from 'react';
import { createRoot } from 'react-dom/client';
import { Utils } from './utils/utils';
import ExcaliViewer from './pages/excalidraw-viewer';
import ExcalidrawEdiableViewer from './pages/excalidraw-editable-viewer';

const { siteRoot, avatarURL } = window.app.config;
const { username } = window.app.pageOptions;
const {
  repoID,
  canDownload,
  canEdit,
  fileName,
  assetsUrl,
  sharedFileDownloadURL,
} = window.shared.pageOptions;

// share permission of this sdoc
const sharePermission = { 'can_edit': canEdit, 'can_download': canDownload, 'can_upload': false };
const sharePermissionStr = Utils.getShareLinkPermissionStr(sharePermission);
const sharePermissionText = Utils.getShareLinkPermissionObject(sharePermissionStr).text;

window.seafile = {
  repoID,
  username,
  avatarURL,
  siteRoot,
  sharePermissionText: sharePermissionText,
  downloadURL: sharedFileDownloadURL,
  assetsUrl,
};

(function () {
  const fileIcon = Utils.getFileIconUrl(fileName);
  document.getElementById('favicon').href = fileIcon;
})();


const root = createRoot(document.getElementById('wrapper'));
root.render(canEdit ? <ExcalidrawEdiableViewer /> : <ExcaliViewer />);
