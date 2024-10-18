import React, { Suspense } from 'react';
import ReactDom from 'react-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './_i18n/i18n-sdoc-editor';
import { Utils } from './utils/utils';
import Loading from './components/loading';
import SdocEditor from './pages/sdoc/sdoc-editor';
import { CollaboratorsProvider, EnableMetadataProvider } from './metadata';

const { serviceURL, avatarURL, siteRoot, lang, mediaUrl, isPro } = window.app.config;
const { username, name } = window.app.userInfo;
const {
  repoID, repoName, parentDir, filePerm,
  docPath, docName, docUuid, seadocAccessToken, seadocServerUrl, assetsUrl,
  isSdocRevision, isPublished, originFilename, revisionCreatedAt, originFileVersion,
  originFilePath, originDocUuid, revisionId, isFreezed
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
  mediaUrl,
  isFreezed,
  isPro: isPro === 'True' ? true : false,
};

ReactDom.render(
  <I18nextProvider i18n={ i18n } >
    <Suspense fallback={<Loading />}>
      <EnableMetadataProvider repoID={repoID}>
        <CollaboratorsProvider repoID={repoID}>
          <SdocEditor />
        </CollaboratorsProvider>
      </EnableMetadataProvider>
    </Suspense>
  </I18nextProvider>,
  document.getElementById('wrapper')
);
