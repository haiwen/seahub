import React, { useRef, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import VirtualList from '../virtual-list/virtual-list';
import DirentListItem from './dirent-list-item';
import { calculateResponsiveColumns } from '../../utils/table-headers';
import './dirent-virtual-list.css';

const DirentItemWrapper = ({ dirent, registerExecuteOperation, unregisterExecuteOperation, ...itemProps }) => {
  const childRef = useRef(null);

  useEffect(() => {
    if (childRef.current) {
      registerExecuteOperation(dirent.name, childRef.current);
    }

    return () => {
      unregisterExecuteOperation(dirent.name);
    };
  }, [dirent.name, registerExecuteOperation, unregisterExecuteOperation]);

  return <DirentListItem ref={childRef} dirent={dirent} {...itemProps} />;
};

const DirentVirtualListView = ({
  headers,
  items,
  itemHeight = 42,
  overscan = 5,
  registerExecuteOperation,
  unregisterExecuteOperation,
  ...itemProps
}) => {
  const scrollContainerRef = useRef(null);
  const headerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const style = window.getComputedStyle(container);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const contentWidth = Math.max(
        container.clientWidth - paddingLeft - paddingRight,
        0
      );
      setContainerWidth(contentWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const { gridTemplateColumns, tableWidth } = useMemo(() => {
    if (!headers || headers.length === 0 || containerWidth === 0) {
      return { gridTemplateColumns: '', tableWidth: 0 };
    }

    const { gridTemplate, totalWidth } = calculateResponsiveColumns(
      headers,
      containerWidth
    );

    return {
      gridTemplateColumns: gridTemplate,
      tableWidth: totalWidth
    };
  }, [headers, containerWidth]);

  const handleScroll = (e) => {
    const { scrollTop: st, scrollLeft } = e.target;

    setScrollTop(st);

    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }
  };

  const tableWrapperWidth = tableWidth > 768 ? tableWidth : 768;

  return (
    <div className="dirent-virtual-list-view">
      <div
        ref={scrollContainerRef}
        className="dirent-virtual-scroll-container"
        onScroll={handleScroll}
      >
        <div style={{ width: tableWrapperWidth }}>
          <div
            ref={headerRef}
            className="dirent-virtual-list-header"
            style={{ gridTemplateColumns }}
          >
            {headers.map((header, index) => {
              const { className: headerClassName, children } = header;
              return (
                <div
                  key={index}
                  className={`dirent-virtual-list-header-cell ${headerClassName || ''}`}
                >
                  {children}
                </div>
              );
            })}
          </div>

          <div className="dirent-virtual-list-body">
            <VirtualList
              items={items}
              itemHeight={itemHeight}
              overscan={overscan}
              scrollTop={scrollTop}
              scrollContainerRef={scrollContainerRef}
              renderItem={({ item }) => (
                <DirentItemWrapper
                  key={item.name}
                  dirent={item}
                  gridTemplateColumns={gridTemplateColumns}
                  registerExecuteOperation={registerExecuteOperation}
                  unregisterExecuteOperation={unregisterExecuteOperation}
                  {...itemProps}
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

DirentVirtualListView.propTypes = {
  headers: PropTypes.array.isRequired,
  items: PropTypes.array.isRequired,
  itemHeight: PropTypes.number,
  overscan: PropTypes.number,
};

export default DirentVirtualListView;
