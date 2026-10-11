import React, { useEffect, useRef, useState, forwardRef } from 'react';

/**
 * HOC that adds dynamic width calculation for path items.
 *
 * This HOC wraps the DirPath component and dynamically calculates
 * optimal widths for each path item based on available container space.
 */

const MIN_ITEM_WIDTH = 48;
const SEPARATOR_WIDTH = 18;
const ITEM_PADDING = 12; // 6px * 2 (left + right)

function calculatePathWidths(availableWidth, pathItems) {
  if (!pathItems || pathItems.length === 0) {
    return [];
  }

  const n = pathItems.length;
  const totalSeparatorWidth = (n - 1) * SEPARATOR_WIDTH;
  const usableWidth = availableWidth - totalSeparatorWidth;

  const naturalWidths = pathItems.map(item => item.naturalWidth + ITEM_PADDING);

  // Extract last item and other items
  const lastItemWidth = naturalWidths[n - 1];
  const otherItemsWidth = naturalWidths.slice(0, n - 1);
  const totalOtherNatural = otherItemsWidth.reduce((sum, w) => sum + w, 0);

  const minOtherTotal = MIN_ITEM_WIDTH * (n - 1);
  const lastItemMinWidth = MIN_ITEM_WIDTH;

  // Handle case where even the last item doesn't fit
  if (usableWidth <= lastItemWidth) {
    const result = new Array(n - 1).fill(MIN_ITEM_WIDTH);
    const remainingForLast = Math.max(lastItemMinWidth, usableWidth - minOtherTotal);
    result.push(remainingForLast);
    return result;
  }

  let remainingSpace = usableWidth - lastItemWidth;

  if (remainingSpace >= totalOtherNatural) {
    const extraSpace = remainingSpace - totalOtherNatural;
    const result = otherItemsWidth.map(w => {
      const ratio = totalOtherNatural > 0 ? w / totalOtherNatural : 1 / otherItemsWidth.length;
      return w + Math.floor(extraSpace * ratio);
    });
    result.push(lastItemWidth);
    return result;
  }

  // Use compression ratio for smooth transition
  if (remainingSpace >= minOtherTotal) {
    const compressionRatio = remainingSpace / totalOtherNatural;
    const result = otherItemsWidth.map(w => Math.max(MIN_ITEM_WIDTH, Math.floor(w * compressionRatio)));

    const usedByOthers = result.reduce((sum, w) => sum + w, 0);
    const remainingForLast = usableWidth - usedByOthers;
    result.push(Math.max(lastItemMinWidth, remainingForLast));
    return result;
  }

  const result = new Array(n - 1).fill(MIN_ITEM_WIDTH);
  const remainingForLast = usableWidth - minOtherTotal;
  result.push(Math.max(lastItemMinWidth, remainingForLast));
  return result;
}

function withDynamicPathWidth(WrappedComponent) {
  const EnhancedComponent = forwardRef((props, ref) => {
    const wrapperRef = useRef(null);
    const [pathWidths, setPathWidths] = useState([]);

    useEffect(() => {
      const updateWidths = () => {
        if (!wrapperRef.current) {
          return;
        }

        // Find the cur-view-path-left which is the actual container
        let leftContainer = wrapperRef.current.closest('.cur-view-path-left');
        if (!leftContainer) {
          leftContainer = wrapperRef.current.parentElement;
        }
        if (!leftContainer) {
          return;
        }

        const containerWidth = leftContainer.offsetWidth;
        const availableWidth = containerWidth - 42;
        const pathItemElements = wrapperRef.current.querySelectorAll('.path-item, .last-path-item');

        if (pathItemElements.length === 0) return;

        const pathItems = [];
        pathItemElements.forEach((el) => {
          // Create a temporary span to measure text width
          const text = el.textContent || el.innerText;
          const span = document.createElement('span');
          span.style.visibility = 'hidden';
          span.style.position = 'absolute';
          span.style.whiteSpace = 'nowrap';
          span.style.font = window.getComputedStyle(el).font;
          span.textContent = text;
          document.body.appendChild(span);
          const naturalWidth = span.offsetWidth + 12;
          document.body.removeChild(span);

          pathItems.push({
            name: text,
            naturalWidth,
            element: el
          });
        });

        if (pathItems.length > 0) {
          const widths = calculatePathWidths(availableWidth, pathItems);
          pathItems.forEach((item, i) => {
            if (item.element && widths[i]) {
              const width = widths[i];
              item.element.style.setProperty('max-width', `${width}px`, 'important');
            }
          });
          setPathWidths(widths);
        }
      };

      // Initial measurement after a small delay to ensure DOM is rendered
      const initialTimer = setTimeout(updateWidths, 100);

      // Set up mutation observer to handle dynamic path changes
      const mutationObserver = new MutationObserver(() => {
        updateWidths();
      });

      // Also set up resize observer on the path container
      let resizeObserver = null;
      const tryObserve = () => {
        const leftContainer = wrapperRef.current?.closest('.cur-view-path-left') || wrapperRef.current?.parentElement;
        if (leftContainer) {
          mutationObserver.observe(leftContainer, {
            childList: true,
            subtree: true
          });

          if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(updateWidths);
            resizeObserver.observe(leftContainer);
          }
        }
      };

      const observeTimer = setTimeout(tryObserve, 200);
      const handleResize = () => {
        setTimeout(updateWidths, 100);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(initialTimer);
        clearTimeout(observeTimer);
        window.removeEventListener('resize', handleResize);
        mutationObserver.disconnect();
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    }, []);

    return (
      <div ref={wrapperRef} className="w-100">
        <WrappedComponent
          {...props}
          pathWidths={pathWidths}
        />
      </div>
    );
  });

  EnhancedComponent.displayName = `withDynamicPathWidth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return EnhancedComponent;
}

export default withDynamicPathWidth;
