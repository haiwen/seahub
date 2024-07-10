import React, { useCallback, useEffect, useRef, useState } from 'react';
import toaster from '../../../../components/toast';
import { EVENT_BUS_TYPE } from '../../constants';
import { CommonlyUsedHotkey } from '../../_basic';
import { gettext } from '../../utils';
import { useMetadata } from '../../hooks';
import TableMain from  './table-main';
import RecordDetailsDialog from '../record-details-dialog';
import { PER_LOAD_NUMBER, MAX_LOAD_NUMBER } from '../../constants';
import { Utils } from '../../../../utils/utils';

import './index.css';

const Container = () => {
  const [isLoadingMore, setLoadingMore] = useState(false);
  const { metadata, errorMsg, store } = useMetadata();
  const containerRef = useRef(null);

  const onKeyDown = useCallback((event) => {
    if (event.target.className.includes('editor-main')) return;
    if (CommonlyUsedHotkey.isModF(event)) {
      event.preventDefault();
      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SEARCH_CELLS);
      return;
    }
  }, []);

  const isGroupView = useCallback(() => {
    // todo
    return false;
  }, []);

  const onSelectCell = useCallback(() => {
    // todo
  }, []);

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
    // todo: store op
  }, []);

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

  const modifyFilters = useCallback((filters, filterConjunction) => {
    store.modifyFilters(filterConjunction, filters);
  }, [store]);

  const modifySorts = useCallback((sorts) => {
    store.modifySorts(sorts);
  }, [store]);

  const modifyGroupbys = useCallback(() => {
    // modifyGroupbys
  }, []);

  const modifyHiddenColumns = useCallback(() => {
    // modifyHiddenColumns
  }, []);

  const recordGetterById = useCallback((recordId) => {
    return metadata.id_row_map[recordId];
  }, [metadata]);

  const recordGetter = useCallback((recordIndex) => {
    const recordId = metadata.view.rows[recordIndex];
    return recordId && recordGetterById(recordId);
  }, [metadata, recordGetterById]);

  const groupRecordGetter = useCallback((groupRecordIndex) => {
    if (!window.sfMetadataBody || !window.sfMetadataBody.getGroupRecordByIndex) {
      return null;
    }
    const groupRecord = window.sfMetadataBody.getGroupRecordByIndex(groupRecordIndex);
    const recordId = groupRecord.rowId;
    return recordId && recordGetterById(recordId);
  }, [recordGetterById]);

  const recordGetterByIndex = useCallback(({ isGroupView, groupRecordIndex, recordIndex }) => {
    if (isGroupView) groupRecordGetter(groupRecordIndex);
    return recordGetter(recordIndex);
  }, [groupRecordGetter, recordGetter]);

  const getTableContentRect = useCallback(() => {
    return containerRef?.current?.getBoundingClientRect() || { x: 0, right: window.innerWidth };
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    const unsubscribeSelectCell = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.SELECT_CELL, onSelectCell);
    const unsubscribeModifyFilters = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_FILTERS, modifyFilters);
    const unsubscribeModifySorts = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_SORTS, modifySorts);
    const unsubscribeModifyGroupbys = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_GROUPBYS, modifyGroupbys);
    const unsubscribeModifyHiddenColumns = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_HIDDEN_COLUMNS, modifyHiddenColumns);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unsubscribeSelectCell();
      unsubscribeModifyFilters();
      unsubscribeModifySorts();
      unsubscribeModifyGroupbys();
      unsubscribeModifyHiddenColumns();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="sf-metadata-wrapper">
        <div className="sf-metadata-main">
          {errorMsg && (<div className="d-center-middle error">{gettext(errorMsg)}</div>)}
          {!errorMsg && (
            <div className="sf-metadata-container" ref={containerRef}>
              <TableMain
                isGroupView={isGroupView()}
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
              />
            </div>
          )}
        </div>
      </div>
      <RecordDetailsDialog />
    </>
  );
};

export default Container;
