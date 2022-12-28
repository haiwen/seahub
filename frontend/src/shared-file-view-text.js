import React from 'react';
import ReactDom from 'react-dom';
import { Utils } from './utils/utils';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import SeafileCodeMirror from './components/seafile-codemirror';
import './css/text-file-view.css';

const { err, fileExt, fileContent } = window.shared.pageOptions;

class FileContent extends React.Component {
  render() {
    if (err) {
      return <SharedFileViewTip />;
    }

    const mode = Utils.chooseLanguage(fileExt);
    return (
      <div className="shared-file-view-body text-file-view">
        <SeafileCodeMirror mode={mode} value={fileContent} />
      </div>
    );
  }
}

class SharedFileViewText extends React.Component {
  render() {
    return <SharedFileView content={<FileContent />} />;
  }
}

ReactDom.render(<SharedFileViewText />, document.getElementById('wrapper'));
