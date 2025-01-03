import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import Image from '../image';

const Day = ({ group, containerWidth, selectedImageIds, onImageClick, onImageDoubleClick, onContextMenu }) => {
  const rowWidth = containerWidth * 0.8;
  const largeImageWidth = (rowWidth - 2) / 2;
  const smallImageWidth = (largeImageWidth - 4) / 3;
  const middleImageWidth = smallImageWidth * 2 + 2;

  const renderImage = useCallback((image, size, style = {}) => {
    if (!image) {
      return <div style={{ width: size, height: size }} />;
    }

    const isSelected = selectedImageIds.includes(image.id);
    return (
      <Image
        key={image.id}
        img={image}
        size={size}
        isSelected={isSelected}
        style={style}
        onClick={(e) => onImageClick(e, image)}
        onDoubleClick={(e) => onImageDoubleClick(e, image)}
        onContextMenu={(e) => onContextMenu(e, image)}
      />
    );
  }, [selectedImageIds, onImageClick, onImageDoubleClick, onContextMenu]);

  const renderImages = useCallback((images) => (
    <div style={{
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: `repeat(3, ${smallImageWidth}px)`,
      gridTemplateRows: `repeat(3, ${smallImageWidth}px)`,
      width: largeImageWidth,
      height: largeImageWidth,
      gap: '2px',
      overflow: 'hidden',
    }}>
      {renderImage(images[0], middleImageWidth)}
      {images.slice(1, 6).map((image, index) => {
        const positions = [
          { gridColumn: 3, gridRow: 1 },
          { gridColumn: 3, gridRow: 2 },
          { gridColumn: 1, gridRow: 3 },
          { gridColumn: 2, gridRow: 3 },
          { gridColumn: 3, gridRow: 3 }
        ];
        const style = { gridColumn: positions[index].gridColumn, gridRow: positions[index].gridRow };
        return renderImage(image, smallImageWidth, style);
      })}
    </div>
  ), [renderImage, smallImageWidth, middleImageWidth, largeImageWidth]);

  const renderRow = useCallback((images) => {
    const imagesCount = images.length;
    if (imagesCount < 7) {
      return images.slice(0, 2).map((image) => renderImage(image, largeImageWidth));
    }
    if (imagesCount < 12) {
      return (
        <>
          {renderImage(images[0], largeImageWidth)}
          {renderImages(images.slice(1, 7))}
        </>
      );
    }
    return (
      <>
        {renderImages(images.slice(0, 6))}
        {renderImages(images.slice(6, 12))}
      </>
    );
  }, [renderImage, renderImages, largeImageWidth]);

  return (
    <div className="metadata-gallery-day-group">
      {group.children.map((row, index) => (
        <div key={index} style={{ display: 'flex', gap: '2px' }}>
          {renderRow(row.children)}
        </div>
      ))}
    </div>
  );
};

Day.propTypes = {
  group: PropTypes.object.isRequired,
  containerWidth: PropTypes.number.isRequired,
  selectedImageIds: PropTypes.array.isRequired,
  onImageClick: PropTypes.func.isRequired,
  onImageDoubleClick: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
};

export default React.memo(Day);
