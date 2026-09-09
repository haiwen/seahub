import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import FileView from './components/file-view/file-view';
import Loading from './components/loading';
import ExcaliEditor from './pages/excalidraw-editor';

const ViewFileExcaliEditor = () => {
  return (
    <FileView content={<ExcaliEditor />} isOnlyofficeFile={true} />
  );
};

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <Suspense fallback={<Loading />}>
    <ViewFileExcaliEditor />
  </Suspense>
);
