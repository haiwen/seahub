import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toaster from '../../../../../components/toast';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER, MAX_LOAD_NUMBER } from '../../../constants';
import { CommonlyUsedHotkey, getValidGroupbys } from '../../../_basic';
import { useMetadata } from '../../../hooks';
import TableMain from './table-main';
import { Utils } from '../../../../../utils/utils';

import './index.css';

const Table = () => {
  const [isLoadingMore, setLoadingMore] = useState(false);
  const { isLoading, metadata, store } = useMetadata();
  const containerRef = useRef(null);

  const onKeyDown = useCallback((event) => {
    if (event.target.className.includes('editor-main')) return;
    if (CommonlyUsedHotkey.isModF(event)) {
      event.preventDefault();
      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SEARCH_CELLS);
      return;
    }
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

  const loadAll = useCallback(async (maxLoadNumber, callback) => {
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
      loadAll(maxLoadNumber, callback);
    } else {
      typeof callback === 'function' && callback(store.data.hasMore);
      setLoadingMore(false);
    }
  }, [metadata, store]);

  const modifyRecords = useCallback((rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, isCopyPaste = false) => {
    store.modifyRecords(rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, isCopyPaste);
  }, [store]);

  const modifyRecord = useCallback((rowId, updates, oldRowData, originalUpdates, originalOldRowData) => {
    const rowIds = [rowId];
    const idRowUpdates = { [rowId]: updates };
    const idOriginalRowUpdates = { [rowId]: originalUpdates };
    const idOldRowData = { [rowId]: oldRowData };
    const idOriginalOldRowData = { [rowId]: originalOldRowData };
    modifyRecords(rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData);
  }, [modifyRecords]);

  const getAdjacentRowsIds = useCallback((rowIds) => {
    const rowIdsLen = metadata.row_ids.length;
    let rowIdsInOrder = [];
    let upperRowIds = [];
    let belowRowIds = [];
    let rowIdMap = {};
    rowIds.forEach(rowId => rowIdMap[rowId] = rowId);
    metadata.row_ids.forEach((rowId, index) => {
      if (!rowIdMap[rowId]) {
        return;
      }
      const upperRowId = index === 0 ? null : metadata.row_ids[index - 1];
      const belowRowId = index === rowIdsLen - 1 ? null : metadata.row_ids[index + 1];
      rowIdsInOrder.push(rowId);
      upperRowIds.push(upperRowId);
      belowRowIds.push(belowRowId);
    });
    return { rowIdsInOrder, upperRowIds, belowRowIds };
  }, [metadata]);

  const renameColumn = useCallback((columnKey, newName, oldName) => {
    store.renameColumn(columnKey, newName, oldName);
  }, [store]);

  const deleteColumn = useCallback((columnKey, oldColumn) => {
    store.deleteColumn(columnKey, oldColumn);
  }, [store]);

  const modifyColumnData = useCallback((columnKey, newData, oldData) => {
    store.modifyColumnData(columnKey, newData, oldData);
  }, [store]);

  const modifyColumnWidth = useCallback((columnKey, newWidth) => {
    store.modifyColumnWidth(columnKey, newWidth);
  }, [store]);

  const modifyColumnOrder = useCallback((sourceColumnKey, targetColumnKey) => {
    store.modifyColumnOrder(sourceColumnKey, targetColumnKey);
  }, [store]);

  const recordGetterById = useCallback((recordId) => {
    return metadata.id_row_map[recordId];
  }, [metadata]);

  const recordGetter = useCallback((recordIndex) => {
    const recordId = metadata.view.rows[recordIndex];
    return recordId && recordGetterById(recordId);
  }, [metadata, recordGetterById]);

  const groupRecordGetter = useCallback((groupRecordIndex) => {
    if (!window.sfMetadataBody || !window.sfMetadataBody.getGroupRecordByIndex) return null;
    const groupRecord = window.sfMetadataBody.getGroupRecordByIndex(groupRecordIndex);
    const recordId = groupRecord.rowId;
    return recordId && recordGetterById(recordId);
  }, [recordGetterById]);

  const recordGetterByIndex = useCallback(({ isGroupView, groupRecordIndex, recordIndex }) => {
    if (isGroupView) return groupRecordGetter(groupRecordIndex);
    return recordGetter(recordIndex);
  }, [groupRecordGetter, recordGetter]);

  const getTableContentRect = useCallback(() => {
    return containerRef?.current?.getBoundingClientRect() || { x: 0, right: window.innerWidth };
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sf-metadata-container" ref={containerRef}>
      <TableMain
        isGroupView={isGroupView}
        isLoadingMore={isLoadingMore}
        loadMore={loadMore}
        metadata={metadata}
        modifyRecord={modifyRecord}
        modifyRecords={modifyRecords}
        recordGetterById={recordGetterById}
        recordGetterByIndex={recordGetterByIndex}
        getTableContentRect={getTableContentRect}
        getAdjacentRowsIds={getAdjacentRowsIds}
        loadAll={loadAll}
        renameColumn={renameColumn}
        deleteColumn={deleteColumn}
        modifyColumnData={modifyColumnData}
        modifyColumnWidth={modifyColumnWidth}
        modifyColumnOrder={modifyColumnOrder}
      />
    </div>
  );
};

export default Table;
