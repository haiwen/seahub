import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Loading from './components/loading';

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <Suspense fallback={<Loading />}>
    <div className='d-flex align-items-center justify-content-center'>
      <h1 className='mt-9'>Welcome exceldraw editor</h1>
    </div>
  </Suspense>
);
