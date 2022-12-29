import React from 'react';
import ReactDom from 'react-dom';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import PDFViewer from './components/pdf-viewer';

import './css/pdf-file-view.css';

const { err } = window.shared.pageOptions;

class SharedFileViewPDF extends React.Component {
  render() {
    return <SharedFileView content={<FileContent />} />;
  }
}

class FileContent extends React.Component {
  render() {
    if (err) {
      return <SharedFileViewTip />;
    }

    return (
      <div className="shared-file-view-body pdf-file-view">
        <PDFViewer />
      </div>
    );
  }
}

ReactDom.render(<SharedFileViewPDF />, document.getElementById('wrapper'));
