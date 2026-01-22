import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import VirtualList from '../virtual-list/virtual-list';
import DirentListItem from './dirent-list-item';
import useDirentMetadata from '../../hooks/use-dirent-metadata';
import { Dirent } from '../../models';
import './dirent-virtual-list.css';
import { useCollaborators } from '../../metadata';

const DirentItemWrapper = ({
  dirent,
  path,
  repoID,
  registerExecuteOperation,
  unregisterExecuteOperation,
  metadataMap,
  getMetadataForDirent,
  isDirentLoading,
  updateDirentStatus,
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

  // Enrich dirent with metadata
  const enrichedDirent = useMemo(() => {
    let direntInstance = dirent;
    if (!(dirent instanceof Dirent) && typeof dirent.mergeMetadata !== 'function') {
      const isSelectedValue = dirent.isSelected;
      direntInstance = new Dirent(dirent);
      direntInstance.isSelected = isSelectedValue;
    }

    if (!metadataMap || metadataMap.size === 0) {
      return direntInstance;
    }
    const metadata = metadataMap.get(direntInstance.name);
    if (metadata && typeof direntInstance.mergeMetadata === 'function') {
      const enriched = direntInstance.mergeMetadata(metadata);
      enriched.isSelected = direntInstance.isSelected;
      return enriched;
    }
    return direntInstance;
  }, [dirent, metadataMap]);

  // Check if this specific item is loading
  const isMetadataLoading = isDirentLoading(dirent);

  // Handle status change
  const handleStatusChange = useCallback((direntItem, newStatus, metadata) => {
    // If it's a local update (from StatusEditor), don't call API again
    if (metadata?.isLocalUpdate) {
      // Just update the local dirent object
      if (itemProps.updateDirent) {
        itemProps.updateDirent(direntItem, 'status', newStatus);
      }
    } else {
      // External update, call the hook's update function
      if (updateDirentStatus) {
        updateDirentStatus(direntItem.name, newStatus);
      }
    }
  }, [updateDirentStatus, itemProps]);

  return (
    <DirentListItem
      ref={childRef}
      dirent={enrichedDirent}
      path={path}
      repoID={repoID}
      isMetadataLoading={isMetadataLoading}
      onStatusChange={handleStatusChange}
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
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 0 });

  const prevVisibleRangeRef = useRef({ startIndex: 0, endIndex: 0 });

  const handleVisibleRangeChange = useCallback((newRange) => {
    const { startIndex, endIndex } = newRange;
    const { startIndex: prevStart, endIndex: prevEnd } = prevVisibleRangeRef.current;

    if (startIndex !== prevStart || endIndex !== prevEnd) {
      prevVisibleRangeRef.current = { startIndex, endIndex };
      setVisibleRange({ startIndex, endIndex });
    }
  }, []);
  const {
    metadataMap,
    getMetadataForDirent,
    isDirentLoading,
    updateDirentStatus,
    statusColumnOptions,
  } = useDirentMetadata({
    repoID,
    path,
    direntList: items,
    visibleColumns,
    visibleRange,
    overscan: 10,
  });

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

  const tableWrapperWidth = containerWidth > 768 ? containerWidth : 768;

  return (
    <div className="dirent-virtual-list-view">
      <div
        ref={scrollContainerRef}
        className="dirent-virtual-scroll-container"
        onScroll={handleScroll}
      >
        <div style={{ width: tableWrapperWidth || '100%' }}>
          <div
            ref={headerRef}
            className="dirent-virtual-list-header"
            style={{ display: 'flex' }}
          >
            {headers.map((header, index) => {
              const { className: headerClassName, children, flex } = header;
              return (
                <div
                  key={index}
                  className={`dirent-virtual-list-header-cell ${headerClassName || ''}`}
                  style={{ flex: flex || '1' }}
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
              onVisibleRangeChange={handleVisibleRangeChange}
              renderItem={({ item }) => (
                <DirentItemWrapper
                  key={item.name}
                  dirent={item}
                  path={path}
                  repoID={repoID}
                  registerExecuteOperation={registerExecuteOperation}
                  unregisterExecuteOperation={unregisterExecuteOperation}
                  visibleColumns={visibleColumns}
                  metadataMap={metadataMap}
                  getMetadataForDirent={getMetadataForDirent}
                  isDirentLoading={isDirentLoading}
                  updateDirentStatus={updateDirentStatus}
                  statusColumnOptions={statusColumnOptions}
                  collaborators={collaborators}
                  collaboratorsCache={collaboratorsCache}
                  updateCollaboratorsCache={updateCollaboratorsCache}
                  queryUser={queryUser}
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
