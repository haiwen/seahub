import React, { Suspense } from 'react';
import ReactDom from 'react-dom';
import { I18nextProvider } from 'react-i18next';
import Wiki from './pages/wiki2';
import i18n from './_i18n/i18n-sdoc-editor';
import Loading from './components/loading';

// i18 need `zh-CN`
if(window.app.config.lang === 'zh-cn') {
  window.app.config.lang = 'zh-CN';
}

ReactDom.render(
  <I18nextProvider i18n={i18n}>
    <Suspense fallback={<Loading />}>
      <Wiki />
    </Suspense>
  </I18nextProvider>,
  document.getElementById('wrapper')
);
