import React from 'react';
import { createRoot } from 'react-dom/client';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import { gettext } from './utils/constants';

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

    return (
      <div className="shared-file-view-body d-flex text-center">
        <div className="image-file-view flex-1">
          {prevImgPath && (
            <a href={prevImgURL} id="img-prev" title={gettext('you can also press ← ')}><span className="sf3-font sf3-font-down rotate-90 d-inline-block"></span></a>
          )}
          {nextImgPath && (
            <a href={nextImgURL} id="img-next" title={gettext('you can also press →')}><span className="sf3-font sf3-font-down rotate-270 d-inline-block"></span></a>
          )}
          <img src={rawPath} alt={fileName} id="image-view" />
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<SharedFileViewImage />);
