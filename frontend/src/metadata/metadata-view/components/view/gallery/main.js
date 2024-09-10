import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import GalleryImage from './image';

const Main = ({ groups, overScan, columns, size, gap }) => {
  const imageHeight = useMemo(() => size + gap, [size, gap]);

  const renderDisplayGroup = useCallback((group) => {
    const { top: overScanTop, bottom: overScanBottom } = overScan;
    const { name, children, height, top } = group;

    // group not in render area, return empty div
    if (top >= overScanBottom || top + height <= overScanTop) {
      return (<div key={name} className="w-100" style={{ height, flexShrink: 0 }}></div>);
    }

    const childrenStartIndex = children.findIndex(r => r.top >= overScanTop);
    let childrenEndIndex = children.findIndex(r => r.top >= overScanBottom);
    if (childrenEndIndex === -1) {
      childrenEndIndex = children.length;
    }
    if (childrenEndIndex > 0) {
      childrenEndIndex = childrenEndIndex - 1;
    }

    return (
      <div key={name} className="metadata-gallery-date-group w-100" style={{ height }}>
        {childrenStartIndex === 0 && (<div className="metadata-gallery-date-tag">{name}</div>)}
        <div
          className="metadata-gallery-image-list"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            paddingTop: childrenStartIndex * imageHeight,
            paddingBottom: (children.length - 1 - childrenEndIndex) * imageHeight,
          }}
        >
          {children.slice(childrenStartIndex, childrenEndIndex + 1).map((row) => {
            return row.children.map(img => {
              return (
                <GalleryImage key={img.src} src={img.src} size={size} alt={img.name} />
              );
            });
          })}
        </div>
      </div>
    );
  }, [overScan, columns, size, imageHeight]);

  if (!Array.isArray(groups) || groups.length === 0) return null;
  return groups.map((group, index) => {
    return renderDisplayGroup(group, index);
  });
};

Main.propTypes = {
  groups: PropTypes.array,
  overScan: PropTypes.object,
  columns: PropTypes.number,
  size: PropTypes.number,
  gap: PropTypes.number,
};

export default Main;
