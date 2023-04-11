import React from 'react';
import ReactDom from 'react-dom';
import FileView from './components/history-trash-file-view/file-view';
import FileViewTip from './components/history-trash-file-view/file-view-tip';
import Image from './components/file-content-view/image';
import SVG from './components/file-content-view/svg';
import PDF from './components/file-content-view/pdf';
import Text from './components/file-content-view/text';
import Markdown from './components/file-content-view/markdown';
import SDoc from './components/file-content-view/sdoc';
import Video from './components/file-content-view/video';
import Audio from './components/file-content-view/audio';

const {
  fileType, err
} = window.app.pageOptions;

class HistoryTrashFileView extends React.Component {

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
      case 'SVG':
        content = <SVG />;
        break;
      case 'PDF':
        content = <PDF />;
        break;
      case 'Text':
        content = <Text />;
        break;
      case 'Markdown':
        content = <Markdown />;
        break;
      case 'SDoc':
        content = <SDoc />;
        break;
      case 'Video':
        content = <Video />;
        break;
      case 'Audio':
        content = <Audio />;
        break;
      default:
        content = <FileViewTip err='File preview unsupported' />;
    }

    return (
      <FileView content={content} />
    );
  }
}

ReactDom.render(<HistoryTrashFileView />, document.getElementById('wrapper'));
