import React from 'react';
import ReactDom from 'react-dom';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';
import Image from './components/file-content-view/image';
import SVG from './components/file-content-view/svg';
import PDF from './components/file-content-view/pdf';
import Video from './components/file-content-view/video';
import Audio from './components/file-content-view/audio';

const {
  fileType, err
} = window.app.pageOptions;

class InnerFileView extends React.Component {

  render() {
    if (err) {
      return (
        <FileView content={<FileViewTip />} />
      );
    }

    let content;
    switch (fileType) {
      case 'Image':
        content = <Image tip={<FileViewTip />} />;
        break;
      case 'XMind':
        content = <Image tip={<FileViewTip />} />;
        break;
      case 'SVG':
        content = <SVG />;
        break;
      case 'PDF':
        content = <PDF />;
        break;
      case 'Video':
        content = <Video />;
        break;
      case 'Audio':
        content = <Audio />;
        break;
      default:
        break;
    }

    return (
      <FileView content={content} />
    );
  }
}

ReactDom.render(<InnerFileView />, document.getElementById('wrapper'));
