import React from 'react';
import SeafileCodeMirror from '../seafile-codemirror';
import '../../css/text-file-view.css';

const { fileExt, fileContent } = window.app.pageOptions;

class FileContent extends React.Component {
  render() {
    return (
      <div className="file-view-content flex-1 text-file-view">
        <SeafileCodeMirror fileExt={fileExt} value={fileContent} />
      </div>
    );
  }
}

export default FileContent;
