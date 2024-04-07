import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';

const propTypes = {
  file: PropTypes.object,
};

class ForbidUploadListItem extends React.Component {

  render() {
    const { file } = this.props;
    return (
      <tr className="file-upload-item">
        <td className="upload-name">
          <div className="ellipsis" title={file.name}>{file.name}</div>
        </td>
        <td>{Utils.bytesToSize(file.size)}</td>
        <td>
          <div className="d-flex align-items-center">
            <span className="upload-failure-icon fas fa-exclamation mr-2"></span>
            <span className="upload-failure-msg">{gettext('File too large')}</span>
          </div>
        </td>
        <td></td>
      </tr>
    );
  }
}

ForbidUploadListItem.propTypes = propTypes;

export default ForbidUploadListItem;
