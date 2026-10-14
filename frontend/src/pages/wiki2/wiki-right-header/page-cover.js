import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Popover } from 'reactstrap';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { seafileAPI } from '@/api/seafile-api';
import Icon from '@/components/icon';
import Loading from '@/components/loading';
import toaster from '@/components/toast';
import { gettext, wikiPermission } from '@/utils/constants';
import { Utils } from '@/utils/utils';
import { WIKI_COVER_LIST } from '../constant';
import AICoverPanel from './ai-cover-panel';
import useAICover from './use-ai-cover';

import './page-cover.css';

function PageCover({ currentPageConfig, onUpdatePageConfig, aiAvailable,
  isPopoverOpen, onPopoverChange, activePanel, onPanelChange }) {

  const [isShowCoverController, setIsShowCoverController] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 46 });
  const [isDragging, setIsDragging] = useState(false);
  const setIsPopoverOpen = onPopoverChange;
  // Keep requests and candidates alive independently of the popover's DOM.
  const aiCover = useAICover({ page: currentPageConfig, onUpdatePageConfig,
    onClose: () => setIsPopoverOpen(false) });
  const isSavingAI = aiCover.saving;

  const fileInputRef = useRef(null);
  const galleryTabRef = useRef(null);
  const uploadTabRef = useRef(null);
  const aiTabRef = useRef(null);
  const isDraggingRef = useRef(false);
  const isDesktop = Utils.isDesktop();

  const { docUuid, serviceUrl, accessToken } = window.seafile || {};

  const onMouseEnter = useCallback(() => {
    setIsShowCoverController(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (isPopoverOpen) {
      return;
    }
    setIsShowCoverController(false);
  }, [isPopoverOpen]);

  const getCoverImgUrl = useCallback((imageName) => {
    const { serviceUrl: svcUrl, mediaUrl } = window.seafile;
    if (!imageName) return '';
    // Predefined gallery images from WIKI_COVER_LIST
    return `${svcUrl}${mediaUrl}img/wiki/cover/${imageName}`;
  }, []);

  // Update indicator style when popover opens or active panel changes
  useEffect(() => {
    if (!isPopoverOpen) return;

    // Use requestAnimationFrame to ensure DOM is rendered before measuring
    const updateIndicator = () => {
      const activeTab = { gallery: galleryTabRef, upload: uploadTabRef, ai: aiTabRef }[activePanel]?.current;
      if (activeTab) {
        setIndicatorStyle({
          left: activeTab.offsetLeft,
          width: activeTab.offsetWidth
        });
      }
    };

    requestAnimationFrame(updateIndicator);
  }, [isPopoverOpen, activePanel]);

  const getCustomCoverUrl = useCallback((filename, docUuid) => {
    const { serviceUrl: svcUrl } = window.seafile;
    if (!filename) return '';
    const name = filename.startsWith('/') ? filename.substring(1) : filename;
    return `${svcUrl}/api/v2.1/seadoc/download-image/${docUuid}/${name}`;
  }, []);

  const updatePageCover = useCallback((imageName) => {
    setIsPopoverOpen(false);
    onUpdatePageConfig(currentPageConfig.id, {
      ...currentPageConfig,
      cover_img_url: imageName,
    });
  }, [currentPageConfig, onUpdatePageConfig, setIsPopoverOpen]);

  const removeCoverImage = useCallback(() => {
    setUploadPreviewUrl(null);
    setUploadProgress(0);
    updatePageCover('');
  }, [updatePageCover]);

  const updateCoverImage = useCallback((imageName) => {
    setUploadPreviewUrl(null);
    setUploadProgress(0);
    updatePageCover(imageName);
  }, [updatePageCover]);

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toaster.danger(gettext('Please select an image file.'));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUploadPreviewUrl(previewUrl);
    setUploadProgress(0);
    setIsUploading(true);

    setIsPopoverOpen(false);

    const formData = new FormData();
    formData.append('file', file);

    const uploadUrl = `${serviceUrl}/api/v2.1/seadoc/upload-image/${docUuid}/`;

    seafileAPI.uploadImage(uploadUrl, formData, accessToken, (progressEvent) => {
      const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      setUploadProgress(percent);
    }).then((res) => {
      const relativePath = res.data.relative_path?.[0];
      setIsUploading(false);
      setUploadPreviewUrl(null);
      updatePageCover(relativePath);
    }).catch((error) => {
      setIsUploading(false);
      setUploadPreviewUrl(null);
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg || gettext('Failed to upload image.'));
    });
  }, [docUuid, serviceUrl, accessToken, updatePageCover, setIsPopoverOpen]);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  }, [handleFileSelect]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setIsDragging(true);
      }
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const dropZone = e.currentTarget;
    const relatedTarget = e.relatedTarget;

    // Only reset dragging state if actually leaving the drop zone
    // (not moving to a child element like the button)
    if (relatedTarget && !dropZone.contains(relatedTarget)) {
      isDraggingRef.current = false;
      setIsDragging(false);
    } else if (!relatedTarget) {
      // relatedTarget is null when leaving the browser window
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = false;
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handlePanelSwitch = useCallback((panel) => {
    if (isSavingAI) return;
    onPanelChange(panel);

    const activeTab = { gallery: galleryTabRef, upload: uploadTabRef, ai: aiTabRef }[panel]?.current;
    if (activeTab) {
      setIndicatorStyle({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth
      });
    }
  }, [isSavingAI, onPanelChange]);

  // Get current cover URL for display (handles both preview and existing)
  const currentCoverUrl = useMemo(() => {
    if (uploadPreviewUrl) return uploadPreviewUrl;
    if (currentPageConfig.cover_img_url) {
      const filename = currentPageConfig.cover_img_url;
      if (WIKI_COVER_LIST.includes(filename)) {
        return getCoverImgUrl(filename);
      }
      return getCustomCoverUrl(filename, docUuid);
    }
    return '';
  }, [uploadPreviewUrl, currentPageConfig.cover_img_url, getCoverImgUrl, getCustomCoverUrl, docUuid]);

  if (!currentCoverUrl && !isUploading) {
    return null;
  }

  return (
    <div id="wiki-page-cover" className="wiki-page-cover"
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {currentCoverUrl && <img className="wiki-page-cover__img" alt={gettext('Cover')} src={currentCoverUrl} />}
      {/* Upload progress overlay */}
      {isUploading && uploadPreviewUrl && (
        <div className="wiki-page-cover-upload-mask">
          <div className="wiki-page-cover-upload-progress">
            <Loading />
            <span className="wiki-page-cover-progress-text">{uploadProgress}%</span>
          </div>
        </div>
      )}
      {isDesktop && wikiPermission === 'rw' && (isShowCoverController || isPopoverOpen) && (
        <>
          {currentCoverUrl && (
            <button className="wiki-cover-controller-btn border-0 d-flex align-items-center" id='wiki-change-cover-btn'>
              <Icon symbol="gallery" className="mr-1" />
              {gettext('Change cover')}
            </button>
          )}
          <Popover
            flip
            target="wiki-change-cover-btn"
            placement="bottom-start"
            hideArrow={true}
            popperClassName="wiki-page-cover-popover"
            innerClassName="wiki-page-cover-panel wiki-page-panel"
            trigger="legacy"
            isOpen={isPopoverOpen}
            toggle={() => { if (!isSavingAI) setIsPopoverOpen(!isPopoverOpen); }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wiki-page-cover-panel__header popover-header">
              <div className="wiki-page-cover-panel__tabs">
                <span
                  ref={galleryTabRef}
                  className={`wiki-page-cover-panel__tab ${activePanel === 'gallery' ? 'active' : ''}`}
                  onClick={() => handlePanelSwitch('gallery')}
                >
                  {gettext('Gallery')}
                </span>
                <span
                  ref={uploadTabRef}
                  className={`wiki-page-cover-panel__tab ${activePanel === 'upload' ? 'active' : ''}`}
                  onClick={() => handlePanelSwitch('upload')}
                >
                  {gettext('Upload')}
                </span>
                {aiAvailable && (
                  <button type="button" ref={aiTabRef}
                    className={classNames('wiki-page-cover-panel__tab border-0 bg-transparent p-0', { active: activePanel === 'ai' })}
                    disabled={isSavingAI} onClick={() => handlePanelSwitch('ai')}>
                    {gettext('AI generate')}
                  </button>
                )}
                <span className={`wiki-page-cover-panel__tab-indicator ${activePanel}`} style={indicatorStyle} />
              </div>
              {currentCoverUrl && (
                <button type="button" onClick={removeCoverImage} disabled={isSavingAI}
                  className="wiki-remove-icon-btn border-0 bg-transparent">
                  {gettext('Remove')}
                </button>
              )}
            </div>
            <div className={classNames('wiki-page-cover-panel__body popover-body', { 'upload-panel': activePanel === 'upload' })}>
              {activePanel === 'gallery' && (
                <div className='wiki-cover-gallery-grid'>
                  {WIKI_COVER_LIST.map(imgName => (
                    <img
                      key={imgName}
                      onClick={() => updateCoverImage(imgName)}
                      className={`wiki-cover-gallery-img ${currentPageConfig.cover_img_url === imgName ? 'selected' : ''}`}
                      alt={gettext('Cover')}
                      src={getCoverImgUrl(imgName)}
                    />
                  ))}
                </div>
              )}
              {activePanel === 'upload' && (
                <div
                  className={classNames('wiki-cover-upload-area', { 'dragging': isDragging })}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="wiki-cover-upload-button"
                    onClick={handleClickUpload}
                  >
                    {gettext('Upload file')}
                  </button>
                  <span className="wiki-cover-upload-text">{gettext('Images wider than 1500 pixels work best.')}</span>
                </div>
              )}
              {isPopoverOpen && aiAvailable && (
                <div className="wiki-page-cover-panel__ai-container" hidden={activePanel !== 'ai'}>
                  <AICoverPanel page={currentPageConfig} cover={aiCover}
                    onClose={() => setIsPopoverOpen(false)} />
                </div>
              )}
            </div>
          </Popover>
        </>
      )}
    </div>
  );
}

PageCover.propTypes = {
  currentPageConfig: PropTypes.object,
  onUpdatePageConfig: PropTypes.func,
  aiAvailable: PropTypes.bool,
  isPopoverOpen: PropTypes.bool.isRequired,
  onPopoverChange: PropTypes.func.isRequired,
  activePanel: PropTypes.string.isRequired,
  onPanelChange: PropTypes.func.isRequired,
};

export default PageCover;
