import React from 'react';
import PropTypes from 'prop-types';
import watermark from 'watermark-dom';
import { gettext, siteName } from '../../utils/constants';
import Download from './download';

import '../../css/file-view.css';

const propTypes = {
  content: PropTypes.object.isRequired
};

const {
  fromTrash,
  fileName, commitTime,
  canDownloadFile,
  enableWatermark, userNickName
} = window.app.pageOptions;


class FileView extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="h-100 d-flex flex-column flex-1">
        <div className="file-view-header d-flex justify-content-between align-items-center">
          <div>
            <h2 className="file-title">{fileName}</h2>
            <p className="meta-info m-0">{fromTrash ? `${gettext('Current Path: ')}${gettext('Trash')}`: commitTime}</p>
          </div>
          {canDownloadFile && <Download />}
        </div>
        <div className="file-view-body flex-auto d-flex o-hidden">
          {this.props.content}
        </div>
      </div>
    );
  }
}

if (enableWatermark) {
  watermark.init({
    watermark_txt: `${siteName} ${userNickName}`,
    watermark_alpha: 0.075
  });
}

FileView.propTypes = propTypes;

export default FileView;
