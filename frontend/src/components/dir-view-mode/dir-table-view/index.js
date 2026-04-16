import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import PropTypes from 'prop-types';
import SFTable from '../../sf-table';
import { transformDirentsToTableData } from './data-transformer';
import { createDirentTableColumns, setDirTableColumnWidth } from './columns';
import { siteRoot, enableSeadoc, enableWhiteboard } from '@/utils/constants';
import { Utils } from '@/utils/utils';
import Icon from '@/components/icon';
import TextTranslation from '@/utils/text-translation';
import { PRIVATE_COLUMN_KEY, EVENT_BUS_TYPE as METADATA_EVENT_BUS_TYPE, CellType } from '@/metadata/constants';
import { useTags } from '@/tag/hooks';
import { RecordMetrics } from '../../sf-table/utils/record-metrics';
import { menuHandlers } from '../utils/menuHandlers';
import { useDirentContextMenu } from '../hooks/useDirentContextMenu';
import { getCreateMenuList } from '../utils/contextMenuUtils';
import EventBus from '@/components/common/event-bus';
import { EVENT_BUS_TYPE } from '@/components/sf-table/constants/event-bus-type';
import { getRowById, getRowsByIds } from '@/components/sf-table/utils/table';
import { useMetadataStatus } from '@/hooks';
import { metadataAPI } from '@/metadata';
import { getColumnByKey, getColumnOriginName } from '@/components/sf-table/utils/column';
import { getColumnOptionNameById, getColumnOptionNamesByIds } from '@/metadata/utils/cell';
import tagsAPI from '@/tag/api';
import { GridUtilsAdapter } from '@/components/sf-table/utils/grid-utils-adapter';

import './index.css';

const DIR_TABLE_UNSUPPORTED_MENU_OPTION_KEYS = [
  TextTranslation.STAR.key,
  TextTranslation.UNSTAR.key,
];

