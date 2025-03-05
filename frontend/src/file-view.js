import React from 'react';
import { createRoot } from 'react-dom/client';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';
import Image from './components/file-content-view/image';
import SVG from './components/file-content-view/svg';
import PDF from './components/file-content-view/pdf';
import Video from './components/file-content-view/video';
import Audio from './components/file-content-view/audio';
import { Utils } from './utils/utils';
import { gettext } from './utils/constants';
import ImageAPI from './utils/image-api';
import toaster from './components/toast';

const {
  repoID, filePath,
  fileType, err
} = window.app.pageOptions;

class InnerFileView extends React.Component {
  constructor() {
    super();
    this.state = {
      imageScale: 1,
      imageAngle: 0
    };
  }

  setImageScale = (scale) => {
    this.setState({
      imageScale: scale
    });
  };

  rotateImage = () => {
    this.setState({
      imageAngle: (this.state.imageAngle - 90) % 360 // counter-clockwise
    }, () => {
      // const angleClockwise = this.state.imageAngle + 360; // keep this line for the moment
      const angleClockwise = 270; // the API only accept clockwise angles
      ImageAPI.rotateImage(repoID, filePath, 360 - angleClockwise).then((res) => {
        toaster.success(gettext('Image saved'), { 'id': 'image-saved-tip' });
      }).catch(error => {
        toaster.danger(Utils.getErrorMsg(error));
      });
    });
  };

  render() {
    if (err) {
      return (
        <FileView content={<FileViewTip />} />
      );
    }

    const { imageScale, imageAngle } = this.state;
    let content;
    switch (fileType) {
      case 'Image':
        content = <Image tip={<FileViewTip />} scale={imageScale} angle={imageAngle} />;
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
      <FileView
        content={content}
        setImageScale={this.setImageScale}
        rotateImage={this.rotateImage}
      />
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<InnerFileView />);
