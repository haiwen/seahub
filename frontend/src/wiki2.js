import React, { Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import { createRoot } from 'react-dom/client';
import i18n from './_i18n/i18n-sdoc-editor';
import Loading from './components/loading';
import Wiki from './pages/wiki2';

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <I18nextProvider i18n={i18n}>
    <Suspense fallback={<Loading />}>
      <Wiki />
    </Suspense>
  </I18nextProvider>
);
