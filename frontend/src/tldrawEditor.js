import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import TldrawEditor from './pages/tldraw-editor';
import Loading from './components/loading';

ReactDOM.render(
  <Suspense fallback={<Loading />}>
    <TldrawEditor />
  </Suspense>,
  document.getElementById('wrapper')
);
