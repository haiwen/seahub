import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const { err, trafficOverLimit, zipped, filePath } = window.shared.pageOptions;

const propTypes = {
  errorMsg: PropTypes.string
};

class SharedFileViewTip extends React.Component {
  render() {
    let errorMsg;
    if (err == 'File preview unsupported') {
      errorMsg = <p>{gettext('Online view is not applicable to this file format')}</p>;
    } else {
      errorMsg = <p className="error">{err || this.props.errorMsg}</p>;
    }
    return (
      <div className="shared-file-view-body">
        <div className="file-view-tip">
          {errorMsg}
          {!trafficOverLimit &&
            <a href={`?${zipped ? 'p=' + encodeURIComponent(filePath) + '&' : ''}dl=1`} className="btn btn-secondary">{gettext('Download')}</a>
          }
        </div>
      </div>
    );
  }
}

SharedFileViewTip.propTypes = propTypes;

export default SharedFileViewTip;
