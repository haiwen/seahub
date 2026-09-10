import { LocationProvider, globalHistory } from '@gatsbyjs/reach-router';
import { createRoot } from 'react-dom/client';
import Institutions from './pages/institution-admin';

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <LocationProvider history={globalHistory}>
    <Institutions />
  </LocationProvider>
);
