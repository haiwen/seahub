import React from 'react';
import PropTypes from 'prop-types';
import Image from '../image';
import ImagesGrid from './images-grid';

const DayImages = ({ size, selectedImageIds, images, imgEvents }) => {
  const imagesCount = Array.isArray(images) ? images.length : 0;
  if (imagesCount === 0) return null;
  if (imagesCount === 1) {
    const img = images[0];
    return (<Image isSelected={selectedImageIds.includes(img.id)} img={img} size={size.large} useOriginalThumbnail={true} style={{ width: '100%' }} {...imgEvents} />);
  }

  if (imagesCount < 7) {
    const imgs = images.slice(0, 2);
    return imgs.map(img => (<Image key={img.id} isSelected={selectedImageIds.includes(img.id)} img={img} size={size.large} useOriginalThumbnail={true} {...imgEvents} />));
  }

  return (<ImagesGrid selectedImageIds={selectedImageIds} images={images} size={size} imgEvents={imgEvents} />);
};

DayImages.propTypes = {
  size: PropTypes.object,
  images: PropTypes.array,
  selectedImageIds: PropTypes.array,
  imgEvents: PropTypes.object,
};

export default DayImages;
