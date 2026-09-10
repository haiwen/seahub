import React from 'react';
import { createRoot } from 'react-dom/client';
import FileHistory from './pages/file-history-old';

const root = createRoot(document.getElementById('wrapper'));
root.render(<FileHistory />);
