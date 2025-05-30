import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { SimpleViewer } from '@seafile/seafile-sdoc-editor';
import { I18nextProvider } from 'react-i18next';
import i18n from './_i18n/i18n-sdoc-editor';
import Loading from './components/loading';
import { Utils } from './utils/utils';

const { serviceURL, siteRoot, avatarURL } = window.app.config;
const { username } = window.app.pageOptions;
const {
  repoID, filePerm,
  canDownload, canEdit,
  trafficOverLimit, zipped,
  docPath, docName, docUuid, seadocAccessToken, seadocServerUrl, assetsUrl
} = window.shared.pageOptions;

// share permission of this sdoc
const sharePermission = { 'can_edit': canEdit, 'can_download': canDownload, 'can_upload': false };
const sharePermissionStr = Utils.getShareLinkPermissionStr(sharePermission);
const sharePermissionText = Utils.getShareLinkPermissionObject(sharePermissionStr).text;

window.seafile = {
  repoID,
  docPath,
  docName,
  docUuid,
  isOpenSocket: true,
  serviceUrl: serviceURL,
  accessToken: seadocAccessToken,
  sdocServer: seadocServerUrl,
  username,
  avatarURL,
  siteRoot,
  sharePermissionText: sharePermissionText,
  downloadURL: (canDownload && !trafficOverLimit) ? `?${zipped ? 'p=' + encodeURIComponent(docPath) + '&' : ''}dl=1` : '',
  docPerm: filePerm,
  historyURL: Utils.generateHistoryURL(siteRoot, repoID, docPath),
  assetsUrl,
};

(function () {
  const fileIcon = Utils.getFileIconUrl(docName);
  document.getElementById('favicon').href = fileIcon;
})();


const root = createRoot(document.getElementById('wrapper'));
root.render(
  <I18nextProvider i18n={ i18n } >
    <Suspense fallback={<Loading />}>
      <SimpleViewer />
    </Suspense>
  </I18nextProvider>
);
