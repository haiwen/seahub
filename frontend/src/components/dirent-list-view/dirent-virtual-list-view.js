import React, { useRef, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import VirtualList from '../virtual-list/virtual-list';
import DirentListItem from './dirent-list-item';
import { calculateResponsiveColumns } from '../../utils/table-headers';
import './dirent-virtual-list.css';

const DirentVirtualListView = ({
  headers,
  items,
  itemHeight = 42,
  overscan = 5,
  onItemClick,
  onItemRenameToggle,
  onItemSelected,
  onItemDelete,
  onItemRename,
  onItemMove,
  onItemConvert,
  updateDirent,
  isItemFreezed,
  freezeItem,
  unfreezeItem,
  onDirentClick,
  showImagePopup,
  onItemMouseDown,
  onItemContextMenu,
  selectedDirentList,
  activeDirent,
  repoTags,
  onFileTagChanged,
  getDirentItemMenuList,
  showDirentDetail,
  onItemsMove,
  onShowDirentsDraggablePreview,
  loadDirentList,
  onAddFolder,
  path,
  repoID,
  currentRepoInfo,
  eventBus,
  isAdmin,
  isRepoOwner,
  repoEncrypted,
  enableDirPrivateShare,
  isGroupOwnedRepo,
  onThreadMouseDown,
  onThreadContextMenu,
}) => {
  const scrollContainerRef = useRef(null);
  const headerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setContainerWidth(container.offsetWidth - 32);
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
    const { scrollTop, scrollLeft } = e.target;

    setScrollTop(scrollTop);

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
        <div style={{ width: tableWidth }}>
          <div
            ref={headerRef}
            className="dirent-virtual-list-header"
            style={{ gridTemplateColumns }}
            onMouseDown={onThreadMouseDown}
            onContextMenu={onThreadContextMenu}
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
              renderItem={({ item }) => (
                <DirentListItem
                  key={item.name}
                  dirent={item}
                  path={path}
                  repoID={repoID}
                  currentRepoInfo={currentRepoInfo}
                  eventBus={eventBus}
                  isAdmin={isAdmin}
                  isRepoOwner={isRepoOwner}
                  repoEncrypted={repoEncrypted}
                  enableDirPrivateShare={enableDirPrivateShare}
                  isGroupOwnedRepo={isGroupOwnedRepo}
                  onItemClick={onItemClick}
                  onItemRenameToggle={onItemRenameToggle}
                  onItemSelected={onItemSelected}
                  onItemDelete={onItemDelete}
                  onItemRename={onItemRename}
                  onItemMove={onItemMove}
                  onItemConvert={onItemConvert}
                  updateDirent={updateDirent}
                  isItemFreezed={isItemFreezed}
                  freezeItem={freezeItem}
                  unfreezeItem={unfreezeItem}
                  onDirentClick={onDirentClick}
                  showImagePopup={showImagePopup}
                  onItemMouseDown={onItemMouseDown}
                  onItemContextMenu={onItemContextMenu}
                  selectedDirentList={selectedDirentList}
                  activeDirent={activeDirent}
                  repoTags={repoTags}
                  onFileTagChanged={onFileTagChanged}
                  getDirentItemMenuList={getDirentItemMenuList}
                  showDirentDetail={showDirentDetail}
                  onItemsMove={onItemsMove}
                  onShowDirentsDraggablePreview={onShowDirentsDraggablePreview}
                  loadDirentList={loadDirentList}
                  onAddFolder={onAddFolder}
                  gridTemplateColumns={gridTemplateColumns}
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
  // DirentListItem props
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object,
  eventBus: PropTypes.object.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  isRepoOwner: PropTypes.bool,
  repoEncrypted: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemRenameToggle: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemConvert: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  freezeItem: PropTypes.func.isRequired,
  unfreezeItem: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  showImagePopup: PropTypes.func.isRequired,
  onItemMouseDown: PropTypes.func.isRequired,
  onItemContextMenu: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  activeDirent: PropTypes.object,
  repoTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func,
  getDirentItemMenuList: PropTypes.func.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onShowDirentsDraggablePreview: PropTypes.func,
  loadDirentList: PropTypes.func,
  onAddFolder: PropTypes.func,
  // Header event handlers
  onThreadMouseDown: PropTypes.func,
  onThreadContextMenu: PropTypes.func,
};

export default DirentVirtualListView;
