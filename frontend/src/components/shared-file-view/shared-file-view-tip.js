import React from 'react';
import { gettext } from '../../utils/constants';

const { err } = window.shared.pageOptions;

class SharedFileViewTip extends React.Component {
  render() {
    let errorMsg;
    if (err == 'File preview unsupported') {
      errorMsg = <p>{gettext('Online view is not applicable to this file format')}</p>;
    } else {
      errorMsg = <p className="error">{err}</p>;
    }
    return (
      <div className="shared-file-view-body">
        <div className="file-view-tip">
          {errorMsg}
        </div>
      </div>
    );
  }
}

export default SharedFileViewTip;
