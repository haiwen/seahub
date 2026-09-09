import React, { Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import { PublishedRevisionViewer } from '@seafile/seafile-sdoc-editor';
import { createRoot } from 'react-dom/client';
import i18n from '../../../_i18n/i18n-sdoc-editor';
import Loading from '../../../components/loading';
import { mediaUrl } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

const { serviceURL, avatarURL, siteRoot, lang } = window.app.config;
const { username, name } = window.app.userInfo || {};
const {
  repoID, repoName, parentDir, filePerm,
  docPath, docName, docUuid, seadocAccessToken, seadocServerUrl, assetsUrl,
  isSdocRevision, isPublished, originFilename, revisionCreatedAt, originFileVersion,
  originFilePath, originDocUuid, revisionId,
} = window.app.pageOptions;

window.seafile = {
  repoID,
  docPath,
  docName,
  docUuid,
  isOpenSocket: true,
  serviceUrl: serviceURL,
  accessToken: seadocAccessToken,
  sdocServer: seadocServerUrl,
  name,
  username,
  avatarURL,
  siteRoot,
  docPerm: filePerm,
  historyURL: Utils.generateHistoryURL(siteRoot, repoID, docPath),
  parentFolderURL: `${siteRoot}library/${repoID}/${Utils.encodePath(repoName + parentDir)}`,
  assetsUrl,
  isShowInternalLink: true,
  isStarIconShown: true, // for star/unstar
  isSdocRevision,
  isPublished,
  originFilename,
  originFileVersion,
  originFilePath,
  originDocUuid,
  revisionCreatedAt,
  lang,
  revisionId,
};

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <I18nextProvider i18n={ i18n } >
    <Suspense fallback={<Loading />}>
      <PublishedRevisionViewer mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}/>
    </Suspense>
  </I18nextProvider>
);
