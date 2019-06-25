import React from 'react';

import '../../css/svg-file-view.css';

const {
  fileName, rawPath
} = window.app.pageOptions;

class FileContent extends React.Component {
  render() {
    return (
      <div className="file-view-content flex-1 svg-file-view">
        <img src={rawPath} alt={fileName} id="svg-view" />
      </div>
    );
  }
}

export default FileContent;
