import React from 'react';
import { createRoot } from 'react-dom/client';
import SdocRevision from './pages/sdoc-revision';

const root = createRoot(document.getElementById('wrapper'));
root.render(<SdocRevision />);
