import React from 'react';
import AudioPlayer from '../audio-player';

import '../../css/audio-file-view.css';

const { rawPath } = window.app.pageOptions;

class FileContent extends React.Component {
  render() {
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

export default FileContent;
