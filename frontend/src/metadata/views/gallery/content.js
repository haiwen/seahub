import React, { useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import EmptyTip from '../../../components/empty-tip';
import { gettext } from '../../../utils/constants';
import { GALLERY_DATE_MODE, GALLERY_DEFAULT_GRID_GAP } from '../../constants';
import Image from './image';
import ImageGrid from './imageGrid';

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
  onContextMenu
}) => {
  const animationFrameRef = useRef(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);

  const middleGridSize = (size - GALLERY_DEFAULT_GRID_GAP * 2) * 2 / 3 + GALLERY_DEFAULT_GRID_GAP;
  const smallGridSize = (size - GALLERY_DEFAULT_GRID_GAP * 2) / 3;

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

  const renderSingleImage = useCallback((image, size, style = {}) => {
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

  const renderImageGrid = useCallback((images) => (
    <ImageGrid
      images={images}
      size={size}
      smallGridSize={smallGridSize}
      middleGridSize={middleGridSize}
      renderSingleImage={renderSingleImage}
    />
  ), [renderSingleImage, size, smallGridSize, middleGridSize]);

  const renderByDay = useCallback((images) => {
    const imagesCount = images.length;
    if (imagesCount === 1) {
      return renderSingleImage(images[0], size, { width: (size * 2 + GALLERY_DEFAULT_GRID_GAP), height: size });
    }
    if (imagesCount < 7) {
      return images.slice(0, 2).map((image) => renderSingleImage(image, size));
    }
    if (imagesCount < 12) {
      return (
        <>
          {renderSingleImage(images[0], size)}
          {renderImageGrid(images.slice(1, 7))}
        </>
      );
    }
    return (
      <>
        {renderImageGrid(images.slice(0, 6))}
        {renderImageGrid(images.slice(6, 12))}
      </>
    );
  }, [renderSingleImage, renderImageGrid, size]);

  const renderImageList = useCallback((group, childrenStartIndex, childrenEndIndex, style = {}) => (
    <div
      key={group.name}
      className={`metadata-gallery-${mode}-list`}
      style={style}
    >
      {group.children.slice(childrenStartIndex, childrenEndIndex + 1).map((row, rowIndex) => {
        if (mode === GALLERY_DATE_MODE.DAY) {
          return (
            <div key={group.name + rowIndex} className="metadata-gallery-day-group">
              {renderByDay(row.children)}
            </div>
          );
        }
        return row.children.map((img) => {
          return renderSingleImage(img, size);
        });
      })}
    </div>
  ), [mode, size, renderSingleImage, renderByDay]);

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

    const renderByMode = () => {
      switch (mode) {
        case GALLERY_DATE_MODE.YEAR:
        case GALLERY_DATE_MODE.MONTH:
        case GALLERY_DATE_MODE.DAY:
          return renderImageList(group, 0, 0);
        default:
          const style = {
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            paddingTop: childrenStartIndex * size,
            paddingBottom: (group.children.length - 1 - childrenEndIndex) * size,
          };
          return renderImageList(group, childrenStartIndex, childrenEndIndex, style);
      }
    };

    return (
      <div
        key={name}
        className="metadata-gallery-date-group"
        style={{ height, paddingTop }}
      >
        {mode !== GALLERY_DATE_MODE.ALL && childrenStartIndex === 0 && (
          <div className="metadata-gallery-date-tag">
            <span>{name || gettext('Empty')}</span>
          </div>
        )}
        {renderByMode()}
      </div>
    );
  }, [overScan, columns, size, mode, renderImageList]);

  if (!Array.isArray(groups) || groups.length === 0) {
    return <EmptyTip text={gettext('No record')}/>;
  }

  return (
    <div
      className="metadata-gallery-main"
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
  mode: PropTypes.string,
  selectedImageIds: PropTypes.array.isRequired,
  onImageSelect: PropTypes.func.isRequired,
  onImageClick: PropTypes.func.isRequired,
  onImageDoubleClick: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
};

export default Content;
