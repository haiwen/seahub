import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';

import '../../css/image-file-view.css';

const {
  repoID, repoEncrypted,
  fileExt, filePath, fileName,
  thumbnailSizeForOriginal,
  previousImage, nextImage, rawPath,
  lastModificationTime,
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
      loadFailed: false
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

  render() {
    if (this.state.loadFailed) {
      return this.props.tip;
    }

    // request thumbnails for some files
    // only for 'file view'. not for 'history/trash file view'
    let thumbnailURL = '';
    const fileExtList = ['tif', 'tiff', 'psd', 'heic'];
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
    if (scale > 1 && offset && typeof offset === 'object') {
      if (offset.x !== undefined) style.left = offset.x;
      if (offset.y !== undefined) style.top = offset.y;
      style.position = 'relative';
    }

    return (
      <div className="file-view-content flex-1 image-file-view d-flex align-items-center justify-content-center">
        {previousImage && (
          <a href={previousImageUrl} id="img-prev" title={gettext('you can also press ← ')}><span className="sf3-font sf3-font-down rotate-90 d-inline-block"></span></a>
        )}
        {nextImage && (
          <a href={nextImageUrl} id="img-next" title={gettext('you can also press →')}><span className="sf3-font sf3-font-down rotate-270 d-inline-block"></span></a>
        )}
        <img src={thumbnailURL || rawPath} alt={fileName} id="image-view" onError={this.handleLoadFailure} style={ style } />
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
