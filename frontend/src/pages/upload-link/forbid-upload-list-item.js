import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext, maxUploadFileSize } from '../../utils/constants';

const propTypes = {
  file: PropTypes.object,
};

class ForbidUploadListItem extends React.Component {

  render() {
    let { file } = this.props;
    let msg = gettext('Please upload files less than {placeholder}').replace('{placeholder}', Utils.bytesToSize(maxUploadFileSize * 1000 * 1000));
    return (
      <tr className="file-upload-item">
        <td className="upload-name">
          <div className="ellipsis">{file.name}</div>
        </td>

        <td colSpan={3} className="error">{msg}</td>
      </tr>
    );
  }
}

ForbidUploadListItem.propTypes = propTypes;

export default ForbidUploadListItem;
