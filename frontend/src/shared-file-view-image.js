import React from 'react';
import ReactDOM from 'react-dom';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import { gettext } from './utils/constants';
import { mediaUrl } from './utils/constants';

import './css/image-file-view.css';

const { fileName, rawPath, err, prevImgPath, nextImgPath } = window.shared.pageOptions;

const prevImgURL = `?p=${encodeURIComponent(prevImgPath)}`;
const nextImgURL = `?p=${encodeURIComponent(nextImgPath)}`;

class SharedFileViewImage extends React.Component {
  render() {
    return <SharedFileView content={<FileContent />} />;
  }
}

class FileContent extends React.Component {

  componentDidMount() {
    document.addEventListener('keydown', (e) => {
      if (prevImgPath && e.keyCode == 37) { // press '<-'
        location.href = prevImgURL;
      }
      if (nextImgPath && e.keyCode == 39) { // press '->'
        location.href = nextImgURL;
      }
    });
  }

  render() {
    if (err) {
      return <SharedFileViewTip />;
    }

    const params = window.location.search;
    let isHidden = params.indexOf('?hidden=true') !== -1;

    return (
      <div className="shared-file-view-body">
        <div className="image-file-view">
          {prevImgPath && (
            <a href={prevImgURL} id="img-prev" title={gettext('you can also press ← ')}><span className="fas fa-chevron-left"></span></a>
          )}
          {nextImgPath && (
            <a href={nextImgURL} id="img-next" title={gettext('you can also press →')}><span className="fas fa-chevron-right"></span></a>
          )}
          <img src={rawPath} alt={fileName} id="image-view" />
        </div>
        {!isHidden &&
          <div className="pingan-copyright">Powered By &nbsp;<img width="16" height="16" style={{"margin-top": "1px"}} src={`${mediaUrl}/img/logo-p.png`}></img>平安科技办公技术服务部</div>
        }
      </div>
    );
  }
}

ReactDOM.render(
  <SharedFileViewImage />,
  document.getElementById('wrapper')
);
