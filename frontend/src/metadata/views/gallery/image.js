import React, { useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';
import Icon from '../../../components/icon';

const Image = ({
  isSelected,
  img,
  size,
  useOriginalThumbnail,
  style,
  onClick,
  onDoubleClick,
  onContextMenu,
}) => {
  const [background, setBackground] = useState('#f0f0f0');
  const [useFallback, setUseFallback] = useState(false);

  const [isHovering, setIsHovering] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState(null); // { width, height }

  const videoPlayerRef = useRef(null);
  const hoverTimer = useRef(null);
  const metadataVideo = useRef(null);

  const handleGridItemMouseEnter = useCallback((e) => {
    if (!Utils.videoCheck(img.name)) return;
    setIsHovering(true);

    // Preload video metadata to get dimensions
    if (!metadataVideo.current) {
      metadataVideo.current = document.createElement('video');
      metadataVideo.current.preload = 'metadata';
      metadataVideo.current.src = img.downloadURL;
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
  }, [img]);

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

  const onLoad = useCallback(() => {
    setBackground('unset');
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

  let src = useOriginalThumbnail ? img.thumbnail : img.src;
  if (useFallback) {
    src = Utils.getFileIconUrl(img.name);
  }

  const isVideo = Utils.videoCheck(img.name);
  const shouldHideBasePreview = isVideo && showVideoPreview && videoReady;

  return (
    <div
      id={img.id}
      className={classnames('metadata-gallery-image-item', {
        'metadata-gallery-image-item-selected': isSelected,
        'video-preview-container': isVideo,
        'position-relative': isVideo
      })}
      style={{ width: size, height: size, background, ...style }}
      onClick={(e) => onClick(e, img)}
      onDoubleClick={(e) => onDoubleClick(e, img)}
      onContextMenu={(e) => onContextMenu(e, img)}
      aria-label={img.name}
      tabIndex={0}
      role='button'
      onKeyDown={Utils.onKeyDown}
      onMouseEnter={handleGridItemMouseEnter}
      onMouseLeave={handleGridItemMouseLeave}
    >
      <img
        className={classnames('metadata-gallery-grid-image', 'grid-preview-thumb', { 'grid-preview-thumb--hidden': shouldHideBasePreview })}
        src={src}
        alt={img.name}
        draggable="false"
        onLoad={onLoad}
        onError={() => setUseFallback(true)}
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
              src={showVideoPreview ? img.downloadURL : undefined}
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
    </div>
  );
};

Image.propTypes = {
  isSelected: PropTypes.bool,
  img: PropTypes.object,
  size: PropTypes.number,
  style: PropTypes.object,
  useOriginalThumbnail: PropTypes.bool,
  onClick: PropTypes.func,
  onDoubleClick: PropTypes.func,
  onContextMenu: PropTypes.func,
};

export default Image;
