import React from 'react';
import { createRoot } from 'react-dom/client';
import { LocationProvider, globalHistory } from '@gatsbyjs/reach-router';
import App from './pages/app';

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <LocationProvider history={globalHistory}>
    <App />
  </LocationProvider>
);
