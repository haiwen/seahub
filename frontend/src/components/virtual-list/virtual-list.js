import React, { useState, useEffect, useRef } from 'react';
import { gettext } from '../../utils/constants';
import { debounce } from '../../utils/utils';
import './virtual-scroll.css';

const VirtualList = ({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  className = '',
  scrollTop: externalScrollTop,
  ariaLabel = 'File list',
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(containerHeight || 0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !container.parentElement) return;

    const updateHeight = () => {
      if (!container.parentElement) return;
      if (!containerHeight) {
        let element = container.parentElement;
        let calculatedHeight = 0;
        const totalContentHeight = items.length * itemHeight;

        for (let i = 0; i < 5 && element; i++) {
          const elementHeight = element.clientHeight;

          if (elementHeight > 0 && elementHeight < totalContentHeight) {
            calculatedHeight = elementHeight;
            break;
          }

          element = element.parentElement;
        }

        if (calculatedHeight === 0) {
          const rootElement = container.parentElement;
          if (rootElement) {
            const specificContainers = ['dir-content-main', 'table-container', 'cur-view-content'];
            let specificElement = rootElement;

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

          if (calculatedHeight === 0) {
            calculatedHeight = Math.min(600, window.innerHeight - 150);
          }
        }

        setHeight(calculatedHeight);
      }
    };

    requestAnimationFrame(() => {
      updateHeight();
    });

    const debouncedCallback = debounce(updateHeight, 100);
    const resizeObserver = new ResizeObserver(debouncedCallback);
    if (container.parentElement) {
      resizeObserver.observe(container.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerHeight, itemHeight, items.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

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
  }, []);

  const totalItems = items.length;
  const totalHeight = totalItems * itemHeight;

  const currentScrollTop = externalScrollTop !== undefined ? externalScrollTop : scrollTop;

  const effectiveHeight = Math.max(height, 400);
  const startIndex = Math.max(0, Math.floor(currentScrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((currentScrollTop + effectiveHeight) / itemHeight) + overscan
  );

  const startOffset = startIndex * itemHeight;
  const endOffset = Math.max(0, totalHeight - (endIndex + 1) * itemHeight);

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(renderItem({ item: items[i], index: i }));
  }

  return (
    <div
      ref={scrollContainerRef}
      className={`virtual-scroll-container ${className}`}
      role="list"
      aria-label={gettext(ariaLabel)}
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <div className="virtual-scroll-spacer" style={{ height: `${startOffset}px` }} />
      {visibleItems}
      <div className="virtual-scroll-spacer" style={{ height: `${endOffset}px` }} />
    </div>
  );
};

export default VirtualList;
