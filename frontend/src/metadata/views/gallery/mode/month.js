import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import Image from '../image';

const Month = ({ group, containerWidth, selectedImageIds, onImageClick, onImageDoubleClick, onContextMenu }) => {
  const imageWidth = useMemo(() => (containerWidth * 0.8 - 36) / 3, [containerWidth]);
  const imagesToShow = useMemo(() => group.children.flatMap(row => row.children).slice(0, 3), [group]);

  const handleClick = useCallback((e, img) => onImageClick(e, img), [onImageClick]);
  const handleDoubleClick = useCallback((e, img) => onImageDoubleClick(e, img), [onImageDoubleClick]);
  const handleContextMenu = useCallback((e, img) => onContextMenu(e, img), [onContextMenu]);

  return (
    <div className="metadata-gallery-month-group">
      {imagesToShow.map((img) => {
        const isSelected = selectedImageIds.includes(img.id);
        return (
          <Image
            key={img.id}
            img={img}
            size={imageWidth}
            isSelected={isSelected}
            onClick={(e) => handleClick(e, img)}
            onDoubleClick={(e) => handleDoubleClick(e, img)}
            onContextMenu={(e) => handleContextMenu(e, img)}
          />
        );
      })}
    </div>
  );
};

Month.propTypes = {
  group: PropTypes.object.isRequired,
  containerWidth: PropTypes.number.isRequired,
  onImageClick: PropTypes.func.isRequired,
  onImageDoubleClick: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
};

export default React.memo(Month);
