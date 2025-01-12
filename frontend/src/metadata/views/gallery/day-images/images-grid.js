import React from 'react';
import PropTypes from 'prop-types';
import Image from '../image';
import { GALLERY_DEFAULT_GRID_GAP } from '../../../constants';

const ImagesGrid = ({ images, size, imgEvents }) => {
  const allStyles = [
    [
      { position: 'absolute', top: 0, left: 0 },
      { gridRow: 1, gridColumn: 3 },
      { gridRow: 2, gridColumn: 3 },
      { gridRow: 3, gridColumn: 1 },
      { gridRow: 3, gridColumn: 2 },
      { gridRow: 3, gridColumn: 3 },
    ], [
      { position: 'absolute', top: 0, left: size.small + GALLERY_DEFAULT_GRID_GAP },
      { gridRow: 1, gridColumn: 1 },
      { gridRow: 2, gridColumn: 1 },
      { gridRow: 3, gridColumn: 1 },
      { gridRow: 3, gridColumn: 2 },
      { gridRow: 3, gridColumn: 3 },
    ], [
      { position: 'absolute', top: size.small + GALLERY_DEFAULT_GRID_GAP, left: 0 },
      { gridRow: 1, gridColumn: 1 },
      { gridRow: 1, gridColumn: 2 },
      { gridRow: 1, gridColumn: 3 },
      { gridRow: 2, gridColumn: 3 },
      { gridRow: 3, gridColumn: 3 },
    ], [
      { position: 'absolute', top: size.small + GALLERY_DEFAULT_GRID_GAP, left: size.small + GALLERY_DEFAULT_GRID_GAP },
      { gridRow: 1, gridColumn: 1 },
      { gridRow: 1, gridColumn: 2 },
      { gridRow: 1, gridColumn: 3 },
      { gridRow: 2, gridColumn: 1 },
      { gridRow: 3, gridColumn: 1 },
    ]
  ];

  let day = images[0].day;
  day = day ? Number(day) : 0;
  const styles = allStyles[day % 4];

  return (
    <div
      className="position-relative"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${size.small}px)`,
        gridTemplateRows: `repeat(3, ${size.small}px)`,
        width: size.large,
        height: size.large,
        gap: GALLERY_DEFAULT_GRID_GAP,
      }}
    >
      <Image key={images[0].id} img={images[0]} size={size.middle} {...imgEvents} style={styles[0]} />
      {images.slice(1, 6).map((image, index) => {
        const style = styles[index + 1] || {};
        return (<Image key={image.id} img={image} size={size.small} style={style} {...imgEvents} />);
      })}
    </div>
  );
};

ImagesGrid.propTypes = {
  images: PropTypes.array.isRequired,
  size: PropTypes.object.isRequired,
  imgEvents: PropTypes.object,
};

export default ImagesGrid;
