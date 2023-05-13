import React, { Suspense } from 'react';
import ReactDom from 'react-dom';
import { SimpleViewer } from '@seafile/sdoc-editor';
import { I18nextProvider } from 'react-i18next';
import i18n from './_i18n/i18n-sdoc-editor';
import Loading from './components/loading';
import { Utils } from './utils/utils';

const { serviceURL, siteRoot } = window.app.config;
const { username, filePerm } = window.app.pageOptions;
const { repoID, filePath, fileName, rawPath, assetsUrl } = window.shared.pageOptions;

window.seafile = {
  repoID,
  rawPath: rawPath,
  docName: fileName,  // required
  docPath: filePath,
  serviceUrl: serviceURL,
  username,
  siteRoot,
  docPerm: filePerm,
  historyURL: Utils.generateHistoryURL(siteRoot, repoID, filePath),
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
