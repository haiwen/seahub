import React, { Suspense } from 'react';
import ReactDom from 'react-dom';
import { SimpleViewer } from '@seafile/sdoc-editor';
import { I18nextProvider } from 'react-i18next';
import i18n from './_i18n/i18n-sdoc-editor';
import Loading from './components/loading';

const { serviceURL } = window.app.config;
const { username } = window.app.pageOptions;
const { repoID, filePath, fileName, rawPath } = window.shared.pageOptions;

window.seafile = {
  repoID,
  rawPath: rawPath,
  docName: fileName,  // required
  docPath: filePath,
  serviceUrl: serviceURL,
  username,
};

ReactDom.render(
  <I18nextProvider i18n={ i18n } >
    <Suspense fallback={<Loading />}>
      <SimpleViewer />
    </Suspense>
  </I18nextProvider>,
  document.getElementById('wrapper')
);
