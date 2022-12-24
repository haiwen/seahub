// Import React!
import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n-seafile-editor';
import MarkdownEditor from './pages/markdown-editor';

import './index.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <I18nextProvider i18n={ i18n } >
    <MarkdownEditor />
  </I18nextProvider>
);
