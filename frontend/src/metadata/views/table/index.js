import React, { useCallback, useMemo, useState } from 'react';
import { toKeyCode } from 'is-hotkey';
import toaster from '../../../components/toast';
import SFTable from '../../../components/sf-table';
import { useMetadataView } from '../../hooks/metadata-view';
import { useMetadataStatus } from '../../../hooks';
import { Utils } from '../../../utils/utils';
import { isModZ, isModShiftZ } from '../../../utils/hotkey';
import { getValidGroupbys } from '../../utils/group';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER, MAX_LOAD_NUMBER, TABLE_NOT_DISPLAY_COLUMN_KEYS, PRIVATE_COLUMN_KEY } from '../../constants';
import { adaptMetadataColumnsToSfTable, useMetadataTableAdapter } from './adapter';
import ExpandedPropertiesDialog from '../../components/dialog/expanded-properties';
import { getCellValueByColumn, getTagsFromRecord, isValidCellValue } from '../../utils/cell';
import { getFormatRecordData } from '../../utils/cell/cell-format-utils';
import CellType from '@/metadata/constants/column/type';
import HeaderDropdownMenu from '@/components/sf-table/table-main/records-header/dropdown-menu';
import { useTags } from '@/tag/hooks';

const Table = () => {
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const {
    repoID,
    isLoading,
    metadata,
    store,
    modifyRecords,
    deleteRecords,
    modifyRecord,
    renameColumn,
    deleteColumn,
    modifyColumnData,
    modifyColumnOrder,
    modifyColumnWidth,
    insertColumn,
    updateFileTags,
    updateSelectedRecordIds,
    updateRecordDetails,
    updateFaceRecognition,
    updateRecordDescription,
    onOCR,
    generateFileTags,
  } = useMetadataView();
  const { globalHiddenColumns, enableFaceRecognition, enableTags } = useMetadataStatus();
  const { tagsData } = useTags();

  const permission = useMemo(() => {
    return {
      canModify: () => store.context.canModify(),
      canModifyRow: (record) => store.context.canModifyRow(record),
      canModifyColumn: (column) => store.context.canModifyColumn(column),
      canModifyView: () => store.context.canModifyView(),
      canModifyColumnData: (column) => store.context.canModifyColumnData(column),
      canDeleteColumn: (column) => store.context.canDeleteColumn(column),
      canRenameColumn: (column) => store.context.canRenameColumn(column),
      canInsertColumn: () => store.context.canInsertColumn(),
    };
  }, [store.context]);

  const focusDataGrid = useCallback(() => {
    setTimeout(() => window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.FOCUS_CANVAS), 0);
  }, []);

  const onShowExpandedPropsDialog = useCallback((recordId) => {
    setExpandedRecordId(recordId);
  }, []);

  const toggleExpandedPropsDialog = useCallback(() => {
    setExpandedRecordId(null);
  }, []);

  const handleSelectCellsDelete = useCallback((records, columns) => {
    let updateRecordIds = [];
    let idRecordUpdates = {};
    let idOriginalRecordUpdates = {};
    let idOldRecordData = {};
    let idOriginalOldRecordData = {};
    let tagsUpdate = [];

    records.forEach(record => {
      const { _id } = record;
      let originalUpdate = {};
      let originalOldRecordData = {};
      let hasTagsColumn = false;

      columns.forEach(column => {
        const { key, type } = column;
        const cellVal = getCellValueByColumn(record, column);
        if (isValidCellValue(cellVal)) {
          if (type === CellType.TAGS) {
            hasTagsColumn = true;
          } else if (type === CellType.GEOLOCATION) {
            originalOldRecordData[key] = cellVal;
            originalUpdate[key] = null;

            const locationTranslatedVal = record[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED];
            if (locationTranslatedVal) {
              originalOldRecordData[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED] = locationTranslatedVal;
              originalUpdate[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED] = null;
            }
          } else {
            originalOldRecordData[key] = cellVal;
            originalUpdate[key] = null;
          }
        }
      });

      // Handle tags separately
      if (hasTagsColumn) {
        const oldValue = getTagsFromRecord(record);
        tagsUpdate.push({ record_id: _id, tags: [], old_tags: Array.isArray(oldValue) ? oldValue.map(i => i.row_id) : [] });
      }

      if (Object.keys(originalUpdate).length > 0) {
        updateRecordIds.push(_id);
        const update = getFormatRecordData(columns, originalUpdate);
        const oldRecordData = getFormatRecordData(columns, originalOldRecordData);
        idRecordUpdates[_id] = update;
        idOriginalRecordUpdates[_id] = originalUpdate;
        idOldRecordData[_id] = oldRecordData;
        idOriginalOldRecordData[_id] = originalOldRecordData;
      }
    });

    if (tagsUpdate.length > 0) {
      updateFileTags(tagsUpdate);
    }

    if (updateRecordIds.length > 0) {
      modifyRecords(updateRecordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData);
    }
  }, [modifyRecords, updateFileTags]);

  const onHotKey = useCallback((event) => {
    if (event.keyCode === toKeyCode('mod+shift')) return;
    if (event.target.className.includes('sf-metadata-editor-main')) return;

    if (isModZ(event)) {
      event.preventDefault();
      if (!permission.canModify()) return;
      store.undoOperation();
      focusDataGrid();
    } else if (isModShiftZ(event)) {
      event.preventDefault();
      if (!permission.canModify()) return;
      store.redoOperation();
      focusDataGrid();
    }
  }, [permission, store, focusDataGrid]);

  const onHotKeyUp = useCallback((event) => {
    if (event.target.className.includes('sf-metadata-editor-main')) return;
  }, []);

  const isGroupView = useMemo(() => {
    if (isLoading || !metadata) return false;
    const validGroupbys = getValidGroupbys(metadata.view.groupbys, metadata.columns);
    return validGroupbys.length > 0;
  }, [isLoading, metadata]);

  const loadMore = useCallback(async () => {
    if (!metadata.hasMore) return;
    setLoadingMore(true);

    try {
      await store.loadMore(PER_LOAD_NUMBER);
      setLoadingMore(false);
    } catch (error) {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setLoadingMore(false);
      return;
    }

  }, [metadata, store]);

  const loadAll = useCallback(async (maxLoadNumber) => {
    if (!metadata.hasMore) return;
    setLoadingMore(true);
    const rowsCount = metadata.row_ids.length;
    const loadNumber = rowsCount % MAX_LOAD_NUMBER !== 0 ? MAX_LOAD_NUMBER - rowsCount % MAX_LOAD_NUMBER : MAX_LOAD_NUMBER;
    try {
      await store.loadMore(loadNumber);
      setLoadingMore(false);
    } catch (error) {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setLoadingMore(false);
      return;
    }
    if (store.data.hasMore && store.data.row_ids.length < maxLoadNumber) {
      loadAll(maxLoadNumber);
    } else {
      setLoadingMore(false);
    }
  }, [metadata, store]);

  const recordGetterById = useCallback((recordId) => {
    return metadata?.id_row_map?.[recordId];
  }, [metadata]);

  const recordGetter = useCallback((recordIndex) => {
    const recordId = metadata.view.rows[recordIndex];
    return recordId && recordGetterById(recordId);
  }, [metadata, recordGetterById]);

  const recordGetterByIndex = useCallback(({ recordIndex }) => {
    return recordGetter(recordIndex);
  }, [recordGetter]);

  // Filter visible columns (same logic as original TableMain)
  const visibleColumns = useMemo(() => {
    if (!metadata?.view) return [];
    const { columns, hidden_columns } = metadata.view;
    return columns.filter(column =>
      !globalHiddenColumns.includes(column.key) &&
      !hidden_columns.includes(column.key) &&
      !TABLE_NOT_DISPLAY_COLUMN_KEYS.includes(column.key)
    );
  }, [metadata, globalHiddenColumns]);

  // Create GridUtils adapter using metadata's GridUtils
  const gridUtilsAdapter = useMetadataTableAdapter({
    repoID,
    metadata,
    readOnly: !permission.canModify(),
    enableFaceRecognition, enableTags,
    modifyRecord,
    modifyRecords,
    recordGetterByIndex,
    recordGetterById,
    modifyColumnData,
    updateFileTags,
    deleteRecords,
    updateRecordDetails,
    updateFaceRecognition,
    updateRecordDescription,
    onOCR,
    generateFileTags,
    tagsData,
  });

  // Paste callback - delegates to gridUtilsAdapter.paste()
  const paste = useCallback(({ type, copied, multiplePaste, pasteRange, isGroupView, pasteSource, cutPosition, columns }) => {
    const { search } = window.location;
    const urlParams = new URLSearchParams(search);
    const viewId = urlParams.has('view') ? urlParams.get('view') : null;
    gridUtilsAdapter.paste({
      type,
      copied,
      multiplePaste,
      pasteRange,
      isGroupView,
      columns: visibleColumns,
      pasteSource,
      cutPosition,
      viewId,
      canModifyRow: permission.canModifyRow,
      canModifyColumn: permission.canModifyColumn,
    });
  }, [gridUtilsAdapter, visibleColumns, permission]);

  const sfTableColumns = useMemo(() => {
    return adaptMetadataColumnsToSfTable(repoID, visibleColumns);
  }, [repoID, visibleColumns]);

  // SFTable uses 'recordsIds' instead of metadata.view.rows
  const recordsIds = metadata?.view?.rows || [];
  const groupbys = metadata?.view?.groupbys || [];
  const groups = metadata?.view?.groups || [];

  const table = useMemo(() => ({
    ...metadata,
    columns: sfTableColumns
  }), [metadata, sfTableColumns]);

  return (
    <>
      <SFTable
        {...permission}
        repoID={repoID}
        table={table}
        visibleColumns={sfTableColumns}
        recordsIds={recordsIds}
        headerSettings={{}}
        groupbys={groupbys}
        groups={groups}
        isGroupView={isGroupView}
        isLoadingMore={isLoadingMore}
        isLoading={isLoading}
        hasMoreRecords={metadata?.hasMore || false}
        loadMore={loadMore}
        loadAll={loadAll}
        gridUtils={gridUtilsAdapter}
        recordGetterById={recordGetterById}
        recordGetterByIndex={recordGetterByIndex}
        onGridKeyDown={onHotKey}
        onGridKeyUp={onHotKeyUp}
        handleSelectCellsDelete={handleSelectCellsDelete}
        updateFileTags={updateFileTags}
        updateSelectedRecordIds={updateSelectedRecordIds}
        supportCopy={true}
        supportPaste={true}
        paste={paste}
        supportDragFill={true}
        supportCut={true}
        // Metadata-specific header dropdown menu component
        columnDropdownMenu={HeaderDropdownMenu}
        // Metadata-specific props passed via customProps to HeaderDropdownMenu
        view={metadata?.view}
        modifyRecord={modifyRecord}
        modifyRecords={modifyRecords}
        deleteRecords={deleteRecords}
        modifyColumnData={modifyColumnData}
        modifyColumnWidth={modifyColumnWidth}
        modifyColumnOrder={modifyColumnOrder}
        insertColumn={insertColumn}
        renameColumn={renameColumn}
        deleteColumn={deleteColumn}
        generateFileTags={generateFileTags}
        updateRecordDetails={updateRecordDetails}
        updateFaceRecognition={updateFaceRecognition}
        updateRecordDescription={updateRecordDescription}
        onOCR={onOCR}
        // Pass tagsData to SFTable for Cell formatter to render tags
        tagsData={tagsData}
        // Use SFTable's context menu with metadata's options
        createContextMenuOptions={gridUtilsAdapter.createContextMenuOptions}
        // Expanded props dialog for actions cell
        onShowExpandedPropsDialog={onShowExpandedPropsDialog}
      />
      {expandedRecordId && (
        <ExpandedPropertiesDialog
          metadata={metadata}
          modifyRecord={modifyRecord}
          modifyColumnData={modifyColumnData}
          updateFileTags={updateFileTags}
          recordId={expandedRecordId}
          columns={visibleColumns}
          toggle={toggleExpandedPropsDialog}
        />
      )}
    </>
  );
};

export default Table;
