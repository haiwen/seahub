import React from 'react';
import ReactDOM from 'react-dom';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';

import './css/svg-file-view.css';

const {
  err, fileName, rawPath
} = window.app.pageOptions;

class ViewFileSVG extends React.Component {
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
      <div className="file-view-content flex-1 svg-file-view">
        <img src={rawPath} alt={fileName} id="svg-view" />
      </div>
    );
  }
}

ReactDOM.render (
  <ViewFileSVG />,
  document.getElementById('wrapper')
);
