import React, { useEffect, useState } from 'react';
import SDocServerApi from './sdoc-server-api';
import { SDocViewer } from '@seafile/seafile-sdoc-editor';
import Loading from '../../components/loading';

const { serviceURL, siteRoot, lang, mediaUrl } = window.app.config;
const {
  repoID,
  docPath,
  docName,
  docUuid,
  seadocAccessToken,
  seadocServerUrl,
  assetsUrl,
  username,
  name
} = window.app.pageOptions;

window.seafile = {
  repoID,
  docPath,
  docName,
  docUuid,
  isOpenSocket: false,
  serviceUrl: serviceURL,
  accessToken: seadocAccessToken,
  sdocServer: seadocServerUrl,
  name,
  username,
  siteRoot,
  assetsUrl,
  lang,
  mediaUrl
};

function SdocPrint() {
  const [isLoading, setIsLoading] = useState(true);
  const [document, setDocument] = useState(null);

  const initPrintStyle = () => {
    let styleElement = window.document.createElement('STYLE');
    styleElement.setAttribute('type', 'text/css');
    const pageStyle = window.document.createTextNode(`
    @media print {
      @page { 
        size: 793px 1121px;
        margin: 40px 60px; 
        padding: 0;
      } 
      body { 
        margin: 0; 
        padding: 0;
        min-width: 673px !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .article,
      .sdoc-editor__article
      {
        width: 673px !important;
        border: none !important; 
        box-shadow: none !important; 
        margin: 0 !important;
        padding: 0 !important; 
      }
      .seatable-view-container {
        overflow: hidden !important;
      }
      table {
        border-left: none !important;
        border-top: none !important;
        width: fit-content !important;
      }
      table thead tr {
        border-top: 1px solid #ccc;
      }
      tr {
        border-left: 1px solid #ccc;
        page-break-inside: avoid;
      }
      tr:first-of-type {
        page-break-after: auto;
      }
      .d-print-none {
        display:none !important;
      }
    }
    body,
    #wrapper {
      height: fit-content !important;
    }
    .sdoc-editor-container,
    .sdoc-content-wrapper,
    .sdoc-scroll-container,
    .sdoc-editor-content,
    .sdoc-article-container {
      position: relative !important;
      flex: 1 !important;
      display: flex !important;
      height: fit-content !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 auto !important;
      background: #fff !important;
    }
    .sdoc-editor__article {
        width: 794px;
        height: fit-content !important; 
        margin: 0 auto;
    }
    `);
    styleElement.appendChild(pageStyle);
    window.document.head.appendChild(styleElement);
  };

  useEffect(() => {
    initPrintStyle();
    const sdocServerApi = new SDocServerApi(window.seafile);
    sdocServerApi.getDocContent().then(res => {
      const document = res.data;
      setDocument(document);
      document.elements = [
        ...document.elements,
        {
          id: 'document-render-complete',
          type: 'paragraph',
          children: [
            {
              id: 'document-render-complete-text',
              text: '',
            }
          ]
        }
      ];
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return <Loading />;

  return (
    <SDocViewer
      document={document}
      showToolbar={false}
      showOutline={false}
      showComment={false}
    />
  );
}

export default SdocPrint;
