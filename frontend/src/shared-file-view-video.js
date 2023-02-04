import React from 'react';
import ReactDom from 'react-dom';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import VideoPlayer from './components/video-player';

import './css/video-file-view.css';

const { rawPath, err } = window.shared.pageOptions;

class SharedFileViewImage extends React.Component {
  render() {
    return <SharedFileView content={<FileContent />} />;
  }
}

class FileContent extends React.Component {
  render() {
    if (err) {
      return <SharedFileViewTip />;
    }

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
      <div className="shared-file-view-body d-flex">
        <div className="flex-1">
          <VideoPlayer { ...videoJsOptions } />
        </div>
      </div>
    );
  }
}

ReactDom.render(<SharedFileViewImage />, document.getElementById('wrapper'));
