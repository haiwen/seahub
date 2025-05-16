import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Loading from './components/loading';
import ExcaliEditor from './pages/excalidraw-editor';
import FileView from './components/file-view/file-view';

const ViewFileExcaliEditor = () => {
  return (
    <FileView content={<ExcaliEditor />} isOnlyofficeFile={true} isHeaderShown={true} />
  );
};

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <Suspense fallback={<Loading />}>
    <ViewFileExcaliEditor />
  </Suspense>
);
