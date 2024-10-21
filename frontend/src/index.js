// Import React!
import React, { Suspense } from 'react';
import ReactDom from 'react-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './_i18n/i18n-seafile-editor';
import MarkdownEditor from './pages/markdown-editor';
import Loading from './components/loading';
import { CollaboratorsProvider, EnableMetadataProvider } from './metadata';

import './index.css';

const { repoID } = window.app.pageOptions;

ReactDom.render(
  <I18nextProvider i18n={ i18n } >
    <Suspense fallback={<Loading />}>
      <EnableMetadataProvider repoID={repoID}>
        <CollaboratorsProvider repoID={repoID}>
          <MarkdownEditor />
        </CollaboratorsProvider>
      </EnableMetadataProvider>
    </Suspense>
  </I18nextProvider>,
  document.getElementById('root')
);
