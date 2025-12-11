import axios from 'axios';
import React, { Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { SDocViewer } from '@seafile/seafile-sdoc-editor';
import Loading from '../../components/loading';
import i18n from '../../_i18n/i18n-sdoc-editor';

import './index.css';

const { serviceURL, siteRoot } = window.app.config;
const { fileDownloadLink, assetsUrl } = window.thumbnail;

window.seafile = {
  serviceUrl: serviceURL,
  assetsUrl,
  siteRoot,
};

const formatDocument = (document) => {
  document.elements = document.elements ? document.elements : document.children;
  if (!Array.isArray(document.elements)) {
    document.elements = [{ type: 'paragraph', children: [{ text: '' }] }];
  }
  return document;
};

export default function SdocThumbnail() {
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState(null);

  useEffect(() => {
    axios.get(fileDownloadLink).then(res => {
      const document = formatDocument(res.data);
      setContent(document);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className='sdoc-thumbnail-container'>
      <SDocViewer document={content}/>
    </div>
  );
}


const root = createRoot(document.getElementById('wrapper'));
root.render(
  <I18nextProvider i18n={ i18n } >
    <Suspense fallback={<Loading />}>
      <SdocThumbnail />
    </Suspense>
  </I18nextProvider>
);

