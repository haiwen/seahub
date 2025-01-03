import PropTypes from 'prop-types';
import React from 'react';
import Image from '../image';

const All = ({ group, columns, size, selectedImageIds, onImageClick, onImageDoubleClick, onContextMenu, childrenStartIndex, childrenEndIndex }) => {
  return (
    <div
      className="metadata-gallery-image-list"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        paddingTop: childrenStartIndex * size,
        paddingBottom: (group.children.length - 1 - childrenEndIndex) * size,
      }}
    >
      {group.children.slice(childrenStartIndex, childrenEndIndex + 1).map((row) => {
        return row.children.map((img) => {
          const isSelected = selectedImageIds.includes(img.id);
          return (
            <Image
              key={img.id}
              isSelected={isSelected}
              img={img}
              size={size}
              onClick={(e) => onImageClick(e, img)}
              onDoubleClick={(e) => onImageDoubleClick(e, img)}
              onContextMenu={(e) => onContextMenu(e, img)}
            />
          );
        });
      })}
    </div>
  );
};

All.propTypes = {
  group: PropTypes.object.isRequired,
  columns: PropTypes.number.isRequired,
  containerWidth: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
  selectedImageIds: PropTypes.array.isRequired,
  onImageClick: PropTypes.func.isRequired,
  onImageDoubleClick: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
  childrenStartIndex: PropTypes.number.isRequired,
  childrenEndIndex: PropTypes.number.isRequired,
};

export default All;
