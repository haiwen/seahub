import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  item: PropTypes.object.isRequired,
  onUploadCancel: PropTypes.func.isRequired,
};

class UploadListItem extends React.Component {

  onUploadCancel = () => {
    let item = this.props.item;
    item.resumableFile.cancel();
    this.props.onUploadCancel(item);
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
    return (
      <tr className="file-upload-item">
        <td width="50%" className="upload-name ellipsis">{item.resumableFile.relativePath}</td>
        <td width="30%" className="upload-progress upload-size">
          {
            progress === 100 ? this.formatFileSize(item.resumableFile.size) : progress + '%'
          }
        </td>
        <td width="20%" className="upload-operation">
          { progress !== 100 ?
            <span className="a-simulate" onClick={this.onUploadCancel}>{gettext(('cancel'))}</span> :
            <span>{gettext('uploaded')}</span>
          }
        </td>
      </tr>
    );
  }
}

UploadListItem.propTypes = propTypes;

export default UploadListItem;
