// Import React!
import React from 'react';
import ReactDOM from 'react-dom';
import MarkdownEditor from './markdown-editor';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './index.css';

let lang = window.app.pageOptions.lang;

ReactDOM.render(
  <I18nextProvider i18n={ i18n } initialLanguage={ lang } >
    <MarkdownEditor />
  </I18nextProvider>,
  document.getElementById('root')
);
