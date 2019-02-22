import React from 'react';
import { gettext } from '../../utils/constants';

const { err } = window.app.pageOptions;

class FileViewTip extends React.Component {

  render() {
    let errorMsg;
    if (err == 'File preview unsupported') {
      errorMsg = <p>{gettext('Online view is not applicable to this file format')}</p>;
    } else {
      errorMsg = <p className="error">{err}</p>;
    }   
    return (
      <div className="file-view-content flex-1">
        <div className="file-view-tip">
          {errorMsg}
          <a href="?dl=1" className="btn btn-secondary">{gettext('Download')}</a>
        </div>
      </div>
    );  
  }
}

export default FileViewTip;
