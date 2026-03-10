import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';
import Icon from '../icon';

import '../../css/image-file-view.css';

const {
  repoID, repoEncrypted,
  fileExt, filePath, fileName,
  thumbnailSizeForOriginal,
  previousImage, nextImage, rawPath,
  lastModificationTime,
  livePhotoVideoUrl,
} = window.app.pageOptions;

let previousImageUrl;
let nextImageUrl;
if (previousImage) {
  previousImageUrl = `${siteRoot}lib/${repoID}/file${Utils.encodePath(previousImage)}`;
}
if (nextImage) {
  nextImageUrl = `${siteRoot}lib/${repoID}/file${Utils.encodePath(nextImage)}`;
}

class FileContent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loadFailed: false,
      isPlayingLivePhoto: false,
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', (e) => {
      if (previousImage && e.keyCode == 37) { // press '<-'
        location.href = previousImageUrl;
      }
      if (nextImage && e.keyCode == 39) { // press '->'
        location.href = nextImageUrl;
      }
    });
  }

  handleLoadFailure = () => {
    this.setState({
      loadFailed: true
    });
  };

  handlePlayLivePhoto = () => {
    this.setState({ isPlayingLivePhoto: true });
  };

  handleVideoEnded = () => {
    this.setState({ isPlayingLivePhoto: false });
  };

  handleVideoError = () => {
    // Not a live photo or video extraction failed
    this.setState({ isPlayingLivePhoto: false });
  };

  render() {
    if (this.state.loadFailed) {
      return this.props.tip;
    }

    // request thumbnails for some files
    // only for 'file view'. not for 'history/trash file view'
    let thumbnailURL = '';
    const fileExtList = ['tif', 'tiff', 'psd', 'psb', 'heic'];
    if (!repoEncrypted && fileExtList.includes(fileExt)) {
      thumbnailURL = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${Utils.encodePath(filePath)}?mtime=${lastModificationTime}`;
    }

    const { scale, angle, offset } = this.props;
    let transforms = [];

    if (scale) {
      transforms.push(`scale(${scale})`);
    }
    if (angle !== undefined) {
      transforms.push(`rotate(${angle}deg)`);
    }

    let style = {};
    if (transforms.length > 0) {
      style.transform = transforms.join(' ');
    }
    if (offset && typeof offset === 'object') {
      if (offset.x !== undefined) {
        style.left = offset.x;
      }
      if (offset.y !== undefined) {
        style.top = offset.y;
      }
      style.position = 'relative';
    }

    const { isPlayingLivePhoto } = this.state;

    return (
      <div className="file-view-content flex-1 image-file-view d-flex align-items-center justify-content-center">
        {previousImage && (
          <a href={previousImageUrl} id="img-prev" title={gettext('you can also press ← ')}>
            <Icon symbol="down" className="rotate-90" />
          </a>
        )}
        {nextImage && (
          <a href={nextImageUrl} id="img-next" title={gettext('you can also press →')}>
            <Icon symbol="down" className="rotate-270" />
          </a>
        )}
        {isPlayingLivePhoto ? (
          <video
            src={livePhotoVideoUrl}
            autoPlay
            onEnded={this.handleVideoEnded}
            onError={this.handleVideoError}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        ) : (
          <>
            <img src={thumbnailURL || rawPath} alt={fileName} id="image-view" onError={this.handleLoadFailure} style={style} />
            {livePhotoVideoUrl && (
              <button className="live-photo-badge" onClick={this.handlePlayLivePhoto} title={gettext('Play Live Photo')}>
                LIVE
              </button>
            )}
          </>
        )}
      </div>
    );
  }
}

FileContent.propTypes = {
  tip: PropTypes.object.isRequired,
  scale: PropTypes.number,
  angle: PropTypes.number,
  offset: PropTypes.object,
};

export default FileContent;

