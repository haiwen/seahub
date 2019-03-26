import React from 'react';
import ReactDOM from 'react-dom';
import { siteRoot } from './utils/constants';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';

import './css/image-file-view.css';

const { err, fileName, xmindImageSrc } = window.app.pageOptions;

class ViewFileXmind extends React.Component {
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
      <div className="file-view-content flex-1 image-file-view">
        <img src={`${siteRoot}${xmindImageSrc}`} alt={fileName} id="image-view" />
      </div>
    );
  }
}

ReactDOM.render (
  <ViewFileXmind />,
  document.getElementById('wrapper')
);
