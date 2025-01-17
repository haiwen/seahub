import React from 'react';
import { createRoot } from 'react-dom/client';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';

import './css/svg-file-view.css';

const { fileName, rawPath, err } = window.shared.pageOptions;

class SharedFileViewSVG extends React.Component {
  render() {
    return <SharedFileView content={<FileContent />} />;
  }
}

class FileContent extends React.Component {
  render() {
    if (err) {
      return <SharedFileViewTip />;
    }

    return (
      <div className="shared-file-view-body d-flex">
        <div className="svg-file-view flex-1">
          <img src={rawPath} alt={fileName} id="svg-view" />
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<SharedFileViewSVG />);

