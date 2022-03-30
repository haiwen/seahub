import React from 'react';
import ReactDOM from 'react-dom';
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

    const params = window.location.search;
    let isHidden = params.indexOf('?hidden=true') !== -1;

    return (
      <div className="shared-file-view-body pdf-file-view">
        <PDFViewer isSharedView={true} isHidden={isHidden} />
      </div>
    );
  }
}

ReactDOM.render(
  <SharedFileViewPDF />,
  document.getElementById('wrapper')
);
