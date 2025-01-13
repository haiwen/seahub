import React from 'react';
import PropTypes from 'prop-types';
import Image from '../image';
import ImagesGrid from './images-grid';

const DayImages = ({ size, images, imgEvents }) => {
  const imagesCount = Array.isArray(images) ? images.length : 0;
  if (imagesCount === 0) return null;
  if (imagesCount === 1) {
    const img = images[0];
    return (<Image img={img} size={size.large} style={{ width: '100%' }} {...imgEvents} />);
  }

  if (imagesCount < 7) {
    const imgs = images.slice(0, 2);
    return imgs.map(img => (<Image key={img.id} img={img} size={size.large} {...imgEvents} />));
  }
  if (imagesCount < 12) {
    const i = imagesCount % 2;
    const firstImg = images[0];
    const renderContent = [
      (<Image key={firstImg.id} img={firstImg} size={size.large} {...imgEvents} />),
      (<ImagesGrid key={firstImg.id + '_'} images={images.slice(1)} size={size} imgEvents={imgEvents} />)
    ];
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {i === 0 ? renderContent : [renderContent[1], renderContent[0]]}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <ImagesGrid key="1" images={images.slice(0, 6)} size={size} imgEvents={imgEvents} />
      <ImagesGrid key="2" images={images.slice(6, 12)} size={size} imgEvents={imgEvents} />
    </div>
  );
};

DayImages.propTypes = {
  size: PropTypes.object,
  images: PropTypes.array,
  imgEvents: PropTypes.object,
};

export default DayImages;
