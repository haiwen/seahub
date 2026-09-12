import React from 'react';
import { createRoot } from 'react-dom/client';
import PlainMarkdownEditor from './pages/plain-markdown-editor';

const root = createRoot(document.getElementById('root'));
root.render(<PlainMarkdownEditor />);
