import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  item: PropTypes.object.isRequired,
  onUploadCancel: PropTypes.func.isRequired,
};

class UploadListItem extends React.Component {

  onUploadCancel = (e) => {
    e.preventDefault();
    this.props.onUploadCancel(this.props.item);
  }

  formatFileSize = (size) => {
    if (typeof size !== 'number') {
      return '';
    }
    if (size >= 1000 * 1000 * 1000) {
      return (size / (1000 * 1000 * 1000)).toFixed(1) + ' G';
    }
    if (size >= 1000 * 1000) {
      return (size / (1000 * 1000)).toFixed(1) + ' M';
    }
    if (size >= 1000) {
      return (size / 1000).toFixed(1) + ' K';
    }
    return size.toFixed(1) + ' B';
  }

  render() {
    let { item } = this.props;
    let progress = Math.round(item.resumableFile.progress() * 100);
    let error = item.resumableFile.error;

    return (
      <tr className="file-upload-item">
        <td className="upload-name">
          <div className="ellipsis">{item.resumableFile.relativePath}</div>
          <div className="message err-message ml-0">{error}</div>
        </td>
        <td className="upload-progress">
          <span className="file-size">{this.formatFileSize(item.resumableFile.size)}</span>
          {!item.resumableFile.error && progress !== 100 &&
            <div className="progress">
              <div className="progress-bar" role="progressbar" style={{width: `${progress}%`}} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"></div>
            </div>
          }
        </td>
        <td className="upload-operation">
          {!item.resumableFile.error && (
            <Fragment>
              {(!item.isSaved && progress !== 100) && (
                <a href="#" onClick={this.onUploadCancel}>{gettext('cancel')}</a>
              )}
              {(!item.isSaved && progress === 100) && (
                <span className="saving">{gettext('saving...')}</span>
              )}
              {item.isSaved && (
                <span className="uploaded">{gettext('uploaded')}</span>
              )}
            </Fragment>
          )}
        </td>
      </tr>
    );
  }
}

UploadListItem.propTypes = propTypes;

export default UploadListItem;
