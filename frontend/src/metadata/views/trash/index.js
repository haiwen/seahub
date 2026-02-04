import React, { useCallback, useMemo, useRef, useState } from 'react';
import { toKeyCode } from 'is-hotkey';
import toaster from '../../../components/toast';
import TableMain from './table-main';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { isModZ, isModShiftZ } from '../../../utils/hotkey';
import { getValidGroupbys } from '../../utils/group';
import { EVENT_BUS_TYPE } from '../../constants';

import './index.css';

const Table = () => {
  const [isLoadingMore, setLoadingMore] = useState(false);
  const {
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
  const containerRef = useRef(null);

  const canModify = useMemo(() => window.sfMetadataContext.canModify(), []);

  const focusDataGrid = useCallback(() => {
    setTimeout(() => window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.FOCUS_CANVAS), 0);
  }, []);

  const onHotKey = useCallback((event) => {
    if (event.keyCode === toKeyCode('mod+shift')) return;
    if (event.target.className.includes('sf-metadata-editor-main')) return;

    const activeElement = document.activeElement;
    if (!containerRef.current.contains(activeElement)) return;

    if (isModZ(event)) {
      event.preventDefault();
      if (!canModify) return;
      store.undoOperation();
      focusDataGrid();
    } else if (isModShiftZ(event)) {
      event.preventDefault();
      if (!canModify) return;
      store.redoOperation();
      focusDataGrid();
    }
  }, [canModify, store, focusDataGrid]);

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
      // await store.loadMore(PER_LOAD_NUMBER);
      await store.loadMoreTrash(metadata.page + 1);
      setLoadingMore(false);
    } catch (error) {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setLoadingMore(false);
      return;
    }

  }, [metadata, store]);

  // const loadAll = useCallback(async (maxLoadNumber) => {
  const loadAll = useCallback(async () => {
    if (!metadata.hasMore) return;
    setLoadingMore(true);
    // const rowsCount = metadata.row_ids.length;
    // const loadNumber = rowsCount % MAX_LOAD_NUMBER !== 0 ? MAX_LOAD_NUMBER - rowsCount % MAX_LOAD_NUMBER : MAX_LOAD_NUMBER;
    try {
      // await store.loadMore(loadNumber);
      await store.loadMoreTrash(metadata.page + 1);
      setLoadingMore(false);
    } catch (error) {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setLoadingMore(false);
      return;
    }
    /*
    if (store.data.hasMore && store.data.row_ids.length < maxLoadNumber) {
      loadAll(maxLoadNumber);
    } else {
      setLoadingMore(false);
    }
    */
  }, [metadata, store]);

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

  return (
    <div className="sf-metadata-container sf-metadata-container-transform" ref={containerRef}>
      <TableMain
        isGroupView={isGroupView}
        isLoadingMore={isLoadingMore}
        loadMore={loadMore}
        metadata={metadata}
        modifyRecord={modifyRecord}
        modifyRecords={modifyRecords}
        deleteRecords={deleteRecords}
        recordGetterById={recordGetterById}
        recordGetterByIndex={recordGetterByIndex}
        getTableContentRect={getTableContentRect}
        getAdjacentRowsIds={getAdjacentRowsIds}
        loadAll={loadAll}
        insertColumn={insertColumn}
        renameColumn={renameColumn}
        deleteColumn={deleteColumn}
        modifyColumnData={modifyColumnData}
        modifyColumnWidth={modifyColumnWidth}
        modifyColumnOrder={modifyColumnOrder}
        updateFileTags={updateFileTags}
        generateFileTags={generateFileTags}
        onGridKeyDown={onHotKey}
        onGridKeyUp={onHotKeyUp}
        updateSelectedRecordIds={updateSelectedRecordIds}
        updateRecordDetails={updateRecordDetails}
        updateFaceRecognition={updateFaceRecognition}
        updateRecordDescription={updateRecordDescription}
        onOCR={onOCR}
      />
    </div>
  );
};

export default Table;
