import React from 'react';
import ReactDOM from 'react-dom';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';
import VideoPlayer from './components/video-player';

import './css/video-file-view.css';

const {
  err, rawPath
} = window.app.pageOptions;

class ViewFileVideo extends React.Component {
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

    const videoJsOptions = {
      autoplay: false,
      controls: true,
      preload: 'auto',
      sources: [{
        src: rawPath
      }]
    };
    return (
      <div className="file-view-content flex-1">
        <VideoPlayer { ...videoJsOptions } />
      </div>
    );
  }
}

ReactDOM.render (
  <ViewFileVideo />,
  document.getElementById('wrapper')
);
