import React from 'react';
import { createRoot } from 'react-dom/client';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';

const {
  err
} = window.app.pageOptions;

class ViewFileOnlyoffice extends React.Component {
  render() {
    return (
      <FileView content={<FileContent />} isOnlyofficeFile={true} />
    );
  }
}

class FileContent extends React.Component {

  render() {
    if (err) {
      return <FileViewTip />;
    }

    return (
      <div className="file-view-content flex-1 p-0 border-0">
        <div id="placeholder"></div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<ViewFileOnlyoffice />);
