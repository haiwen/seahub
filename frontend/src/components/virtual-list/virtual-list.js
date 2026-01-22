import React, { useState, useEffect, useRef } from 'react';
import { gettext } from '../../utils/constants';
import './virtual-scroll.css';

const VirtualList = ({
  items,
  renderItem,
  itemHeight,
  overscan = 5,
  className = '',
  scrollTop: externalScrollTop,
  ariaLabel = 'File list',
  scrollContainerRef,
  onVisibleRangeChange,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef(null);

  const container = scrollContainerRef?.current;

  useEffect(() => {
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [container]);

  const totalItems = items.length;
  const totalHeight = totalItems * itemHeight;

  const currentScrollTop = externalScrollTop !== undefined ? externalScrollTop : scrollTop;

  const actualHeight = container ? container.clientHeight : 600;
  const effectiveHeight = Math.max(actualHeight, itemHeight * 2);

  const startIndex = Math.max(0, Math.floor(currentScrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((currentScrollTop + effectiveHeight) / itemHeight) + overscan
  );

  // Notify parent component of visible range change
  useEffect(() => {
    if (onVisibleRangeChange) {
      onVisibleRangeChange({ startIndex, endIndex });
    }
  }, [startIndex, endIndex, onVisibleRangeChange]);

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(renderItem({ item: items[i], index: i }));
  }

  const topPadding = startIndex * itemHeight;
  const bottomPadding = Math.max(0, totalHeight - (endIndex + 1) * itemHeight);

  return (
    <div
      ref={listRef}
      className={`virtual-scroll-list ${className}`}
      role="list"
      aria-label={gettext(ariaLabel)}
      style={{
        paddingTop: `${topPadding}px`,
        paddingBottom: `${bottomPadding}px`,
      }}
    >
      {visibleItems}
    </div>
  );
};

export default VirtualList;
