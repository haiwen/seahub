import React from 'react';
import { Utils } from '../../utils/utils';
import SeafileCodeMirror from '../seafile-codemirror';
import '../../css/text-file-view.css';

const { fileExt, fileContent } = window.app.pageOptions;

class FileContent extends React.Component {
  render() {
    const mode = Utils.chooseLanguage(fileExt);
    return (
      <div className="file-view-content flex-1 text-file-view">
        <SeafileCodeMirror mode={mode} value={fileContent} />
      </div>
    );
  }
}

export default FileContent;
