import React, { useState, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import EmptyTip from '../../../components/empty-tip';
import { gettext } from '../../../utils/constants';
import { GALLERY_DATE_MODE, GALLERY_DEFAULT_GRID_GAP, GALLERY_YEAR_MODE_GRID_GAP } from '../../constants';
import Image from './image';
import DayImages from './day-images';

const Content = ({
  groups,
  overScan,
  columns,
  size,
  rowHeight,
  mode,
  selectedImages,
  onImageSelect,
  onImageClick,
  onImageDoubleClick,
  onContextMenu,
  onDateTagClick,
}) => {
  const animationFrameRef = useRef(null);
  const containerRef = useRef(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);

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
    if (childrenEndIndex === -1) childrenEndIndex = children.length;
    if (childrenEndIndex > 0) childrenEndIndex = childrenEndIndex - 1;
    if (mode === GALLERY_DATE_MODE.DAY) {
      childrenStartIndex = 0;
      childrenEndIndex = children.length - 1;
    }
    let listStyle = {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      paddingTop: childrenStartIndex * rowHeight,
      paddingBottom: (children.length - 1 - childrenEndIndex) * rowHeight,
      gap: GALLERY_DEFAULT_GRID_GAP
    };
    let newChildren = children;
    if ([GALLERY_DATE_MODE.YEAR, GALLERY_DATE_MODE.MONTH].includes(mode)) {
      newChildren = children.flatMap(row => row.children);
      listStyle['gap'] = GALLERY_YEAR_MODE_GRID_GAP;
      if (newChildren.length === 1) listStyle['gridTemplateColumns'] = '1fr';
    } else if (mode === GALLERY_DATE_MODE.DAY) {
      newChildren = children.flatMap(row => row.children);
      if (newChildren.length === 1) {
        listStyle['gridTemplateColumns'] = '1fr';
      } else if (newChildren.length < 7) {
        listStyle['gridTemplateColumns'] = '1fr 1fr';
      } else {
        listStyle['gridTemplateColumns'] = `repeat(${columns}, ${size.small}px)`;
        listStyle['gridTemplateRows'] = `repeat(3, ${size.small}px)`;
      }
    }
    const imgEvents = {
      'onClick': onImageClick,
      'onDoubleClick': onImageDoubleClick,
      'onContextMenu': onContextMenu,
    };

    const isDateTagClickable = mode === GALLERY_DATE_MODE.MONTH || mode === GALLERY_DATE_MODE.YEAR;

    return (
      <div
        key={name}
        className="metadata-gallery-date-group"
        style={{ height, paddingTop }}
      >
        {childrenStartIndex === 0 && (
          <div
            className={classNames('metadata-gallery-date-tag', { 'hover': isDateTagClickable })}
            style={{ height: paddingTop }}
            onClick={(event) => onDateTagClick(event, name)}
          >
            {name || gettext('Empty')}
            {isDateTagClickable && <i className="metadata-gallery-date-tag-arrow sf3-font-down sf3-font rotate-270" />}
          </div>
        )}
        <div
          className={classNames('metadata-gallery-image-list', `metadata-gallery-${mode}-image-list`)}
          style={listStyle}
        >
          {mode !== GALLERY_DATE_MODE.DAY ? (
            <>
              {children.slice(childrenStartIndex, childrenEndIndex + 1).map((row) => {
                return row.children.map((img) => {
                  const isSelected = selectedImageIds.includes(img.id);
                  return (
                    <Image
                      key={img.id}
                      isSelected={isSelected}
                      img={img}
                      size={size.large}
                      style={mode !== GALLERY_DATE_MODE.ALL && newChildren.length === 1 ? { width: '100%' } : {}}
                      { ...imgEvents }
                    />
                  );
                });
              })}
            </>
          ) : (
            <DayImages size={size} selectedImageIds={selectedImageIds} images={newChildren} imgEvents={imgEvents} />
          )}
        </div>
      </div>
    );
  }, [overScan, mode, columns, rowHeight, onImageClick, onImageDoubleClick, onContextMenu, size, selectedImageIds, onDateTagClick]);

  if (!Array.isArray(groups) || groups.length === 0) return (<EmptyTip text={gettext('No record')}/>);

  return (
    <div
      ref={containerRef}
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
    height: PropTypes.number.isRequired,
    top: PropTypes.number.isRequired,
    paddingTop: PropTypes.number.isRequired,
    children: PropTypes.arrayOf(PropTypes.shape({
      top: PropTypes.number.isRequired,
      children: PropTypes.arrayOf(PropTypes.shape({
        src: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      })).isRequired,
    })).isRequired,
  })),
  overScan: PropTypes.shape({
    top: PropTypes.number.isRequired,
    bottom: PropTypes.number.isRequired,
  }).isRequired,
  columns: PropTypes.number.isRequired,
  size: PropTypes.object,
  mode: PropTypes.string,
  selectedImages: PropTypes.array.isRequired,
  onImageSelect: PropTypes.func.isRequired,
  onImageClick: PropTypes.func.isRequired,
  onImageDoubleClick: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
  onDateTagClick: PropTypes.func.isRequired,
};

export default Content;
