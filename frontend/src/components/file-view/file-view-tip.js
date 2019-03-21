import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const { err, filePerm, fileType, repoID, filePath } = window.app.pageOptions;

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

    let canOpenViaClient = false;
    if (filePerm == 'rw' && (fileType == 'Document' || fileType == 'SpreadSheet')) {
      canOpenViaClient = true;
    }

    return (
      <div className="file-view-content flex-1">
        <div className="file-view-tip">
          {errorMsg}
          <a href="?dl=1" className="btn btn-secondary">{gettext('Download')}</a>
          {canOpenViaClient && (
            <React.Fragment>
              <a className="open-via-client" href={`seafile://openfile?repo_id=${repoID}&path=${encodeURIComponent(filePath)}`}>{gettext('Open via Client')}</a>
              <p className="tip">{gettext('Please install the desktop client to open file via client.')}</p>
            </React.Fragment>
          )}
        </div>
      </div>
    );  
  }
}
FileViewTip.propTypes = propTypes;

export default FileViewTip;