const DirTableView = ({
  direntList,
  isDirentListLoading,
  repoID,
  repoInfo,
  path,
  sortBy,
  sortOrder,
  columns,
  hiddenColumnKeys,
  eventBus,
  onItemClick,
  onItemDelete,
  onItemsDelete,
  onItemRename,
  onItemSelected,
  updateDirent,
  updateDirentMetadata,
  onItemConvert,
  isDirentDetailShow,
  showDirentDetail,
  onItemsMove,
  onItemMove,
  selectedDirentList,
  onSelectedDirentListUpdate,
  onColumnOrderChange,
}) => {
  const [isSubMenuShown, setSubMenuShown] = useState(false);
  const [hoveredOptionKey, setHoveredOptionKey] = useState('');
  const [columnWidthVersion, setColumnWidthVersion] = useState(0);
  const hideMenuRef = useRef(null);
  const sfTableEventBus = useRef(EventBus.getInstance());

  const { globalHiddenColumns } = useMetadataStatus();
  const { tagsData } = useTags();

  const { getBatchMenuList, getItemMenuList } = useDirentContextMenu({ repoInfo });

  const permission = useMemo(() => {
    const repoCanModify = repoInfo.permission === 'rw' || repoInfo.permission === 'admin';
    return {
      canModify: () => repoCanModify,
      canModifyRow: (record) => repoCanModify && record._permission !== 'r',
      canModifyColumn: (column) => repoCanModify && column.editable === true,
    };
  }, [repoInfo]);

  const tableData = useMemo(() => {
    return transformDirentsToTableData(direntList, repoID);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direntList, repoID, sortBy, sortOrder]);

  const enrichedColumns = useMemo(() => {
    const visibleColumns = columns.filter(col => !globalHiddenColumns.includes(col.key) && !hiddenColumnKeys.includes(col.key));
    return createDirentTableColumns(repoID, repoInfo, visibleColumns);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, repoInfo, columns, globalHiddenColumns, hiddenColumnKeys, columnWidthVersion]);

  const updateDirentDetail = useCallback((parentDir, fileName, update) => {
    if (!isDirentDetailShow || window?.sfMetadataContext?.eventBus) return;
    window.sfMetadataContext.eventBus.dispatch(
      METADATA_EVENT_BUS_TYPE.LOCAL_RECORD_DETAIL_CHANGED,
      { parentDir, fileName },
      update
    );
  }, [isDirentDetailShow]);

  const handleDirentMetadata = useCallback((id, direntName, update) => {
    const dirent = direntList.find(d => d.name === direntName);
    const parentDir = dirent.parent_dir || path;
    const key = Object.keys(update)[0];
    if (key !== PRIVATE_COLUMN_KEY.TAGS) {
      metadataAPI.modifyRecord(repoID, { recordId: id }, update);
    }
    updateDirentMetadata(direntName, update);
    updateDirentDetail(parentDir, direntName, update);
  }, [direntList, path, repoID, updateDirentDetail, updateDirentMetadata]);

  const modifyColumnWidth = useCallback((column, newWidth) => {
    setDirTableColumnWidth(column.key, newWidth);
    setColumnWidthVersion(prev => prev + 1);
  }, []);

  const modifyColumnOrder = useCallback((source, target) => {
    if (!onColumnOrderChange) return;
    onColumnOrderChange(source, target);
  }, [onColumnOrderChange]);

  const getDirentByRowId = useCallback((id) => {
    const record = getRowById(tableData, id);
    if (!record) return;
    const dirent = direntList.find(d => d.name === record._name);
    return dirent;
  }, [tableData, direntList]);

  const getDirentsByRowIds = useCallback((ids) => {
    if (ids.length === 0) return [];
    const recordNames = getRowsByIds(tableData, ids).map(r => r._name);
    return direntList.filter(d => recordNames.includes(d.name));
  }, [tableData, direntList]);

  const modifyRecord = useCallback(({ rowId, cellKey, updates }) => {
    const dirent = getDirentByRowId(rowId);
    if (!dirent) return;
    Object.entries(updates).forEach(([key, value]) => {
      if (key === PRIVATE_COLUMN_KEY.FILE_NAME) {
        onItemRename(dirent, value);
      } else {
        // Handle metadata columns - call handleDirentMetadata
        const record = getRowById(tableData, rowId);
        if (record) {
          let update = { [key]: value };
          const column = getColumnByKey(enrichedColumns, cellKey);
          if (column.type === CellType.SINGLE_SELECT) {
            update = { [key]: getColumnOptionNameById(column, value) };
          } else if (column.type === CellType.MULTIPLE_SELECT) {
            update = { [key]: getColumnOptionNamesByIds(column, value) };
          }
          handleDirentMetadata(rowId, record._name, update);
        }
      }
    });
  }, [getDirentByRowId, onItemRename, tableData, enrichedColumns, handleDirentMetadata]);

  // Batch modify records for drag-fill support
  // Accepts extended signature: (recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData, isFromCut)
  const modifyRecords = useCallback((recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData, isFromCut) => {
    if (!recordIds || !idRecordUpdates) return;
    recordIds.forEach(rowId => {
      const updates = idRecordUpdates[rowId];
      if (!updates) return;
      const dirent = getDirentByRowId(rowId);
      if (!dirent) return;
      const record = getRowById(tableData, rowId);
      if (!record) return;

      Object.entries(updates).forEach(([key, value]) => {
        let update = { [key]: value };
        const column = getColumnByKey(enrichedColumns, key);
        if (column) {
          if (column.type === CellType.SINGLE_SELECT) {
            update = { [key]: getColumnOptionNameById(column, value) };
          } else if (column.type === CellType.MULTIPLE_SELECT) {
            update = { [key]: getColumnOptionNamesByIds(column, value) };
          }
        }
        handleDirentMetadata(rowId, record._name, update);
      });
    });
  }, [getDirentByRowId, tableData, enrichedColumns, handleDirentMetadata]);

  const updateFileTags = useCallback((data) => {
    const recordID = data[0].record_id;
    const tagIds = Array.isArray(data[0].tags) && data[0].tags.length > 0 ? data[0].tags : [];
    const tags = getRowsByIds(tagsData, tagIds).map(tag => ({ row_id: tag._id, display_value: tag._name }));
    const record = getRowById(tableData, recordID);
    handleDirentMetadata(recordID, record._name, { [PRIVATE_COLUMN_KEY.TAGS]: tags });
    tagsAPI.updateFileTags(repoID, [{ record_id: recordID, tags: tagIds }]);
  }, [tagsData, tableData, handleDirentMetadata, repoID]);

  const handleSelectCellsDelete = useCallback((records, columns) => {
    records.forEach(record => {
      const { _id, _name } = record;
      const hasTagsColumn = columns.some(col => col && col.type === CellType.TAGS);
      if (hasTagsColumn) {
        tagsAPI.updateFileTags(repoID, [{ record_id: _id, tags: [] }]);
        handleDirentMetadata(_id, _name, { [PRIVATE_COLUMN_KEY.TAGS]: [] });
      }

      columns.forEach(column => {
        const { key, type } = column;
        if (type === CellType.TAGS) return;
        if (key === PRIVATE_COLUMN_KEY.FILE_NAME) return;
        if (!column.editable) return;
        const fieldKey = getColumnOriginName(column);
        handleDirentMetadata(_id, _name, { [fieldKey]: null });
      });
    });
  }, [repoID, handleDirentMetadata]);

  // Record getter for gridUtils adapter
  const recordGetterByIndex = useCallback(({ recordIndex }) => {
    const recordId = tableData.row_ids[recordIndex];
    return recordId && tableData.id_row_map[recordId];
  }, [tableData]);

  // Create GridUtils adapter for copy/paste and drag-fill
  const gridUtilsAdapter = useMemo(() => {
    return new GridUtilsAdapter({
      renderRecordsIds: tableData.row_ids || [],
      api: {
        recordGetterById: (id) => tableData.id_row_map?.[id],
        recordGetterByIndex,
        modifyRecords: (recordIds, idRecordUpdates) => modifyRecords(recordIds, idRecordUpdates),
        updateFileTags,
        getTagsData: () => tagsData || {},
        getCollaborators: () => [],
      },
    });
  }, [tableData, recordGetterByIndex, modifyRecords, updateFileTags, tagsData]);

  // Paste callback - delegates to gridUtilsAdapter.paste()
  const paste = useCallback(({ type, copied, multiplePaste, pasteRange, isGroupView, pasteSource, cutPosition }) => {
    const { search } = window.location;
    const urlParams = new URLSearchParams(search);
    const viewId = urlParams.has('view') ? urlParams.get('view') : null;
    gridUtilsAdapter.paste({
      type,
      copied,
      multiplePaste,
      pasteRange,
      isGroupView,
      columns: enrichedColumns,
      pasteSource,
      cutPosition,
      viewId,
      canModifyRow: permission.canModifyRow,
      canModifyColumn: permission.canModifyColumn,
    });
  }, [gridUtilsAdapter, enrichedColumns, permission]);

  const toggleSubMenu = (e, subMenuOptionKey) => {
    e.stopPropagation();
    if (!subMenuOptionKey) {
      setSubMenuShown(!isSubMenuShown);
      return;
    }
    setSubMenuShown(true);
    setHoveredOptionKey(subMenuOptionKey);
  };

  const onRenameEditor = () => {
    sfTableEventBus.current.dispatch(EVENT_BUS_TYPE.OPEN_EDITOR);
  };

  const onOptionClick = (e, option, dirent, selectedDirents) => {
    e.preventDefault();
    e.stopPropagation();

    const isBatch = selectedDirents && selectedDirents.length > 1;
    const dirents = isBatch ? selectedDirents : dirent;

    const handler = menuHandlers[option.key];
    if (handler) {
      handler({
        eventBus,
        path,
        repoID,
        dirent,
        dirents,
        isBatch,
        onItemDelete,
        onItemRename: onRenameEditor,
        onBatchDelete: onItemsDelete,
        updateDirent,
        onItemConvert,
        showDirentDetail,
        direntList,
      });
    }

    hideMenuRef.current && hideMenuRef.current();
  };

  const createContextMenuOptions = (tableProps) => {
    const { hideMenu, recordMetrics, selectedPosition } = tableProps;
    if (!selectedPosition) return;

    hideMenuRef.current = hideMenu;

    const selectedRecordIds = recordMetrics && RecordMetrics.getSelectedIds(recordMetrics) || [];
    const selectedDirents = selectedRecordIds
      .map(id => getDirentByRowId(id))
      .filter(Boolean);

    const { idx, rowIdx } = selectedPosition;
    // No selection - show create menu
    if (idx === -1 && rowIdx === -1 && selectedRecordIds.length === 0) {
      const createMenuOptions = getCreateMenuList({
        enableSeadoc,
        enableWhiteboard,
        isRepoEncrypted: repoInfo.encrypted
      });

      return createMenuOptions.map((option, index) => {
        if (option === 'Divider') {
          return <div key={index} className="seafile-divider dropdown-divider"></div>;
        }
        return (
          <button
            key={option.key}
            className="seafile-contextmenu-item dropdown-item dir-table-menu-item"
            onClick={(e) => onOptionClick(e, option, null, selectedDirents)}
          >
            {option.value}
          </button>
        );
      });
    }

    // Show batch operations menu
    if (selectedDirents.length > 1) {
      const batchOptions = getBatchMenuList(selectedDirents);

      return batchOptions.map((option, index) => (
        <button
          key={option.key}
          className="seafile-contextmenu-item dropdown-item dir-table-menu-item"
          onClick={(e) => onOptionClick(e, option, null, selectedDirents)}
        >
          {option.value}
        </button>
      ));
    }

    // Single dirent menu
    const dirent = selectedDirents[0] || direntList[rowIdx];
    if (!dirent) return;
    let options = getItemMenuList(dirent)
      .filter(option => !DIR_TABLE_UNSUPPORTED_MENU_OPTION_KEYS.includes(option.key));

    if (idx !== 0) {
      options = options.filter(op => op.key !== TextTranslation.RENAME.key);
    }

    return options.map((option, index) => {
      if (option === 'Divider') {
        return <div key={index} className="seafile-divider dropdown-divider"></div>;
      } else if (option.subOpList) {
        return (
          <Dropdown
            key={index}
            direction="right"
            className="w-100"
            isOpen={isSubMenuShown && option.key === hoveredOptionKey}
            toggle={toggleSubMenu}
            onMouseMove={(e) => {e.stopPropagation();}}
          >
            <DropdownToggle
              tag="span"
              className="dropdown-item font-weight-normal rounded-0 d-flex align-items-center"
              onMouseEnter={(e) => toggleSubMenu(e, option.key)}
            >
              <span className="mr-auto">{option.value}</span>
              <Icon symbol="down" className="rotate-270" />
            </DropdownToggle>
            <DropdownMenu>
              {option.subOpList.map((subOp, subIndex) => {
                if (subOp == 'Divider') {
                  return <DropdownItem key={subIndex} divider />;
                } else {
                  return (
                    <DropdownItem
                      key={subIndex}
                      data-operation={subOp.key}
                      onClick={(e) => onOptionClick(e, subOp, dirent, selectedDirents)}
                      onContextMenu={(e) => e.stopPropagation()}
                    >
                      {subOp.value}
                    </DropdownItem>
                  );
                }
              })}
            </DropdownMenu>
          </Dropdown>
        );
      } else {
        return (
          <button
            key={index}
            className="seafile-contextmenu-item dropdown-item dir-table-menu-item"
            data-op={option.key}
            onClick={(e) => onOptionClick(e, option, dirent, selectedDirents)}
            onContextMenu={(e) => e.stopPropagation()}
            onMouseMove={() => {setSubMenuShown(false);}}
          >
            {option.value}
          </button>
        );
      }
    });
  };

  const handleSelectedRecord = useCallback((ids) => {
    const list = getDirentsByRowIds(ids);
    onSelectedDirentListUpdate(list);
  }, [getDirentsByRowIds, onSelectedDirentListUpdate]);

  const onRecordSelected = useCallback((event, rowId) => {
    const dirent = getDirentByRowId(rowId);
    onItemSelected(dirent, event);
  }, [getDirentByRowId, onItemSelected]);

  const renderCustomDraggedRows = useCallback((draggedRecordIds) => {
    if (!Array.isArray(draggedRecordIds) || draggedRecordIds.length === 0) return null;
    return draggedRecordIds.map((recordId) => {
      const dirent = getDirentByRowId(recordId);
      if (!dirent) return null;
      const iconUrl = Utils.getDirentIcon(dirent);
      return (
        <tr key={`rdg-dragged-record-${recordId}`} className="rdg-dragged-record">
          <td className="rdg-dragged-record-cell">
            <div className="d-flex align-items-center">
              {dirent.encoded_thumbnail_src ? (
                <img
                  src={`${siteRoot}${dirent.encoded_thumbnail_src}?mtime=${dirent.mtime}`}
                  alt={dirent.name}
                  className="thumbnail"
                  style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 2 }}
                />
              ) : (
                <img src={iconUrl} width="24" height="24" alt="" style={{ borderRadius: 2 }} />
              )}
              <span className="ml-2">{dirent.name}</span>
            </div>
          </td>
        </tr>
      );
    });
  }, [getDirentByRowId]);

  const moveDirents = useCallback(({ draggingSource, dropTarget }) => {
    if (!draggingSource || !dropTarget) {
      return;
    }

    const destRecordId = dropTarget;
    const destDirent = getDirentByRowId(destRecordId);
    if (!destDirent) {
      return;
    }

    const destRepo = {
      repo_id: repoID,
    };

    let destDirentPath;
    if (destDirent.type === 'dir') {
      const parentPath = destDirent.parent_path || path;
      destDirentPath = parentPath === '/' ? `/${destDirent.name}` : `${parentPath}/${destDirent.name}`;
    } else {
      destDirentPath = path;
    }

    if (draggingSource.length === 1) {
      if (!onItemMove) return;
      const sourceRecordId = draggingSource[0];
      const sourceDirent = getDirentByRowId(sourceRecordId);
      if (!sourceDirent) return;
      onItemMove(destRepo, sourceDirent, destDirentPath, path, false);
    } else {
      if (!onItemsMove) return;
      onItemsMove(destRepo, destDirentPath, false);
    }
  }, [repoID, path, getDirentByRowId, onItemMove, onItemsMove]);

  // Callback to set drag data for TreeView compatibility
  const onTableDragStart = useCallback((event, { draggingRecordId }) => {
    if (Utils.isIEBrowser()) return;

    const sourceDirent = getDirentByRowId(draggingRecordId);
    if (!sourceDirent) return;

    // Check if the dragged item is part of the current selection
    const isSelected = selectedDirentList.some(d => d.name === sourceDirent.name);

    if (isSelected && selectedDirentList.length > 1) {
      // Multiple items selected - include all in drag data
      const selectedList = selectedDirentList.map(dirent => {
        const parentPath = dirent.parent_dir || path;
        return {
          nodeDirent: dirent,
          nodeParentPath: parentPath,
          nodeRootPath: parentPath === '/' ? `/${dirent.name}` : `${parentPath}/${dirent.name}`
        };
      });
      event.dataTransfer.setData('application/drag-item-info', JSON.stringify(selectedList));
    } else {
      // Single item drag
      const parentPath = sourceDirent.parent_dir || path;
      const dragData = {
        nodeDirent: sourceDirent,
        nodeParentPath: parentPath,
        nodeRootPath: parentPath === '/' ? `/${sourceDirent.name}` : `${parentPath}/${sourceDirent.name}`
      };
      event.dataTransfer.setData('application/drag-item-info', JSON.stringify(dragData));
    }

    event.dataTransfer.effectAllowed = 'move';
  }, [path, getDirentByRowId, selectedDirentList]);

  return (
    <div className="dir-table-view dir-table-wrapper">
      <SFTable
        {...permission}
        repoID={repoID}
        table={tableData}
        visibleColumns={enrichedColumns}
        recordsIds={tableData.row_ids}
        headerSettings={{}}
        noRecordsTipsText=""
        groupbys={[]}
        groups={[]}
        recordsTree={[]}
        showSequenceColumn={true}
        showGridFooter={false}
        hasMoreRecords={false}
        isLoadingMoreRecords={false}
        isLoading={isDirentListLoading}
        enableScrollToLoad={false}
        modifyColumnWidth={modifyColumnWidth}
        modifyColumnOrder={modifyColumnOrder}
        modifyRecord={modifyRecord}
        modifyRecords={modifyRecords}
        supportCopy={true}
        supportPaste={true}
        paste={paste}
        supportDragFill={true}
        supportCut={true}
        isGroupView={false}
        gridUtils={gridUtilsAdapter}
        showRecordAsTree={false}
        createContextMenuOptions={createContextMenuOptions}
        onRecordSelected={onRecordSelected}
        renderCustomDraggedRows={renderCustomDraggedRows}
        moveRecords={moveDirents}
        selectedDirentList={selectedDirentList}
        updateSelectedRecordIds={handleSelectedRecord}
        onTableDragStart={onTableDragStart}
        updateFileTags={updateFileTags}
        handleSelectCellsDelete={handleSelectCellsDelete}
      />
    </div>
  );
};

DirTableView.propTypes = {
  direntList: PropTypes.array.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  repoID: PropTypes.string.isRequired,
  repoInfo: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  columns: PropTypes.array,
  hiddenColumnKeys: PropTypes.array,
  eventBus: PropTypes.object,
  onItemClick: PropTypes.func,
  onItemDelete: PropTypes.func,
  onItemsDelete: PropTypes.func,
  onItemRename: PropTypes.func,
  onItemSelected: PropTypes.func,
  onBatchDelete: PropTypes.func,
  updateDirent: PropTypes.func,
  updateDirentMetadata: PropTypes.func,
  onItemConvert: PropTypes.func,
  showDirentDetail: PropTypes.func,
  onItemsMove: PropTypes.func,
  onItemMove: PropTypes.func,
  onColumnOrderChange: PropTypes.func,
};

export default DirTableView;
