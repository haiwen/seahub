import React from 'react';
import { createRoot } from 'react-dom/client';
import SharedUploadLink from './pages/upload-link';

const root = createRoot(document.getElementById('wrapper'));
root.render(<SharedUploadLink />);
