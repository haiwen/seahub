import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import FileLoading from '../file-loading';
import WikiTopNav from '../../top-nav';
import { getCurrentPageConfig } from '../../utils';
import Icon from '../../../../components/icon';

import PreviewContent from './preview-content';

import './index.css';

const FilePreviewWrapper = ({ docContent, previewDocUuid, setEditor, togglePreview, isReloadingPreview, previewDocInfo }) => {
  const [isShowZoomOut, setIsShowZoomOut] = useState(false);
  const wikiFilePreviewRef = useRef();
  const zoomOutPreviewRef = useRef();
  const scrollRef = useRef();
  const zoomOutScrollRef = useRef();

  const { config, pageId } = previewDocInfo;
  const isSdocPreview = previewDocInfo.type === 'sdoc_link';
  const hasPreviewContent = Boolean(docContent?.elements && !isReloadingPreview && previewDocInfo.type);
  const wikiTopNavProps = { config, currentPageId: pageId };
  const currentPageConfig = config && pageId && getCurrentPageConfig(config.pages, pageId);

  const openFullscreen = (e) => {
    e.stopPropagation();
    setIsShowZoomOut(true);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsShowZoomOut(false);
      }
    };
    if (isShowZoomOut) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isShowZoomOut, setIsShowZoomOut]);

  return (
    <>
      <div className="wiki-file-preview-drawer">
        <div className="wiki-file-preview-panel-wrapper">
          <div className="wiki-file-preview-panel-header">
            <div className="wiki-file-preview-panel-header-left">
              <div className="wiki-detail-header-icon-container">
                {isSdocPreview ? (
                  <span className='sdoc-preview-title' title={previewDocInfo.title}>{previewDocInfo.title}</span>
                ) : (
                  previewDocInfo.config && <WikiTopNav {...wikiTopNavProps} />
                )}
              </div>
            </div>
            <div className="wiki-file-preview-panel-header-right">
              <div
                id='file-preview_full_screen_mode'
                role="button"
                className='file-preview-full-screen'
                onClick={openFullscreen}
              >
                <Icon symbol='fullscreen'/>
              </div>
              <div className="sdoc-icon-btn" onClick={togglePreview}>
                <Icon symbol='close'/>
              </div>
            </div>
          </div>
          <div className="wiki-file-preview-panel-body">
            {isReloadingPreview && (
              <div className="h-100 w-100 d-flex align-items-center justify-content-center">
                <FileLoading />
              </div>
            )}
            {hasPreviewContent && (
              <div className='wiki-file-preview-container' ref={wikiFilePreviewRef}>
                <div className='wiki-scroll-container' ref={scrollRef}>
                  <div className='wiki-preview-container'>
                    <PreviewContent
                      docContent={docContent}
                      previewDocUuid={previewDocUuid}
                      setEditor={setEditor}
                      scrollRef={scrollRef}
                      isSdocPreview={isSdocPreview}
                      currentPageConfig={currentPageConfig}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {isShowZoomOut && hasPreviewContent && (
        ReactDOM.createPortal(
          <div className='wiki-zoom-out-container' onClick={() => setIsShowZoomOut(false)}>
            <div
              className='file-preview-zoom-out-container'
              ref={zoomOutPreviewRef}
              onClick={(e) => e.stopPropagation()}
            >
              <div className='wiki-scroll-container' ref={zoomOutScrollRef}>
                <div className='wiki-preview-container'>
                  <PreviewContent
                    docContent={docContent}
                    previewDocUuid={previewDocUuid}
                    setEditor={setEditor}
                    scrollRef={zoomOutScrollRef}
                    isSdocPreview={isSdocPreview}
                    currentPageConfig={currentPageConfig}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </>
  );
};

export default FilePreviewWrapper;
