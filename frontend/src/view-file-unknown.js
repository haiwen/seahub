import React from 'react';
import ReactDOM from 'react-dom';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';

const { err } = window.app.pageOptions;

class ViewFileUnknown extends React.Component {
  render() {
    return (
      <FileView content={<FileContent />} />
    );
  }
}

class FileContent extends React.Component {
  render() {
    if (err) {
      return <FileViewTip />;
    }
  }
}

ReactDOM.render (
  <ViewFileUnknown />,
  document.getElementById('wrapper')
);
