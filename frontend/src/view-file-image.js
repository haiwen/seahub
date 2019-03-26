import React from 'react';
import ReactDOM from 'react-dom';
import { Utils } from './utils/utils';
import { gettext, siteRoot } from './utils/constants';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';

import './css/image-file-view.css';

const {
  repoID, filePath, err,
  fileName, previousImage, nextImage, rawPath
} = window.app.pageOptions;

let previousImageUrl, nextImageUrl; 
if (previousImage) {
  previousImageUrl = `${siteRoot}lib/${repoID}/file${Utils.encodePath(previousImage)}`;
}
if (nextImage) {
  nextImageUrl = `${siteRoot}lib/${repoID}/file${Utils.encodePath(nextImage)}`;
}

class ViewFileImage extends React.Component {
  render() {
    return (
      <FileView content={<FileContent />} />
    );
  }
}

class FileContent extends React.Component {

  componentDidMount() {
    document.addEventListener('keydown', (e) => {
      if (previousImage && e.keyCode == 37) { // press '<-'
        location.href = previousImageUrl;
      }
      if (nextImage && e.keyCode == 39) { // press '->'
        location.href = nextImageUrl;
      }
    });
  }

  render() {
    if (err) {
      return <FileViewTip />;
    }
    return (
      <div className="file-view-content flex-1 image-file-view">
        {previousImage && (
          <a href={previousImageUrl} id="img-prev" title={gettext('you can also press ← ')}><span className="fas fa-chevron-left"></span></a>
        )}
        {nextImage && (
          <a href={nextImageUrl} id="img-next" title={gettext('you can also press →')}><span className="fas fa-chevron-right"></span></a>
        )}
        <img src={rawPath} alt={fileName} id="image-view" />
      </div>
    );
  }
}

ReactDOM.render (
  <ViewFileImage />,
  document.getElementById('wrapper')
);
