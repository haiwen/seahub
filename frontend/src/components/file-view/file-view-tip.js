import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const { err } = window.app.pageOptions;

const propTypes = {
  errorMsg: PropTypes.string
};

class FileViewTip extends React.Component {

  render() {
    let errorMsg;
    if (err == 'File preview unsupported') {
      errorMsg = <p>{gettext('Online view is not applicable to this file format')}</p>;
    } else {
      errorMsg = <p className="error">{err || this.props.errorMsg}</p>;
    }

    return (
      <div className="file-view-content flex-1 o-auto">
        <div className="file-view-tip">
          {errorMsg}
          <a href="?dl=1" className="btn btn-secondary">{gettext('Download')}</a>
        </div>
      </div>
    );
  }
}
FileViewTip.propTypes = propTypes;

export default FileViewTip;
