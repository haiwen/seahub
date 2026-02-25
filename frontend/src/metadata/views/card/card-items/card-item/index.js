import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Formatter from './formatter';
import {
  getCellValueByColumn,
  isValidCellValue,
  getParentDirFromRecord, getFileMTimeFromRecord
} from '../../../../utils/cell';
import { Utils } from '../../../../../utils/utils';
import { checkIsDir } from '../../../../utils/row';
import { siteRoot, gettext, fileServerRoot, thumbnailSizeForOriginal, enableThumbnailServer } from '../../../../../utils/constants';
import Icon from '../../../../../components/icon';

import './index.css';

const CardItem = ({
  isSelected,
  record,
  tagsData,
  fileNameColumn,
  mtimeColumn,
  modifierColumn,
  displayColumns,
  displayEmptyValue,
  displayColumnName,
  onOpenFile,
  onSelectCard,
  onContextMenu,
}) => {
  const [isUsingIcon, setIsUsingIcon] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const hoverTimerRef = useRef(null);

  const fileNameValue = getCellValueByColumn(record, fileNameColumn);
  const mtimeValue = getCellValueByColumn(record, mtimeColumn);
  const modifierValue = getCellValueByColumn(record, modifierColumn);

  // for the big image
  const parentDir = useMemo(() => getParentDirFromRecord(record), [record]);
  const isDir = useMemo(() => checkIsDir(record), [record]);

  const shouldUseThumbnail = useMemo(() => {
    if (isDir) return false;
    const value = fileNameValue;
    return Utils.imageCheck(value) ||
      Utils.pdfCheck(value) ||
      Utils.videoCheck(value) ||
      (Utils.isEditableSdocFile(value) && enableThumbnailServer);
  }, [isDir, fileNameValue]);

  const isDocumentFile = useMemo(() => {
    if (!shouldUseThumbnail || isUsingIcon) return false;
    const value = fileNameValue;
    return Utils.pdfCheck(value) || Utils.isEditableSdocFile(value);
  }, [shouldUseThumbnail, fileNameValue, isUsingIcon]);

  const imageURLs = useMemo(() => {
    if (isDir) {
      const iconURL = Utils.getFolderIconUrl();
      return { URL: iconURL, iconURL: iconURL };
    }
    const value = fileNameValue;
    const fileIconURL = Utils.getFileIconUrl(value);
    if (shouldUseThumbnail) {
      const path = Utils.encodePath(Utils.joinPath(parentDir, value));
      const repoID = window.sfMetadataStore.repoId;
      const thumbnailURL = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}?mtime=${getFileMTimeFromRecord(record)}`;
      return { URL: thumbnailURL, iconURL: fileIconURL };
    }
    return { URL: fileIconURL, iconURL: fileIconURL };
  }, [isDir, fileNameValue, parentDir, record, shouldUseThumbnail]);

  const onLoadError = useCallback(() => {
    setIsUsingIcon(true);
    imgRef.current.src = imageURLs.iconURL;
  }, [imageURLs]);

  const handleClickCard = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onSelectCard(record);
  }, [record, onSelectCard]);

  const handleFilenameClick = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    const canPreview = window.sfMetadataContext.canPreview();
    if (!canPreview) return;
    onOpenFile(record);
  }, [record, onOpenFile]);

  const handleImageContainerMouseEnter = useCallback(() => {
    if (!isDocumentFile) return;

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = setTimeout(() => {
      setShowScrollbar(true);
    }, 500);
  }, [isDocumentFile]);

  const handleImageContainerMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowScrollbar(false);
  }, []);

  const handleImageContainerScroll = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const scrollable = isDocumentFile && !isUsingIcon;

  // for video (hover to play)
  const [isHovering, setIsHovering] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState(null); // { width, height }

  const videoPlayerRef = useRef(null);
  const hoverTimer = useRef(null);
  const metadataVideo = useRef(null);

  const videoSrc = useMemo(() => {
    const repoID = window.sfMetadataStore.repoId;
    const filePath = Utils.encodePath(Utils.joinPath(parentDir, fileNameValue));
    return `${fileServerRoot}repos/${repoID}/files${filePath}?op=download`;
  }, [fileNameValue, parentDir]);

  const handleGridItemMouseEnter = useCallback((e) => {
    if (!Utils.videoCheck(fileNameValue)) return;
    setIsHovering(true);

    // Preload video metadata to get dimensions
    if (!metadataVideo.current) {
      metadataVideo.current = document.createElement('video');
      metadataVideo.current.preload = 'metadata';
      metadataVideo.current.src = videoSrc;
      metadataVideo.current.onloadedmetadata = () => {
        const maxSize = 96;
        const videoWidth = metadataVideo.current.videoWidth;
        const videoHeight = metadataVideo.current.videoHeight;
        const aspectRatio = videoWidth / videoHeight;

        let displayWidth;
        let displayHeight;
        if (aspectRatio > 1) {
          // Landscape
          displayWidth = Math.min(videoWidth, maxSize);
          displayHeight = displayWidth / aspectRatio;
        } else {
          // Portrait
          displayHeight = Math.min(videoHeight, maxSize);
          displayWidth = displayHeight * aspectRatio;
        }

        setVideoDimensions({ width: displayWidth, height: displayHeight });
      };
    }

    hoverTimer.current = setTimeout(() => {
      setShowVideoPreview(true);
    }, 500);
  }, [fileNameValue, videoSrc]);

  const handleGridItemMouseLeave = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    }

    const video = videoPlayerRef.current;
    if (video) {
      if (video.pause) video.pause();
      if (typeof video.currentTime === 'number') video.currentTime = 0;
    }

    setIsHovering(false);
    setShowVideoPreview(false);
    setVideoProgress(0);
    setVideoReady(false);
  }, []);

  const handleVideoTimeUpdate = useCallback((e) => {
    const video = e.target;
    const progress = (video.currentTime / video.duration) * 100;
    setVideoProgress(progress || 0);
  }, []);

  const handleVideoLoadedMetadata = useCallback(() => {
    if (!showVideoPreview) return;
    const video = videoPlayerRef.current;
    if (video && video.paused) {
      video.play().catch(() => {
        // ignore autoplay errors
      });
    }
  }, [showVideoPreview]);

  const handleVideoPlaying = useCallback(() => {
    if (showVideoPreview) {
      setVideoReady(true);
    }
  }, [showVideoPreview]);

  const handleToggleMute = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsMuted(muted => !muted);
  }, []);

  useEffect(() => {
    let currentPlayer = videoPlayerRef.current;
    return () => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }
      if (metadataVideo.current) {
        metadataVideo.current.onloadedmetadata = null;
        metadataVideo.current.onerror = null;
        metadataVideo.current.src = '';
        metadataVideo.current = null;
      }
      if (currentPlayer?.player) {
        try {
          currentPlayer.player.dispose();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [hoverTimer, metadataVideo, videoPlayerRef]);

  const isVideo = Utils.videoCheck(fileNameValue);
  const shouldHideBasePreview = isVideo && showVideoPreview && videoReady;

  return (
    <article
      data-id={record._id}
      className={classnames('sf-metadata-card-item', { 'selected': isSelected })}
      onClick={handleClickCard}
      onContextMenu={onContextMenu}
      tabIndex="0"
      onKeyDown={Utils.onKeyDown}
    >
      <div
        ref={containerRef}
        className={classnames('sf-metadata-card-item-image-container', {
          'video-preview-container': isVideo,
          'position-relative': isVideo
        })}
        onMouseEnter={handleGridItemMouseEnter}
        onMouseLeave={handleGridItemMouseLeave}
      >
        {scrollable ? (
          <div
            className={classnames('sf-metadata-card-item-image-scroll-wrapper', {
              'show-scrollbar': showScrollbar
            })}
            onMouseEnter={handleImageContainerMouseEnter}
            onMouseLeave={handleImageContainerMouseLeave}
            onScroll={handleImageContainerScroll}
          >
            <img
              loading="lazy"
              className="sf-metadata-card-item-doc-thumbnail"
              ref={imgRef}
              src={imageURLs.URL}
              onError={onLoadError}
              alt=""
            />
          </div>
        ) : (
          <>
            <img
              loading="lazy"
              className={classnames('sf-metadata-card-item-image', 'grid-preview-thumb', {
                'grid-preview-thumb--hidden': shouldHideBasePreview
              })}
              ref={imgRef}
              src={imageURLs.URL}
              onError={onLoadError}
              alt=""
            />
            {isVideo && (isHovering || showVideoPreview) && (
              <div
                className={classnames('grid-video-preview', {
                  'grid-video-preview--active': showVideoPreview,
                  'grid-video-preview--ready': videoReady
                })}
              >
                <div className="video-wrapper">
                  <video
                    key="grid-video-preview"
                    ref={videoPlayerRef}
                    src={showVideoPreview ? videoSrc : undefined}
                    autoPlay={showVideoPreview}
                    muted={isMuted}
                    loop
                    playsInline
                    preload={showVideoPreview ? 'auto' : 'none'}
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onPlaying={handleVideoPlaying}
                    onTimeUpdate={handleVideoTimeUpdate}
                  />
                  {videoReady && (
                    <div className="custom-video-controls">
                      <div className="custom-progress-bar">
                        <div
                          className="custom-progress-filled"
                          style={{ width: `${videoProgress}%` }}
                        />
                      </div>
                      <button
                        className="custom-volume-btn"
                        onClick={handleToggleMute}
                        aria-label={isMuted ? gettext('Unmute') : gettext('Mute')}
                      >
                        <Icon symbol={isMuted ? 'mute' : 'unmute'} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {isVideo && isHovering && !showVideoPreview && videoDimensions && (
              <div
                className="grid-video-hover-overlay"
                style={{
                  width: `${videoDimensions.width}px`,
                  height: `${videoDimensions.height}px`,
                }}
              >
                <Icon symbol="play-filled" className="grid-video-play" />
              </div>
            )}
          </>
        )}
      </div>
      <div className="sf-metadata-card-item-text-container">
        <Formatter
          value={fileNameValue}
          column={fileNameColumn}
          record={record}
          hideIcon={true}
          onFileNameClick={handleFilenameClick}
          tagsData={tagsData}
        />
        <div className="sf-metadata-card-last-modified-info">
          <Formatter value={modifierValue} column={modifierColumn} record={record} tagsData={tagsData} />
          <Formatter value={mtimeValue} format="relativeTime" column={mtimeColumn} record={record} tagsData={tagsData} />
        </div>
        {displayColumns.map((column) => {
          const value = getCellValueByColumn(record, column);
          if (!displayEmptyValue && !isValidCellValue(value)) {
            if (displayColumnName) {
              return (
                <div className="sf-metadata-card-item-field" key={column.key}>
                  <span className="sf-metadata-card-item-field-name">{column.name}</span>
                </div>
              );
            }
            return null;
          }

          return (
            <div className="sf-metadata-card-item-field" key={column.key}>
              {displayColumnName && (
                <span className="sf-metadata-card-item-field-name">{column.name}</span>
              )}
              <Formatter value={value} column={column} record={record} tagsData={tagsData} />
            </div>
          );
        })}
      </div>
    </article>
  );
};

CardItem.propTypes = {
  isSelected: PropTypes.bool,
  record: PropTypes.object,
  tagsData: PropTypes.object,
  fileNameColumn: PropTypes.object,
  mtimeColumn: PropTypes.object,
  modifierColumn: PropTypes.object,
  displayColumns: PropTypes.array,
  displayEmptyValue: PropTypes.bool,
  displayColumnName: PropTypes.bool,
  onOpenFile: PropTypes.func.isRequired,
  onSelectCard: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
};

export default CardItem;
