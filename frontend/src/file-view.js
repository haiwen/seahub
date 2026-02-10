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
      imageAngle: 0,
      imageOffset: { x: 0, y: 0 },
      isDragging: false,
      dragStart: null,
      dragOrigin: null,
    };
    this.imageContainerRef = React.createRef();
    this.defaultPageFitScale = 1;
  }

  setImageScale = (scale) => {
    this.setState(prevState => ({
      imageScale: scale,
      imageOffset: scale === 1 ? { x: 0, y: 0 } : prevState.imageOffset,
    }));
  };

  setDefaultPageFitScale = (scale) => {
    this.defaultPageFitScale = scale;
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

  handleImageMouseDown = (e) => {
    if (this.state.imageScale < this.defaultPageFitScale) return;
    e.preventDefault();
    this.setState({
      isDragging: true,
      dragStart: { x: e.clientX, y: e.clientY },
      dragOrigin: { ...this.state.imageOffset }
    });
    document.addEventListener('mousedown', this.handleImageMouseDown);
    document.addEventListener('mouseup', this.handleImageMouseUp);
  };

  handleImageMouseMove = (e) => {
    if (!this.state.isDragging) return;
    const dx = e.clientX - this.state.dragStart.x;
    const dy = e.clientY - this.state.dragStart.y;
    this.setState({
      imageOffset: {
        x: this.state.dragOrigin.x + dx,
        y: this.state.dragOrigin.y + dy
      }
    });
  };

  handleImageMouseUp = (e) => {
    this.setState({ isDragging: false });
    document.removeEventListener('mousedown', this.handleImageMouseDown);
    document.removeEventListener('mouseup', this.handleImageMouseUp);
  };

  render() {
    if (err) {
      return (
        <FileView content={<FileViewTip />} />
      );
    }

    const { imageScale, imageAngle, imageOffset } = this.state;
    let content;
    switch (fileType) {
      case 'Image':
      case 'RAW':
      case 'EXR':
      case 'EPS':
        content = (
          <div
            ref={this.imageContainerRef}
            className="d-flex w-100 h-100"
            style={{ cursor: imageScale >= this.defaultPageFitScale ? 'move' : 'default' }}
            onMouseDown={this.handleImageMouseDown}
            onMouseMove={this.handleImageMouseMove}
            onMouseUp={this.handleImageMouseUp}
          >
            <Image
              tip={<FileViewTip />}
              scale={imageScale}
              angle={imageAngle}
              offset={imageOffset}
            />
          </div>
        );
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
        setDefaultPageFitScale={this.setDefaultPageFitScale}
        rotateImage={this.rotateImage}
      />
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<InnerFileView />);
