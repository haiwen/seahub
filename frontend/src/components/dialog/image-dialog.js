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
    window.open(this.props.imageItems[this.props.imageIndex].url, '_blank');
  };

  render() {
    const { imageItems, imageIndex, closeImagePopup, moveToPrevImage, moveToNextImage, onDeleteImage, onRotateImage } = this.props;
    const imageItemsLength = imageItems.length;
    if (imageItemsLength === 0) return null;
    const name = imageItems[imageIndex].name;
    const mainImg = imageItems[imageIndex];
    const nextImg = imageItems[(imageIndex + 1) % imageItemsLength];
    const prevImg = imageItems[(imageIndex + imageItemsLength - 1) % imageItemsLength];
    return (
      <Lightbox
        wrapperClassName='custom-image-previewer'
        imageTitle={`${name} (${imageIndex + 1}/${imageItemsLength})`}
        mainSrc={mainImg.thumbnail || mainImg.src}
        nextSrc={nextImg.thumbnail || nextImg.src}
        prevSrc={prevImg.thumbnail || prevImg.src}
        onCloseRequest={closeImagePopup}
        onMovePrevRequest={moveToPrevImage}
        onMoveNextRequest={moveToNextImage}
        imagePadding={70}
        imageLoadErrorMessage={gettext('The image could not be loaded.')}
        prevLabel={gettext('Previous (Left arrow key)')}
        nextLabel={gettext('Next (Right arrow key)')}
        closeLabel={gettext('Close (Esc)')}
        zoomInLabel={gettext('Zoom in')}
        zoomOutLabel={gettext('Zoom out')}
        enableRotate={true}
        onClickDownload={() => this.downloadImage(imageItems[imageIndex].url)}
        onClickDelete={onDeleteImage ? () => onDeleteImage(name) : null}
        onViewOriginal={this.onViewOriginal}
        viewOriginalImageLabel={gettext('View original image')}
        onRotateImage={onRotateImage ? (angle) => onRotateImage(imageIndex, angle) : null}
      />
    );
  }
}

ImageDialog.propTypes = propTypes;

export default ImageDialog;
