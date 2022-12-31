import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

import Lightbox from '@seafile/react-image-lightbox';
import '@seafile/react-image-lightbox/style.css';

const propTypes = {
  imageItems: PropTypes.array.isRequired,
  imageIndex: PropTypes.number.isRequired,
  closeImagePopup: PropTypes.func.isRequired,
  moveToPrevImage: PropTypes.func.isRequired,
  moveToNextImage: PropTypes.func.isRequired
};

class ImageDialog extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const imageItems = this.props.imageItems;
    const imageIndex = this.props.imageIndex;
    const imageItemsLength = imageItems.length;
    const name = imageItems[imageIndex].name;
    const imageTitle = `${name} (${imageIndex + 1}/${imageItemsLength})`;

    return (
      <Lightbox
        imageTitle={imageTitle}
        mainSrc={imageItems[imageIndex].src}
        nextSrc={imageItems[(imageIndex + 1) % imageItemsLength].src}
        prevSrc={imageItems[(imageIndex + imageItemsLength - 1) % imageItemsLength].src}
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
      />
    );
  }
}

ImageDialog.propTypes = propTypes;

export default ImageDialog;
