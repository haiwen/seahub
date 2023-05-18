import React, { Suspense } from 'react';
import ReactDom from 'react-dom';
import { SimpleViewer } from '@seafile/sdoc-editor';
import { I18nextProvider } from 'react-i18next';
import i18n from './_i18n/i18n-sdoc-editor';
import Loading from './components/loading';
import { Utils } from './utils/utils';

const { serviceURL, siteRoot, avatarURL } = window.app.config;
const { username } = window.app.pageOptions;
const {
  repoID, filePerm,
  docPath, docName, docUuid, seadocAccessToken, seadocServerUrl, assetsUrl
} = window.shared.pageOptions;

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
  docPerm: filePerm,
  historyURL: Utils.generateHistoryURL(siteRoot, repoID, docPath),
  assetsUrl,
};

ReactDom.render(
  <I18nextProvider i18n={ i18n } >
    <Suspense fallback={<Loading />}>
      <SimpleViewer />
    </Suspense>
  </I18nextProvider>,
  document.getElementById('wrapper')
);
