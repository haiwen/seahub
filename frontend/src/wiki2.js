import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import Wiki from './pages/wiki2';
import i18n from './_i18n/i18n-sdoc-editor';
import Loading from './components/loading';

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <I18nextProvider i18n={i18n}>
    <Suspense fallback={<Loading />}>
      <Wiki />
    </Suspense>
  </I18nextProvider>
);
