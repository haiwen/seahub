import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import Icon from '../../components/icon';

const propTypes = {
  file: PropTypes.object,
};

class ForbidUploadListItem extends React.Component {

  render() {
    const { file } = this.props;
    return (
      <tr className="file-upload-item">
        <td className="upload-name">
          <div className="ellipsis">{file.name}</div>
        </td>
        <td>{Utils.bytesToSize(file.size)}</td>
        <td>
          <div
            className="d-flex align-items-center"
            aria-label={gettext('File too large')}
            title={gettext('File too large')}
            role="button"
            tabIndex={0}
          >
            <span
              className="d-flex align-items-center upload-failure-icon mr-2"
              aria-hidden="true"
            >
              <Icon symbol="info" />
            </span>
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
