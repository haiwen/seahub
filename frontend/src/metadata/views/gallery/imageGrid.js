import React from 'react';
import PropTypes from 'prop-types';

const GRID_WIDTH = 3;
const GRID_HEIGHT = 3;

const ImageGrid = ({ images, size, smallGridSize, middleGridSize, renderSingleImage }) => {
  const positions = [
    { gridColumn: 3, gridRow: 1 },
    { gridColumn: 3, gridRow: 2 },
    { gridColumn: 1, gridRow: 3 },
    { gridColumn: 2, gridRow: 3 },
    { gridColumn: 3, gridRow: 3 }
  ];

  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_WIDTH}, ${smallGridSize}px)`,
        gridTemplateRows: `repeat(${GRID_HEIGHT}, ${smallGridSize}px)`,
        width: size,
        height: size,
        gap: '2px',
        overflow: 'hidden',
      }}>
      {renderSingleImage(images[0], middleGridSize)}
      {images.slice(1, 6).map((image, index) => {
        const style = positions[index] || {};
        return renderSingleImage(image, smallGridSize, style);
      })}
    </div>
  );
};

ImageGrid.propTypes = {
  images: PropTypes.array.isRequired,
  size: PropTypes.number.isRequired,
  smallGridSize: PropTypes.number.isRequired,
  middleGridSize: PropTypes.number.isRequired,
  renderSingleImage: PropTypes.func.isRequired,
};

export default ImageGrid;
