import React, { useState, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import EmptyTip from '../../../components/empty-tip';
import { gettext } from '../../../utils/constants';
import { GALLERY_DATE_MODE } from '../../constants';
import Image from './image';

const Content = ({
  groups,
  overScan,
  columns,
  size,
  mode,
  selectedImageIds,
  onImageSelect,
  onImageClick,
  onImageDoubleClick,
  onContextMenu,
  containerWidth
}) => {
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);

  const imageWidth = useMemo(() => {
    switch (mode) {
      case GALLERY_DATE_MODE.YEAR:
        return (containerWidth * 0.8 - 18) / 2;
      case GALLERY_DATE_MODE.MONTH:
        return (containerWidth * 0.8 - 36) / 3;
      case GALLERY_DATE_MODE.DAY:
        return (containerWidth * 0.8 - 2) / 2;
      default:
        return size;
    }
  }, [containerWidth, mode, size]);

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

  const handleClick = useCallback((e, img) => onImageClick(e, img), [onImageClick]);
  const handleDoubleClick = useCallback((e, img) => onImageDoubleClick(e, img), [onImageDoubleClick]);
  const handleContextMenu = useCallback((e, img) => onContextMenu(e, img), [onContextMenu]);

  const renderByYearOrMonth = useCallback((group) => (
    <div className={`metadata-gallery-${mode}-group`}>
      {group.children.map((row, index) => (
        <div key={index} style={{ display: 'flex', gap: '18px' }}>
          {row.children.map((img) => {
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
      ))}
    </div>
  ), [handleClick, handleDoubleClick, handleContextMenu, imageWidth, mode, selectedImageIds]);

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
      gridTemplateColumns: `repeat(3, ${imageWidth / 3}px)`,
      gridTemplateRows: `repeat(3, ${imageWidth / 3}px)`,
      width: imageWidth,
      height: imageWidth,
      gap: '2px',
      overflow: 'hidden',
    }}>
      {renderImage(images[0], (imageWidth * 2 / 3 + 2))}
      {images.slice(1, 6).map((image, index) => {
        const positions = [
          { gridColumn: 3, gridRow: 1 },
          { gridColumn: 3, gridRow: 2 },
          { gridColumn: 1, gridRow: 3 },
          { gridColumn: 2, gridRow: 3 },
          { gridColumn: 3, gridRow: 3 }
        ];
        const style = { gridColumn: positions[index].gridColumn, gridRow: positions[index].gridRow };
        return renderImage(image, imageWidth / 3, style);
      })}
    </div>
  ), [renderImage, imageWidth]);

  const renderRow = useCallback((images) => {
    const imagesCount = images.length;
    if (imagesCount < 7) {
      return images.slice(0, 2).map((image) => renderImage(image, imageWidth));
    }
    if (imagesCount < 12) {
      return (
        <>
          {renderImage(images[0], imageWidth)}
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
  }, [renderImage, renderImages, imageWidth]);

  const renderByDay = useCallback((group) => (
    <div className="metadata-gallery-day-group">
      {group.children.map((row, index) => (
        <div key={index} style={{ display: 'flex', gap: '2px' }}>
          {renderRow(row.children)}
        </div>
      ))}
    </div>
  ), [renderRow]);

  const renderAll = useCallback((group, childrenStartIndex, childrenEndIndex) => (
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
  ), [columns, size, selectedImageIds, onImageClick, onImageDoubleClick, onContextMenu]);


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
          <div className="metadata-gallery-date-tag">
            {name || gettext('Empty')}
          </div>
        )}
        {mode === GALLERY_DATE_MODE.YEAR && renderByYearOrMonth(group)}
        {mode === GALLERY_DATE_MODE.MONTH && renderByYearOrMonth(group)}
        {mode === GALLERY_DATE_MODE.DAY && renderByDay(group)}
        {mode === GALLERY_DATE_MODE.ALL && renderAll(group, childrenStartIndex, childrenEndIndex)}
      </div>
    );
  }, [overScan, mode, renderByYearOrMonth, renderByDay, renderAll]);

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
      {groups && groups.map((group) => {
        return renderDisplayGroup(group);
      })}
    </div>
  );
};

Content.propTypes = {
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
  selectedImageIds: PropTypes.array.isRequired,
  onImageSelect: PropTypes.func.isRequired,
  onImageClick: PropTypes.func.isRequired,
  onImageDoubleClick: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
  containerWidth: PropTypes.number.isRequired,
};

export default Content;
