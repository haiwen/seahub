import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Loading from './components/loading';
import ExcaliEditor from './pages/excalidraw-editor';

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <Suspense fallback={<Loading />}>
    <ExcaliEditor />
  </Suspense>
);
