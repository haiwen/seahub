import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import Download from './download';

const propTypes = {
  err: PropTypes.string
};
const { canDownloadFile, err } = window.app.pageOptions;
const UNSUPPORTED = 'File preview unsupported';

class FileViewTip extends React.Component {

  render() {
    let errorMsg;
    if (err == UNSUPPORTED || this.props.err == UNSUPPORTED) {
      errorMsg = <p>{gettext('Online view is not applicable to this file format')}</p>;
    } else {
      errorMsg = <p className="error">{err}</p>;
    }

    return (
      <div className="file-view-content flex-1 o-auto">
        <div className="file-view-tip">
          {errorMsg}
          {canDownloadFile && <Download />}
        </div>
      </div>
    );
  }
}
FileViewTip.propTypes = propTypes;

export default FileViewTip;
