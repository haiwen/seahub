import React, { useState, useCallback, useMemo, useRef } from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import EmptyTip from '../../../components/empty-tip';
import { gettext } from '../../../utils/constants';
import { GALLERY_DATE_MODE } from '../../constants';

const GalleryMain = ({
  groups,
  overScan,
  columns,
  size,
  gap,
  mode,
  selectedImages,
  onImageSelect,
  onImageClick,
  onImageDoubleClick,
  onImageRightClick
}) => {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);

  const imageHeight = useMemo(() => size + gap, [size, gap]);
  const selectedImageIds = useMemo(() => selectedImages.map(img => img.id), [selectedImages]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;

    setIsSelecting(true);
    setSelectionStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isSelecting) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      e.preventDefault();
      e.stopPropagation();

      const selectionEnd = { x: e.clientX, y: e.clientY };
      const selected = [];

      groups.forEach(group => {
        group.children.forEach((row) => {
          row.children.forEach((img) => {
            const imgElement = document.getElementById(img.id);
            if (imgElement) {
              const rect = imgElement.getBoundingClientRect();
              if (
                rect.left < Math.max(selectionStart.x, selectionEnd.x) &&
                rect.right > Math.min(selectionStart.x, selectionEnd.x) &&
                rect.top < Math.max(selectionStart.y, selectionEnd.y) &&
                rect.bottom > Math.min(selectionStart.y, selectionEnd.y)
              ) {
                selected.push(img);
              }
            }
          });
        });
      });

      onImageSelect(selected);
    });
  }, [groups, isSelecting, selectionStart, onImageSelect]);

  const handleMouseUp = useCallback((e) => {
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();
    setIsSelecting(false);
  }, []);

  const renderDisplayGroup = useCallback((group) => {
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
      <div
        key={name}
        className="metadata-gallery-date-group"
        style={{ height, paddingTop }}
      >
        {mode !== GALLERY_DATE_MODE.ALL && childrenStartIndex === 0 && (
          <div className="metadata-gallery-date-tag">{name || gettext('Empty')}</div>
        )}
        <div
          ref={imageRef}
          className="metadata-gallery-image-list"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            paddingTop: childrenStartIndex * imageHeight,
            paddingBottom: (children.length - 1 - childrenEndIndex) * imageHeight,
          }}
        >
          {children.slice(childrenStartIndex, childrenEndIndex + 1).map((row) => {
            return row.children.map((img) => {
              const isSelected = selectedImageIds.includes(img.id);
              return (
                <div
                  key={img.src}
                  id={img.id}
                  tabIndex={1}
                  className={classnames('metadata-gallery-image-item', {
                    'metadata-gallery-image-item-selected': isSelected,
                  })}
                  style={{ width: size, height: size, background: '#f1f1f1' }}
                  onClick={(e) => onImageClick(e, img)}
                  onDoubleClick={(e) => onImageDoubleClick(e, img)}
                  onContextMenu={(e) => onImageRightClick(e, img)}
                >
                  <img className="metadata-gallery-grid-image" src={img.src} alt={img.name} draggable="false" />
                </div>
              );
            });
          })}
        </div>
      </div>
    );
  }, [overScan, columns, size, imageHeight, mode, selectedImageIds, onImageClick, onImageDoubleClick, onImageRightClick]);

  if (!Array.isArray(groups) || groups.length === 0) {
    return <EmptyTip text={gettext('No record')}/>;
  }

  return (
    <div
      ref={containerRef}
      className='metadata-gallery-main'
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {groups.map((group) => {
        return renderDisplayGroup(group);
      })}
    </div>
  );
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
  mode: PropTypes.string,
  selectedImages: PropTypes.array.isRequired,
  onImageSelect: PropTypes.func.isRequired,
  onImageClick: PropTypes.func.isRequired,
  onImageDoubleClick: PropTypes.func.isRequired,
  onImageRightClick: PropTypes.func.isRequired,
};

export default GalleryMain;
