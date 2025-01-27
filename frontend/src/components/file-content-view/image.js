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
  xmindImageSrc // for xmind file
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
      thumbnailURL = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${Utils.encodePath(filePath)}`;
    }

    // for xmind file
    const xmindSrc = xmindImageSrc ? `${siteRoot}${xmindImageSrc}` : '';

    const { scale, angle } = this.props;
    let style = {};
    if (scale && angle != undefined) {
      style = { transform: `scale(${scale}) rotate(${angle}deg)` };
    } else if (scale) {
      style = { transform: `scale(${scale})` };
    } else if (angle != undefined) {
      style = { transform: `rotate(${angle}deg)` };
    }


    return (
      <div className="file-view-content flex-1 image-file-view">
        {previousImage && (
          <a href={previousImageUrl} id="img-prev" title={gettext('you can also press ← ')}><span className="sf3-font sf3-font-down rotate-90 d-inline-block"></span></a>
        )}
        {nextImage && (
          <a href={nextImageUrl} id="img-next" title={gettext('you can also press →')}><span className="sf3-font sf3-font-down rotate-270 d-inline-block"></span></a>
        )}
        <img src={xmindSrc || thumbnailURL || rawPath} alt={fileName} id="image-view" onError={this.handleLoadFailure} style={ style } />
      </div>
    );
  }
}

FileContent.propTypes = {
  tip: PropTypes.object.isRequired,
  scale: PropTypes.number,
  angle: PropTypes.number
};

export default FileContent;
