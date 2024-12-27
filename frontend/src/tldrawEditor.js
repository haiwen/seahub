import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { I18nextProvider } from 'react-i18next';
import TldrawEditor from './pages/tldraw-editor';
import { MetadataStatusProvider } from './hooks';
import { CollaboratorsProvider } from './metadata';
import i18n from './_i18n/i18n-sdoc-editor';
import Loading from './components/loading';

const { serviceURL, avatarURL, siteRoot, lang, mediaUrl, isPro } = window.app.config;
const { username, name } = window.app.userInfo;
const { repoID, repoEncrypted, filePerm, isRepoAdmin } = window.app.pageOptions;
const repoInfo = { encrypted: repoEncrypted, permission: filePerm, is_admin: isRepoAdmin };

ReactDOM.render(
  <I18nextProvider i18n={ i18n } >
    <Suspense fallback={<Loading />}>
      <MetadataStatusProvider repoID={repoID} currentRepoInfo={repoInfo}>
        <CollaboratorsProvider repoID={repoID}>
          {filePerm === 'rw' && <TldrawEditor />}
        </CollaboratorsProvider>
      </MetadataStatusProvider>
    </Suspense>
  </I18nextProvider>,
  document.getElementById('wrapper')
);
