import React, { useState, useEffect, useRef, useMemo } from 'react';
import { debounce } from '../../utils/utils';
import './virtual-scroll.css';

const VirtualGrid = ({
  items,
  renderItem,
  itemWidth = 200,
  itemHeight = 200,
  containerWidth,
  containerHeight,
  overscan = 2,
  gap = 4,
  renderOverlay,
  scrollContainerRef,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [width, setWidth] = useState(containerWidth || 0);
  const [height, setHeight] = useState(containerHeight || 0);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const parent = container.parentElement;
      if (parent) {
        if (!containerWidth) {
          setWidth(parent.clientWidth);
        }
        if (!containerHeight) {
          setHeight(parent.clientHeight);
        }
      }
    };

    updateDimensions();

    const debouncedCallback = debounce(updateDimensions, 100);
    const resizeObserver = new ResizeObserver(debouncedCallback);
    if (container.parentElement) {
      resizeObserver.observe(container.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerWidth, containerHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (scrollContainerRef) {
      scrollContainerRef.current = container;
    }

    const handleScroll = () => {
      if (container) {
        setScrollTop(container.scrollTop);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [scrollContainerRef]);

  const totalItems = items.length;

  const gridLayout = useMemo(() => {
    const maxColumns = Math.floor((width + gap) / (itemWidth + gap));
    const columns = Math.max(1, maxColumns);
    const totalGridWidth = Math.min(columns * itemWidth + (columns - 1) * gap, width);
    return { columns, totalGridWidth };
  }, [width, itemWidth, gap]);

  const gridMetrics = useMemo(() => {
    const totalRows = Math.ceil(totalItems / gridLayout.columns);
    const totalHeight = totalRows * itemHeight;
    return { totalItems, totalRows, totalHeight };
  }, [totalItems, gridLayout.columns, itemHeight]);

  const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endRow = Math.min(
    gridMetrics.totalRows - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  );

  const startOffset = startRow * itemHeight;
  const endOffset = Math.max(0, gridMetrics.totalHeight - (endRow + 1) * itemHeight);

  const visibleItems = [];
  const startIndex = startRow * gridLayout.columns;
  const endIndex = Math.min(gridMetrics.totalItems, (endRow + 1) * gridLayout.columns);

  for (let i = startIndex; i < endIndex; i++) {
    const row = Math.floor(i / gridLayout.columns);
    const col = i % gridLayout.columns;
    visibleItems.push(renderItem({ item: items[i], index: i, row, col }));
  }

  return (
    <div
      ref={containerRef}
      className="virtual-scroll-container"
      style={{
        height: `${height}px`,
        width: `${width}px`,
      }}
    >
      {renderOverlay && renderOverlay()}
      <div
        className="virtual-scroll-grid"
        style={{
          position: 'relative',
          height: `${gridMetrics.totalHeight}px`,
          width: `${gridLayout.totalGridWidth}px`,
        }}
      >
        <div className="virtual-scroll-spacer" style={{ height: `${startOffset}px` }} />
        <div
          className="virtual-scroll-grid"
          style={{
            gridTemplateColumns: `repeat(${gridLayout.columns}, ${itemWidth}px)`,
            gap: `${gap}px`,
          }}
        >
          {visibleItems}
        </div>
        <div className="virtual-scroll-spacer" style={{ height: `${endOffset}px` }} />
      </div>
    </div>
  );
};

export default VirtualGrid;
