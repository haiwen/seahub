import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import Lightbox from '@seafile/react-image-lightbox';
import '@seafile/react-image-lightbox/style.css';

const propTypes = {
  imageItems: PropTypes.array.isRequired,
  imageIndex: PropTypes.number.isRequired,
  closeImagePopup: PropTypes.func.isRequired,
  moveToPrevImage: PropTypes.func.isRequired,
  moveToNextImage: PropTypes.func.isRequired,
  onDeleteImage: PropTypes.func,
  onRotateImage: PropTypes.func,
};

class ImageDialog extends React.Component {

  downloadImage = (imageSrc) => {
    let downloadUrl = imageSrc;

    if (document.getElementById('downloadFrame')) {
      document.body.removeChild(document.getElementById('downloadFrame'));
    }

    let iframe = document.createElement('iframe');
    iframe.setAttribute('id', 'downloadFrame');
    iframe.style.display = 'none';
    iframe.src = downloadUrl;
    document.body.appendChild(iframe);
  };

  onViewOriginal = () => {
    const imageSrc = this.props.imageItems[this.props.imageIndex].url;
    window.open(imageSrc, '_blank');
  };

  onRotateImage = (angle) => {
    if (this.props.onRotateImage) {
      this.props.onRotateImage(this.props.imageIndex, angle);
    }
  };

  render() {
    const imageItems = this.props.imageItems;
    const imageIndex = this.props.imageIndex;
    const imageItemsLength = imageItems.length;
    const name = imageItems[imageIndex].name;
    const imageTitle = `${name} (${imageIndex + 1}/${imageItemsLength})`;
    const mainImg = imageItems[imageIndex];
    const nextImg = imageItems[(imageIndex + 1) % imageItemsLength];
    const prevImg = imageItems[(imageIndex + imageItemsLength - 1) % imageItemsLength];
    const mainSrc = mainImg.thumbnail || mainImg.src;
    const nextSrc = nextImg.thumbnail || nextImg.src;
    const prevSrc = prevImg.thumbnail || prevImg.src;

    return (
      <Lightbox
        wrapperClassName='custom-image-previewer'
        imageTitle={imageTitle}
        mainSrc={mainSrc}
        nextSrc={nextSrc}
        prevSrc={prevSrc}
        onCloseRequest={this.props.closeImagePopup}
        onMovePrevRequest={this.props.moveToPrevImage}
        onMoveNextRequest={this.props.moveToNextImage}
        imagePadding={70}
        imageLoadErrorMessage={gettext('The image could not be loaded.')}
        prevLabel={gettext('Previous (Left arrow key)')}
        nextLabel={gettext('Next (Right arrow key)')}
        closeLabel={gettext('Close (Esc)')}
        zoomInLabel={gettext('Zoom in')}
        zoomOutLabel={gettext('Zoom out')}
        enableRotate={true}
        onClickDownload={() => this.downloadImage(imageItems[imageIndex].downloadURL)}
        onClickDelete={this.props.onDeleteImage ? () => this.props.onDeleteImage(imageItems[imageIndex].name) : null}
        onViewOriginal={this.onViewOriginal}
        viewOriginalImageLabel={gettext('View original image')}
        onRotateImage={this.onRotateImage}
      />
    );
  }
}

ImageDialog.propTypes = propTypes;

export default ImageDialog;
