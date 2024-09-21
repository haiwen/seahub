import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import EmptyTip from '../../../components/empty-tip';
import { gettext } from '../../../utils/constants';

const GalleryMain = ({ groups, overScan, columns, size, gap, selectedImages, onImageClick, onImageDoubleClick, onImageRightClick, onClickOutside }) => {
  const imageRef = useRef(null);

  const imageHeight = useMemo(() => size + gap, [size, gap]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (imageRef.current && !imageRef.current.contains(e.target)) {
        onClickOutside();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClickOutside]);

  const renderDisplayGroup = useCallback((group, groupIndex) => {
    const { top: overScanTop, bottom: overScanBottom } = overScan;
    const { name, children, height, top, paddingTop } = group;

    // group not in rendering area, return empty div
    if (top >= overScanBottom || top + height <= overScanTop) {
      return (<div key={name} className="w-100" style={{ height, flexShrink: 0 }}></div>);
    }

    let childrenStartIndex = children.findIndex(r => r.top >= overScanTop);
    let childrenEndIndex = children.findIndex(r => r.top >= overScanBottom);

    // group in rendering area, but the image not need to render. eg: overScan: { top: 488, bottom: 1100 }, group: { top: 0, height: 521 },
    // in this time, part of an image is in the rendering area, don't render image
    if (childrenStartIndex === -1 && childrenEndIndex === -1) {
      return (<div key={name} className="w-100" style={{ height, flexShrink: 0 }}></div>);
    }

    childrenStartIndex = Math.max(childrenStartIndex, 0);
    if (childrenEndIndex === -1) {
      childrenEndIndex = children.length;
    }
    if (childrenEndIndex > 0) {
      childrenEndIndex = childrenEndIndex - 1;
    }

    return (
      <div key={groupIndex} className="metadata-gallery-date-group w-100" style={{ height, paddingTop }}>
        {childrenStartIndex === 0 && (<div className="metadata-gallery-date-tag">{name}</div>)}
        <div
          ref={imageRef}
          className="metadata-gallery-image-list"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            paddingTop: childrenStartIndex * imageHeight,
            paddingBottom: (children.length - 1 - childrenEndIndex) * imageHeight,
          }}
        >
          {children.slice(childrenStartIndex, childrenEndIndex + 1).map((row, rowIndex) => {
            return row.children.map((img) => {
              const isSelected = selectedImages.includes(img);
              return (
                <div
                  key={img.src}
                  tabIndex={1}
                  className={classnames('metadata-gallery-image-item', {
                    'metadata-gallery-image-item-selected': isSelected,
                  })}
                  style={{ width: size, height: size, background: '#f1f1f1' }}
                  onClick={(e) => onImageClick(e, img)}
                  onDoubleClick={(e) => onImageDoubleClick(e, img)}
                  onContextMenu={(e) => onImageRightClick(e, img)}
                >
                  <img className="metadata-gallery-grid-image" src={img.src} alt={img.name} />
                </div>
              );
            });
          })}
        </div>
      </div>
    );
  }, [overScan, columns, size, imageHeight, selectedImages, onImageClick, onImageDoubleClick, onImageRightClick]);

  if (!Array.isArray(groups) || groups.length === 0) {
    return <EmptyTip text={gettext('No record')}/>;
  }

  return groups.map((group, index) => {
    return renderDisplayGroup(group, index);
  });
};

GalleryMain.propTypes = {
  groups: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    children: PropTypes.arrayOf(PropTypes.shape({
      top: PropTypes.number.isRequired,
      children: PropTypes.arrayOf(PropTypes.shape({
        src: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      })).isRequired,
    })).isRequired,
    height: PropTypes.number.isRequired,
    top: PropTypes.number.isRequired,
    paddingTop: PropTypes.number.isRequired,
  })),
  overScan: PropTypes.shape({
    top: PropTypes.number.isRequired,
    bottom: PropTypes.number.isRequired,
  }).isRequired,
  columns: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
  gap: PropTypes.number.isRequired,
};

export default GalleryMain;
