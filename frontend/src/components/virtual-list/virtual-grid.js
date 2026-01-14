import React, { useState, useEffect, useRef } from 'react';

const VirtualGrid = ({
  items,
  renderItem,
  itemWidth = 200,
  itemHeight = 200,
  containerWidth,
  containerHeight,
  overscan = 2,
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
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container.parentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerWidth, containerHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate number of columns that fit in container
  const columns = Math.max(1, Math.floor(width / itemWidth));
  const actualItemWidth = width / columns;

  const totalItems = items.length;
  const totalRows = Math.ceil(totalItems / columns);
  const totalHeight = totalRows * itemHeight;

  // Calculate visible range
  const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endRow = Math.min(
    totalRows - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  );

  // Calculate offset for padding
  const startOffset = startRow * itemHeight;
  const endOffset = Math.max(0, totalHeight - (endRow + 1) * itemHeight);

  // Render visible items
  const visibleItems = [];
  const startIndex = startRow * columns;
  const endIndex = Math.min(totalItems, (endRow + 1) * columns);

  for (let i = startIndex; i < endIndex; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    visibleItems.push(renderItem({ item: items[i], index: i, row, col }));
  }

  return (
    <div
      ref={containerRef}
      className="virtual-scroll-container"
      style={{
        height: '100%',
        width: '100%',
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', height: `${totalHeight}px`, width: '100%' }}>
        <div style={{ height: `${startOffset}px` }} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, ${actualItemWidth}px)`,
            gap: '10px',
          }}
        >
          {visibleItems}
        </div>
        <div style={{ height: `${endOffset}px` }} />
      </div>
    </div>
  );
};

export default VirtualGrid;
