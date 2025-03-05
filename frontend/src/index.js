// Import React!
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './_i18n/i18n-seafile-editor';
import MarkdownEditor from './pages/markdown-editor';
import Loading from './components/loading';
import { MetadataStatusProvider } from './hooks';
import { CollaboratorsProvider } from './metadata';

import './index.css';

const { repoID, repoEncrypted, filePerm } = window.app.pageOptions;

const root = createRoot(document.getElementById('root'));
root.render(
  <I18nextProvider i18n={ i18n } >
    <Suspense fallback={<Loading />}>
      <MetadataStatusProvider repoID={repoID} repoInfo={{ permission: filePerm, encrypted: repoEncrypted }}>
        <CollaboratorsProvider repoID={repoID}>
          <MarkdownEditor />
        </CollaboratorsProvider>
      </MetadataStatusProvider>
    </Suspense>
  </I18nextProvider>
);
