import React from 'react';
import { createRoot } from 'react-dom/client';
import { seadocServerUrl, wikiId } from '../../utils/constants';
import DocViewer from './doc-viewer';

(function () {
  const previewerContainer = document.getElementById('wiki-sdoc-previewer');
  if (!previewerContainer || !wikiId || !seadocServerUrl) return;

  let root = null;

  function renderDoc(pageId) {
    if (!pageId) return;
    if (!root) {
      root = createRoot(previewerContainer);
    }

    root.render(React.createElement(DocViewer, { pageId }));
  }

  window.addEventListener('wiki:navigate', function (event) {
    const pageId = event.detail && event.detail.pageid;
    renderDoc(pageId);
  });
})();
