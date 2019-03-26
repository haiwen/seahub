import React from 'react';
import ReactDOM from 'react-dom';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';
import PDFViewer from './components/pdf-viewer';

import './css/pdf-file-view.css';

const { err } = window.app.pageOptions;

class ViewFilePDF extends React.Component {
  render() {
    return (
      <FileView content={<FileContent />} />
    );
  }
}

class FileContent extends React.Component {
  render() {
    if (err) {
      return <FileViewTip />;
    }

    return (
      <div className="file-view-content flex-1 pdf-file-view">
        <PDFViewer />
      </div>
    );
  }
}

ReactDOM.render (
  <ViewFilePDF />,
  document.getElementById('wrapper')
);
