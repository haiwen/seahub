import React from 'react';
import { createRoot } from 'react-dom/client';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import VideoPlayer from './components/video-player';
import { MimetypesKind } from './utils/constants';

import './css/video-file-view.css';

const { rawPath, err, fileExt } = window.shared.pageOptions;

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
        src: rawPath,
        type: MimetypesKind[fileExt] || 'video/mp4'
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

const root = createRoot(document.getElementById('wrapper'));
root.render(<SharedFileViewImage />);
