import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { globalHistory, LocationProvider } from '@gatsbyjs/reach-router';
import { createRoot } from 'react-dom/client';
import i18n from './_i18n/i18n-seafile-editor';
import Org from './pages/org-admin';

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <I18nextProvider value={i18n}>
    <LocationProvider history={globalHistory}>
      <Org />
    </LocationProvider>
  </I18nextProvider>
);
