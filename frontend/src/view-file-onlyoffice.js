import React from 'react';
import ReactDom from 'react-dom';
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

ReactDom.render(<ViewFileOnlyoffice />, document.getElementById('wrapper'));
