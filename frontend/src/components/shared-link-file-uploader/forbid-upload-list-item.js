import React from 'react';
import PropTypes from 'prop-types';
import { gettext, maxUploadFileSize } from '../../utils/constants';

const propTypes = {
  file: PropTypes.object,
};

class ForbidUploadListItem extends React.Component {

  render() {
    let { file } = this.props;
    let msg = gettext('Please upload files less than {placeholder}M').replace('{placeholder}', maxUploadFileSize);
    return (
      <tr className="file-upload-item">
        <td className="upload-name">
          <div className="ellipsis" title={file.name}>{file.name}</div>
        </td>

        <td colSpan={3} className="error">{msg}</td>
      </tr>
    );
  }
}

ForbidUploadListItem.propTypes = propTypes;

export default ForbidUploadListItem;
