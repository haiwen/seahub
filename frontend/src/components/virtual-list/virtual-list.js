import React, { useState, useEffect, useRef } from 'react';

const VirtualList = ({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  className = '',
  scrollTop: externalScrollTop,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(containerHeight || 0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateHeight = () => {
      if (!containerHeight) {
        // Walk up the DOM tree to find a container with a VALID height
        // A valid height is one that's less than the total content height
        let element = container.parentElement;
        let calculatedHeight = 0;
        const totalContentHeight = items.length * itemHeight;

        // Check up to 5 levels up the DOM tree
        for (let i = 0; i < 5 && element; i++) {
          const elementHeight = element.clientHeight;

          // Valid height: greater than 0 and less than total content height
          // This ensures we're measuring the container, not the content
          if (elementHeight > 0 && elementHeight < totalContentHeight) {
            calculatedHeight = elementHeight;
            break;
          }

          element = element.parentElement;
        }

        // If no valid height found, use a fallback
        if (calculatedHeight === 0) {
          // Try to find .dir-content-main or .table-container specifically
          const rootElement = container.parentElement;
          if (rootElement) {
            const specificContainers = ['dir-content-main', 'table-container', 'cur-view-content'];
            let specificElement = rootElement;

            // Search for a specific container
            for (let i = 0; i < 3 && specificElement; i++) {
              if (specificElement.classList) {
                const hasSpecificClass = specificContainers.some(cls =>
                  specificElement.classList.contains(cls)
                );
                if (hasSpecificClass) {
                  const specificHeight = specificElement.clientHeight;
                  if (specificHeight > 0) {
                    calculatedHeight = specificHeight;
                    break;
                  }
                }
              }
              specificElement = specificElement.parentElement;
            }
          }

          // Final fallback
          if (calculatedHeight === 0) {
            calculatedHeight = Math.min(600, window.innerHeight - 150);
          }
        }

        setHeight(calculatedHeight);
      }
    };

    // Use requestAnimationFrame to ensure layout is calculated
    requestAnimationFrame(() => {
      updateHeight();
    });

    const resizeObserver = new ResizeObserver(updateHeight);
    if (container.parentElement) {
      resizeObserver.observe(container.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerHeight]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    // Listen to scroll events on this container
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const totalItems = items.length;
  const totalHeight = totalItems * itemHeight;

  // Use external scrollTop if provided, otherwise use internal state
  const currentScrollTop = externalScrollTop !== undefined ? externalScrollTop : scrollTop;

  // Calculate visible range
  const effectiveHeight = Math.max(height, 400); // Ensure minimum height for virtualization
  const startIndex = Math.max(0, Math.floor(currentScrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((currentScrollTop + effectiveHeight) / itemHeight) + overscan
  );

  // Calculate offset for padding
  const startOffset = startIndex * itemHeight;
  const endOffset = Math.max(0, totalHeight - (endIndex + 1) * itemHeight);

  // Render visible items
  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(renderItem({ item: items[i], index: i }));
  }

  // Render as div-based list (for virtualization with CSS Grid)
  return (
    <div
      ref={scrollContainerRef}
      className={className}
      style={{
        overflowY: 'auto',
        overflowX: 'hidden', // Only hide horizontal scroll on this inner container
        height: '100%',
        maxHeight: '100%',
        width: '100%',
      }}
    >
      {/* Spacer for top padding */}
      <div style={{ height: `${startOffset}px` }} />
      {/* Visible items */}
      {visibleItems}
      {/* Spacer for bottom padding */}
      <div style={{ height: `${endOffset}px` }} />
    </div>
  );
};

export default VirtualList;
