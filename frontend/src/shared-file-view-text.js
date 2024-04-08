import React from 'react';
import ReactDom from 'react-dom';
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

    return (
      <div className="shared-file-view-body text-file-view">
        <SeafileCodeMirror fileExt={fileExt} value={fileContent} />
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
