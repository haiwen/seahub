import React from 'react';
import VideoPlayer from '../video-player';

import '../../css/video-file-view.css';

const {
  rawPath
} = window.app.pageOptions;

class FileContent extends React.Component {
  render() {
    const videoJsOptions = {
      autoplay: false,
      controls: true,
      preload: 'auto',
      playbackRates: [0.5, 1, 1.5, 2],
      sources: [{
        src: rawPath
      }]
    };
    return (
      <div className="file-view-content flex-1 video-file-view">
        <VideoPlayer { ...videoJsOptions } />
      </div>
    );
  }
}

export default FileContent;
