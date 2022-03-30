import React from 'react';
import ReactDOM from 'react-dom';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import VideoPlayer from './components/video-player';
import { mediaUrl } from './utils/constants';

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

    const params = window.location.search;
    let isHidden = params.indexOf('?hidden=true') !== -1;

    const videoJsOptions = {
      autoplay: false,
      controls: true,
      preload: 'auto',
      sources: [{
        src: rawPath
      }]
    };
    return (
      <div className="shared-file-view-body d-flex">
        <div className="flex-1">
          <VideoPlayer { ...videoJsOptions } />
          {!isHidden &&
            <div className="pingan-copyright">Powered By &nbsp;<img width="16" height="16" style={{"margin-top": "1px"}} src={`${mediaUrl}/img/logo-p.png`}></img>平安科技办公技术服务部</div>
          }
        </div>
      </div>
    );
  }
}

ReactDOM.render(
  <SharedFileViewImage />,
  document.getElementById('wrapper')
);
