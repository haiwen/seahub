import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './_i18n/i18n-sdoc-editor';
import { Utils } from './utils/utils';
import Loading from './components/loading';
import SdocEditor from './pages/sdoc/sdoc-editor';
import { MetadataStatusProvider } from './hooks';
import { CollaboratorsProvider } from './metadata';
import { TagsProvider } from './tag/hooks';
import { SimpleViewer } from '@seafile/sdoc-editor';

const { serviceURL, avatarURL, siteRoot, lang, mediaUrl, isPro, fileServerRoot } = window.app.config;
const { username, name } = window.app.userInfo;
const {
  repoID, repoName, repoEncrypted, parentDir, filePerm,
  docPath, docName, docUuid, seadocAccessToken, seadocServerUrl, assetsUrl,
  isSdocRevision, isPublished, originFilename, revisionCreatedAt, originFileVersion,
  originFilePath, originDocUuid, revisionId, isFreezed, mobileLogin, isRepoAdmin,
  enableSeafileAI
} = window.app.pageOptions;

window.seafile = {
  repoID,
  isRepoAdmin,
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
  mediaUrl,
  isFreezed,
  isPro: isPro === 'True' ? true : false,
  mobileLogin,
  enableSeafileAI,
  fileServerRoot,
};

const repoInfo = { encrypted: repoEncrypted, permission: filePerm, is_admin: isRepoAdmin };

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <I18nextProvider i18n={ i18n } >
    <Suspense fallback={<Loading />}>
      <MetadataStatusProvider repoID={repoID} repoInfo={repoInfo}>
        <CollaboratorsProvider repoID={repoID}>
          <TagsProvider repoID={repoID} repoInfo={repoInfo}>
            {filePerm === 'rw' ? <SdocEditor /> : <SimpleViewer />}
          </TagsProvider>
        </CollaboratorsProvider>
      </MetadataStatusProvider>
    </Suspense>
  </I18nextProvider>
);
