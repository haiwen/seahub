import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

const Image = ({
  isSelected,
  img,
  size,
  onClick,
  onDoubleClick,
  onContextMenu,
}) => {
  const [background, setBackground] = useState('#f1f1f1');

  const onLoad = useCallback(() => {
    setBackground('unset');
  }, []);

  return (
    <div
      id={img.id}
      tabIndex={1}
      className={classnames('metadata-gallery-image-item', {
        'metadata-gallery-image-item-selected': isSelected,
      })}
      style={{ width: size, height: size, background }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <img
        className="metadata-gallery-grid-image"
        src={img.src}
        alt={img.name}
        draggable="false"
        onLoad={onLoad}
      />
    </div>
  );
};

Image.propTypes = {
  isSelected: PropTypes.bool,
  img: PropTypes.object,
  size: PropTypes.number,
  onClick: PropTypes.func,
  onDoubleClick: PropTypes.func,
  onContextMenu: PropTypes.func,
};

export default Image;
