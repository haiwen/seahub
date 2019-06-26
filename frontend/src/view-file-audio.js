import React from 'react';
import ReactDOM from 'react-dom';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';
import AudioPlayer from './components/audio-player';

import './css/audio-file-view.css';

const {
  err, rawPath
} = window.app.pageOptions;

class ViewFileAudio extends React.Component {
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
      <div className="file-view-content flex-1 audio-file-view">
        <AudioPlayer { ...videoJsOptions } />
      </div>
    );
  }
}

ReactDOM.render (
  <ViewFileAudio />,
  document.getElementById('wrapper')
);
