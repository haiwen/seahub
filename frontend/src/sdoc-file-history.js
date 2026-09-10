import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { createRoot } from 'react-dom/client';
import i18n from './_i18n/i18n-sdoc-editor';
import SdocFileHistory from './pages/sdoc-file-history';

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <I18nextProvider i18n={ i18n }>
    <SdocFileHistory />
  </I18nextProvider>
);
