import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import TldrawEditor from './pages/tldraw-editor';
import Loading from './components/loading';

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <Suspense fallback={<Loading />}>
    <TldrawEditor />
  </Suspense>
);
