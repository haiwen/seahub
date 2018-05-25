// Import React!
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './assets/css/seafile-ui.css';
import './index.css';

let lang = window.app.pageOptions.lang

ReactDOM.render(
  <I18nextProvider i18n={ i18n } initialLanguage={ lang } >
    <App />
  </I18nextProvider>,
  document.getElementById('root')
);
