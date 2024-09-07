import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

const Main = ({ groups, overScan, columns, onLoad, size, gap }) => {

  const renderDisplayGroup = useCallback((group) => {
    const { top: overScanTop, bottom: overScanBottom } = overScan;
    const { name, children, top, height } = group;
    let childrenStartIndex = children.findIndex((r, i) => {
      const rTop = ~~(i / columns) * (size + 2) + top;
      return rTop >= overScanTop;
    });
    childrenStartIndex = Math.max(childrenStartIndex, 0);
    let childrenEndIndex = children.findIndex((r, i) => {
      const rTop = ~~(i / columns) * (size + gap) + top;
      return rTop >= overScanBottom;
    });
    if (childrenEndIndex > -1 && childrenEndIndex !== 0) {
      childrenEndIndex = childrenEndIndex - 1;
    }
    if (childrenEndIndex === -1) {
      childrenEndIndex = children.length - 1;
    }

    return (
      <div key={name} className="metadata-gallery-date-group w-100" style={{ height }}>
        {childrenStartIndex === 0 && (<div className="metadata-gallery-date-tag">{name}</div>)}
        <div
          className="metadata-gallery-image-list"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            paddingTop: ~~(childrenStartIndex / columns) * (size + gap),
            paddingBottom: ~~((children.length - 1 - childrenEndIndex) / columns) * (size + gap),
          }}
        >
          {children.slice(childrenStartIndex, childrenEndIndex).map((img) => (
            <div key={img.src} tabIndex={1} className='metadata-gallery-image-item' style={{ width: size, height: size }}>
              <img
                className="metadata-gallery-grid-image"
                src={img.src}
                alt={img.name}
                onLoad={() => onLoad(img)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }, [overScan, columns, onLoad, size, gap]);

  if (!Array.isArray(groups) || groups.length === 0) return null;
  return groups.map((group, index) => {
    return renderDisplayGroup(group, index);
  });
};

Main.propTypes = {
  groups: PropTypes.array,
  overScan: PropTypes.object,
  columns: PropTypes.number,
  onLoad: PropTypes.func,
  size: PropTypes.number,
};

export default Main;
