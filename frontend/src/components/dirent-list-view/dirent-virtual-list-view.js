import React, { useRef, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import VirtualList from '../virtual-list/virtual-list';
import DirentListItem from './dirent-list-item';
import { useCollaborators } from '../../metadata';

import './dirent-virtual-list.css';

const DirentItemWrapper = ({
  dirent,
  path,
  repoID,
  registerExecuteOperation,
  unregisterExecuteOperation,
  statusColumnOptions,
  ...itemProps
}) => {
  const childRef = useRef(null);

  useEffect(() => {
    if (childRef.current) {
      registerExecuteOperation(dirent.name, childRef.current);
    }

    return () => {
      unregisterExecuteOperation(dirent.name);
    };
  }, [dirent.name, registerExecuteOperation, unregisterExecuteOperation]);

  return (
    <DirentListItem
      ref={childRef}
      dirent={dirent}
      path={path}
      repoID={repoID}
      statusColumnOptions={statusColumnOptions}
      {...itemProps}
    />
  );
};

const DirentVirtualListView = ({
  headers,
  items,
  itemHeight = 42,
  overscan = 5,
  registerExecuteOperation,
  unregisterExecuteOperation,
  visibleColumns = [],
  repoID,
  path,
  ...itemProps
}) => {
  const scrollContainerRef = useRef(null);
  const headerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const isMobile = useMemo(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }, []);

  const tableWrapperWidth = useMemo(() => {
    if (containerWidth === 0) {
      return '100%';
    }
    return containerWidth > 768 ? containerWidth : 768;
  }, [containerWidth]);

  const { collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser } = useCollaborators();


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

  const handleScroll = (e) => {
    const { scrollTop: st, scrollLeft } = e.target;

    setScrollTop(st);

    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }
  };

  return (
    <div className="dirent-virtual-list-view">
      <div
        ref={scrollContainerRef}
        className="dirent-virtual-scroll-container"
        onScroll={handleScroll}
      >
        <div style={{ width: tableWrapperWidth }}>
          {!isMobile && (
            <div
              ref={headerRef}
              className="d-flex dirent-virtual-list-header"
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
          )}

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
                  path={path}
                  repoID={repoID}
                  registerExecuteOperation={registerExecuteOperation}
                  unregisterExecuteOperation={unregisterExecuteOperation}
                  collaborators={collaborators}
                  collaboratorsCache={collaboratorsCache}
                  updateCollaboratorsCache={updateCollaboratorsCache}
                  queryUser={queryUser}
                  visibleColumns={visibleColumns}
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
