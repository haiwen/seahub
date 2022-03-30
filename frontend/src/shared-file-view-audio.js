import React from 'react';
import ReactDOM from 'react-dom';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import AudioPlayer from './components/audio-player';
import { mediaUrl } from './utils/constants';

import './css/audio-file-view.css';

const { rawPath, err } = window.shared.pageOptions;

class SharedFileViewAudio extends React.Component {
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
      sources: [{
        src: rawPath
      }]
    };

    const params = window.location.search;
    let isHidden = params.indexOf('?hidden=true') !== -1;

    return (
      <div className="shared-file-view-body d-flex">
        <div className="flex-1">
          <AudioPlayer { ...videoJsOptions } />
          {!isHidden &&
            <div className="pingan-copyright">Powered By &nbsp;<img width="16" height="16" style={{"margin-top": "1px"}} src={`${mediaUrl}/img/logo-p.png`}></img>平安科技办公技术服务部</div>
          }
        </div>
      </div>
    );
  }
}

ReactDOM.render(
  <SharedFileViewAudio />,
  document.getElementById('wrapper')
);
