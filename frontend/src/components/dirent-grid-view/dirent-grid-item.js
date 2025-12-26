import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import urlJoin from 'url-join';
import { gettext, siteRoot, mediaUrl, enableVideoThumbnail, enablePDFThumbnail, fileServerRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { imageThumbnailCenter, videoThumbnailCenter } from '../../utils/thumbnail-center';
import Icon from '../icon';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  onItemClick: PropTypes.func.isRequired,
  showImagePopup: PropTypes.func.isRequired,
  onGridItemContextMenu: PropTypes.func.isRequired,
  onGridItemClick: PropTypes.func.isRequired,
  onGridItemMouseDown: PropTypes.func,
  currentRepoInfo: PropTypes.object,
  onItemMove: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
};

class DirentGridItem extends React.Component {

  constructor(props) {
    super(props);
    let dirent = props.dirent;
    this.state = {
      dirent,
      isGridDropTipShow: false,
      isHovering: false,
      showVideoPreview: false,
      isMuted: true,
      videoProgress: 0,
      videoReady: false,
      videoDimensions: null, // { width, height }
    };
    const { isCustomPermission, customPermission } = Utils.getUserPermission(dirent.permission);
    this.canPreview = true;
    this.canDrag = dirent.permission === 'rw';
    if (isCustomPermission) {
      const { preview, modify } = customPermission.permission;
      this.canPreview = preview || modify;
      this.canDrag = modify;
    }
    this.ref = React.createRef();
    this.videoPlayerRef = React.createRef();
    this.clickTimeout = null;
    this.hoverTimer = null;
    this.metadataVideo = null;
    this.isGeneratingThumbnail = false;
    this.thumbnailCenter = null;
  }

  checkGenerateThumbnail = (dirent) => {
    if (this.props.repoEncrypted || dirent.encoded_thumbnail_src || dirent.encoded_thumbnail_src === '') {
      return false;
    }
    if (enableVideoThumbnail && Utils.videoCheck(dirent.name)) {
      this.thumbnailCenter = videoThumbnailCenter;
      return true;
    }
    if (Utils.imageCheck(dirent.name) || (enablePDFThumbnail && Utils.pdfCheck(dirent.name))) {
      this.thumbnailCenter = imageThumbnailCenter;
      return true;
    }

    return false;
  };

  componentDidMount() {
    const { repoID, path } = this.props;
    const { dirent } = this.state;
    if (this.checkGenerateThumbnail(dirent)) {
      this.isGeneratingThumbnail = true;
      this.thumbnailCenter.createThumbnail({
        repoID,
        path: urlJoin(path, dirent.name),
        callback: this.updateDirentThumbnail,
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.dirent !== this.props.dirent) {
      this.setState({ dirent: this.props.dirent });
    }

    const { repoID, path } = this.props;
    const { dirent } = this.state;
    if (this.checkGenerateThumbnail(dirent) && !this.isGeneratingThumbnail) {
      this.isGeneratingThumbnail = true;
      this.thumbnailCenter.createThumbnail({
        repoID,
        path: urlJoin(path, dirent.name),
        callback: this.updateDirentThumbnail,
      });
    }
  }

  componentWillUnmount() {
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
    }
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }
    if (this.metadataVideo) {
      this.metadataVideo.onloadedmetadata = null;
      this.metadataVideo.onerror = null;
      this.metadataVideo.src = '';
      this.metadataVideo = null;
    }
    if (this.videoPlayerRef.current?.player) {
      try {
        this.videoPlayerRef.current.player.dispose();
      } catch (e) {
        // ignore
      }
    }
    if (this.isGeneratingThumbnail) {
      const { dirent } = this.state;
      const { repoID, path } = this.props;
      this.thumbnailCenter.cancelThumbnail({
        repoID,
        path: [path, dirent.name].join('/'),
      });
      this.thumbnailCenter = null;
    }
    this.setState = () => {};
  }

  updateDirentThumbnail = (encoded_thumbnail_src) => {
    this.isGeneratingThumbnail = false;
    let dirent = this.state.dirent;
    dirent.encoded_thumbnail_src = encoded_thumbnail_src;
    this.setState({ dirent });
  };

  onItemClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const { dirent } = this.state;

    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
      this.handleSingleClick(dirent, e);
      return;
    }

    this.clickTimeout = setTimeout(() => {
      this.clickTimeout = null;
      this.handleSingleClick(dirent, e);
    }, 100); // Clicks within 100 milliseconds is considered a single click.
  };

  handleSingleClick = (dirent, event) => {
    if (!this.canPreview) {
      return;
    }

    if (dirent.isSelected && !event.metaKey && !event.ctrlKey) {
      this.handleDoubleClick(dirent, event);
    } else {
      this.props.onGridItemClick(dirent, event);
    }
  };

  handleDoubleClick = (dirent, event) => {
    if (Utils.imageCheck(dirent.name)) {
      this.props.showImagePopup(dirent);
    } else {
      this.props.onItemClick(dirent);
    }
  };

  onItemLinkClick = (e) => {
    e.preventDefault();
    const { dirent } = this.state;

    if (dirent.isDir()) {
      this.props.onItemClick(dirent);
      return;
    }

    // is have preview permission
    if (!this.canPreview) {
      return;
    }

    this.handleDoubleClick(dirent, e);
  };

  onGridItemDragStart = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }

    const { selectedDirentList, path } = this.props;
    const dragStartItemsData = selectedDirentList.length > 0 ? selectedDirentList.map(dirent => ({
      nodeDirent: dirent,
      nodeParentPath: path
    })) : { nodeDirent: this.state.dirent, nodeParentPath: this.props.path };

    const serializedData = JSON.stringify(dragStartItemsData);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/drag-item-info', serializedData);
  };

  onGridItemDragEnter = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    if (this.state.dirent.type === 'dir') {
      this.setState({ isGridDropTipShow: true });
    }
  };

  onGridItemDragOver = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  onGridItemDragLeave = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }

    if (this.ref.current && this.ref.current.contains(e.relatedTarget)) {
      return;
    }

    this.setState({ isGridDropTipShow: false });
  };

  onGridItemDragDrop = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    this.setState({ isGridDropTipShow: false });
    if (e.dataTransfer.files.length) { // uploaded files
      return;
    }

    let selectedPath = Utils.joinPath(this.props.path, this.state.dirent.name);
    let dragStartItemsData = e.dataTransfer.getData('application/drag-item-info');
    dragStartItemsData = JSON.parse(dragStartItemsData);

    if (!Array.isArray(dragStartItemsData)) {
      let { nodeDirent, nodeParentPath } = dragStartItemsData;
      let dropItemData = this.state.dirent;
      if (nodeDirent.name === dropItemData.name) {
        return;
      }
      if (dropItemData.type !== 'dir') {
        return;
      }
      this.props.onItemMove(this.props.currentRepoInfo, nodeDirent, selectedPath, nodeParentPath);
    } else {
      // if current dirent is a dir and selected list include it, return
      if (dragStartItemsData.some(item => item.nodeDirent.name === this.state.dirent.name)) {
        return;
      }
      this.props.onItemsMove(this.props.currentRepoInfo, selectedPath);
    }
  };

  onGridItemMouseDown = (event) => {
    this.props.onGridItemMouseDown(event);
  };

  onGridItemContextMenu = (event) => {
    this.props.onGridItemContextMenu(event, this.state.dirent);
  };

  onGridItemMouseEnter = (e) => {
    const { dirent } = this.state;

    if (!Utils.videoCheck(dirent.name) || !this.canPreview) return;
    this.setState({ isHovering: true });

    // Preload video metadata to get dimensions
    if (!this.metadataVideo) {
      this.metadataVideo = document.createElement('video');
      this.metadataVideo.preload = 'metadata';
      this.metadataVideo.src = this.getVideoSrc();
      this.metadataVideo.onloadedmetadata = () => {
        const maxSize = 96;
        const videoWidth = this.metadataVideo.videoWidth;
        const videoHeight = this.metadataVideo.videoHeight;
        const aspectRatio = videoWidth / videoHeight;

        let displayWidth; let displayHeight;
        if (aspectRatio > 1) {
          // Landscape
          displayWidth = Math.min(videoWidth, maxSize);
          displayHeight = displayWidth / aspectRatio;
        } else {
          // Portrait
          displayHeight = Math.min(videoHeight, maxSize);
          displayWidth = displayHeight * aspectRatio;
        }

        this.setState({ videoDimensions: { width: displayWidth, height: displayHeight } });
      };
    }

    this.hoverTimer = setTimeout(() => {
      this.setState({ showVideoPreview: true });
    }, 500);
  };

  onGridItemMouseLeave = () => {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }

    const video = this.getVideoElement();
    if (video) {
      video.pause();
      video.currentTime = 0;
    }

    this.setState({
      isHovering: false,
      showVideoPreview: false,
      videoProgress: 0,
      videoReady: false
    });
  };

  getVideoElement = () => {
    return this.videoPlayerRef.current;
  };

  handleVideoTimeUpdate = (e) => {
    const video = e.target;
    const progress = (video.currentTime / video.duration) * 100;
    this.setState({ videoProgress: progress || 0 });
  };

  handleVideoLoadedMetadata = () => {
    if (!this.state.showVideoPreview) return;
    const video = this.getVideoElement();
    if (video && video.paused) {
      video.play().catch(() => {
        // ignore autoplay errors
      });
    }
  };

  handleVideoPlaying = () => {
    if (this.state.showVideoPreview) {
      this.setState({ videoReady: true });
    }
  };

  handleToggleMute = (e) => {
    e.stopPropagation();
    e.preventDefault();
    this.setState({ isMuted: !this.state.isMuted });
  };

  getVideoSrc = () => {
    const { repoID, dirent, path } = this.props;
    const filePath = Utils.encodePath(Utils.joinPath(path, dirent.name));
    return `${fileServerRoot}repos/${repoID}/files${filePath}?op=download`;
  };

  getTextRenderWidth = (text, font) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = font || '14px Arial';
    const metrics = context.measureText(text);
    return metrics.width;
  };

  getRenderedText = (dirent) => {
    const containerWidth = 230;

    let tagRenderWidth = 0;
    if (dirent.file_tags && dirent.file_tags.length > 0) {
      if (dirent.file_tags.length === 1) {
        tagRenderWidth = 16;
      } else {
        tagRenderWidth = 16 + (dirent.file_tags.length - 1) * 8;
      }
    }
    let remainWidth = containerWidth - tagRenderWidth;
    let nameRenderWidth = this.getTextRenderWidth(dirent.name);
    let showName = '';
    if (nameRenderWidth > remainWidth) {
      let dotIndex = dirent.name.lastIndexOf('.');
      let frontName = dirent.name.slice(0, dotIndex - 2);
      let backName = dirent.name.slice(dotIndex - 2);
      let sum = 0;
      for (let i = 0; i < frontName.length; i++) {
        // Use charCodeAt(i) > 127 to check Chinese and English.
        // English and symbols occupy 1 position, Chinese and others occupy 2 positions.
        frontName.charCodeAt(i) > 127 ? (sum = sum + 2) : (sum = sum + 1);
        // When sum position exceeds 20, back string will not be displayed.
        if (sum > 20) {
          frontName = frontName.slice(0, i) + '...';
          break;
        }
      }
      showName = frontName + backName;
    } else {
      showName = dirent.name;
    }
    return showName;
  };

  getDirentLink = (dirent) => {
    let { path, repoID, currentRepoInfo } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    let link = '';
    if (dirent.type === 'dir') {
      if (currentRepoInfo) {
        link = siteRoot + 'library/' + repoID + '/' + currentRepoInfo.repo_name + Utils.encodePath(direntPath);
      }
    } else {
      link = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(direntPath);
      if (dirent.is_sdoc_revision && dirent.revision_id) {
        link = siteRoot + 'lib/' + repoID + '/revisions/' + dirent.revision_id + '/';
      }
    }
    return link;
  };

  onError = () => {
    const { dirent } = this.state;
    if (Utils.isEditableSdocFile(dirent.name)) {
      let dirent = this.state.dirent;
      dirent.encoded_thumbnail_src = '';
      this.setState({ dirent });
    }
  };

  render() {
    let { dirent, isGridDropTipShow, isHovering, showVideoPreview, videoReady, videoDimensions, isMuted, videoProgress } = this.state;
    let { is_freezed, is_locked, lock_owner_name, isSelected } = dirent;
    const showName = this.getRenderedText(dirent);
    const isVideo = Utils.videoCheck(dirent.name);
    const shouldHideBasePreview = isVideo && showVideoPreview && videoReady;

    return (
      <>
        <li
          className={classnames('grid-item cursor-pointer', { 'grid-selected-active': isSelected })}
          onContextMenu={this.onGridItemContextMenu}
          onMouseDown={this.onGridItemMouseDown}
          onClick={this.onItemClick}
          onMouseEnter={this.onGridItemMouseEnter}
          onMouseLeave={this.onGridItemMouseLeave}
        >
          <div
            ref={this.ref}
            className={classnames('grid-file-img-link', {
              'grid-drop-show': isGridDropTipShow,
              'video-preview-container': isVideo
            })}
            draggable={this.canDrag}
            onDragStart={this.onGridItemDragStart}
            onDragEnter={this.onGridItemDragEnter}
            onDragOver={this.onGridItemDragOver}
            onDragLeave={this.onGridItemDragLeave}
            onDrop={this.onGridItemDragDrop}
          >
            {(this.canPreview && dirent.encoded_thumbnail_src) ?
              <img
                src={`${siteRoot}${dirent.encoded_thumbnail_src || ''}?mtime=${dirent.mtime}`}
                className={classnames('thumbnail', 'grid-preview-thumb', { 'grid-preview-thumb--hidden': shouldHideBasePreview })}
                tabIndex="0"
                onClick={this.onItemClick}
                onKeyDown={Utils.onKeyDown}
                alt={dirent.name}
                draggable={false}
                onError={this.onError}
              /> :
              <img
                src={Utils.getDirentIcon(dirent, true)}
                width="80"
                height="80"
                alt=""
                draggable={false}
                className={classnames('grid-preview-thumb', 'grid-preview-icon', { 'grid-preview-thumb--hidden': shouldHideBasePreview })}
              />
            }
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
                    ref={this.videoPlayerRef}
                    src={showVideoPreview ? this.getVideoSrc() : undefined}
                    autoPlay={showVideoPreview}
                    muted={isMuted}
                    loop
                    playsInline
                    preload={showVideoPreview ? 'auto' : 'none'}
                    onLoadedMetadata={this.handleVideoLoadedMetadata}
                    onPlaying={this.handleVideoPlaying}
                    onTimeUpdate={this.handleVideoTimeUpdate}
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
                        onClick={this.handleToggleMute}
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
            {is_locked &&
              <img
                className="grid-file-locked-icon"
                src={`${mediaUrl}img/file-${is_freezed ? 'freezed-32.svg' : 'locked-32.png'}`}
                alt={is_freezed ? gettext('freezed') : gettext('locked')}
                title={(is_freezed ? gettext('Frozen by {name}') : gettext('locked by {name}')).replace('{name}', lock_owner_name)}
                draggable={false}
              />
            }
          </div>
          <div className="grid-file-name" onDragStart={this.onGridItemDragStart} draggable={this.canDrag} >
            {(!dirent.isDir() && !this.canPreview) ?
              <a
                className="sf-link grid-file-name-link"
                onClick={this.onItemClick}
                title={dirent.name}
              >{showName}
              </a> :
              <a
                className="grid-file-name-link"
                href={this.getDirentLink(dirent)}
                onClick={this.onItemClick}
                title={dirent.name}
              >{showName}
              </a>
            }
          </div>
        </li>
      </>
    );
  }
}

DirentGridItem.propTypes = propTypes;

export default DirentGridItem;
