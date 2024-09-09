import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

const Main = ({ groups, overScan, columns, size, gap }) => {

  const renderDisplayGroup = useCallback((group) => {
    const { top: overScanTop, bottom: overScanBottom } = overScan;
    const { name, children, height } = group;
    const childrenStartIndex = Math.max(children.findIndex(r => r.top >= overScanTop), 0);

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
            paddingTop: childrenStartIndex * (size + gap),
            paddingBottom: (children.length - 1 - childrenEndIndex) * (size + gap),
          }}
        >
          {children.slice(childrenStartIndex, childrenEndIndex + 1).map((row) => {
            return row.children.map(img => {
              return (
                <div key={img.src} tabIndex={1} className='metadata-gallery-image-item' style={{ width: size, height: size, background: '#ccc' }}>
                  <img className="metadata-gallery-grid-image" src={img.src} alt={img.name} />
                </div>
              );
            });
          })}
        </div>
      </div>
    );
  }, [overScan, columns, size, gap]);

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
};

export default Main;
