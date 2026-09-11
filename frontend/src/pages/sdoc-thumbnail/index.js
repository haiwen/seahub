import React, { useEffect, useState } from 'react';
import { SDocViewer } from '@seafile/seafile-sdoc-editor';
import axios from 'axios';
import Loading from '../../components/loading';

import './index.css';

const { serviceURL, siteRoot } = window.app.config;
const { fileDownloadLink, assetsUrl } = window.thumbnail;

window.seafile = {
  serviceUrl: serviceURL,
  assetsUrl,
  siteRoot,
};

const formatDocument = (document) => {
  if (!document || typeof document !== 'object') {
    return { elements: [] };
  }
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
      {content.elements.length === 0 ?
        <div id="sdoc-editor-print-wrapper" className="empty-sdoc-thumbnail" /> :
        <SDocViewer document={content}/>
      }
    </div>
  );
}
