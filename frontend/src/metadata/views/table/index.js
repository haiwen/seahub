import React, { useCallback, useMemo, useRef, useState } from 'react';
import { toKeyCode } from 'is-hotkey';
import toaster from '../../../components/toast';
import TableMain from './table-main';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils, validateName } from '../../../utils/utils';
import { isModZ, isModShiftZ } from '../../utils/hotkey';
import { gettext } from '../../../utils/constants';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../utils/cell';
import { getValidGroupbys } from '../../utils/group';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER, MAX_LOAD_NUMBER, PRIVATE_COLUMN_KEY } from '../../constants';

import './index.css';

const Table = () => {
  const [isLoadingMore, setLoadingMore] = useState(false);
  const { isLoading, metadata, store, renameFileCallback, deleteFilesCallback, moveItem } = useMetadataView();
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

  const recordGetterById = useCallback((recordId) => {
    return metadata.id_row_map[recordId];
  }, [metadata]);

  const recordGetter = useCallback((recordIndex) => {
    const recordId = metadata.view.rows[recordIndex];
    return recordId && recordGetterById(recordId);
  }, [metadata, recordGetterById]);

  const modifyRecords = useCallback((rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, isCopyPaste = false) => {
    const isRename = store.checkIsRenameFileOperator(rowIds, idOriginalRowUpdates);
    let newName = null;
    if (isRename) {
      const rowId = rowIds[0];
      const row = recordGetterById(rowId);
      const rowUpdates = idOriginalRowUpdates[rowId];
      const { _parent_dir, _name } = row;
      newName = getFileNameFromRecord(rowUpdates);
      const { isValid, errMessage } = validateName(newName);
      if (!isValid) {
        toaster.danger(errMessage);
        return;
      }
      if (newName === _name) {
        return;
      }
      if (store.checkDuplicatedName(newName, _parent_dir)) {
        let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
        errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
        toaster.danger(errMessage);
        return;
      }
    }
    store.modifyRecords(rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, isCopyPaste, isRename, {
      fail_callback: (error) => {
        error && toaster.danger(error);
      },
      success_callback: (operation) => {
        if (operation.is_rename) {
          const rowId = operation.row_ids[0];
          const row = recordGetterById(rowId);
          const rowUpdates = operation.id_original_row_updates[rowId];
          const oldRow = operation.id_original_old_row_data[rowId];
          const parentDir = getParentDirFromRecord(row);
          const oldName = getFileNameFromRecord(oldRow);
          const path = Utils.joinPath(parentDir, oldName);
          const newName = getFileNameFromRecord(rowUpdates);
          renameFileCallback(path, newName);
        }
      },
    });
  }, [store, recordGetterById, renameFileCallback]);

  const deleteRecords = (recordsIds) => {
    let paths = [];
    let fileNames = [];
    recordsIds.forEach((recordId) => {
      const record = recordGetterById(recordId);
      const { _parent_dir, _name } = record || {};
      if (_parent_dir && _name) {
        const path = Utils.joinPath(_parent_dir, _name);
        paths.push(path);
        fileNames.push(_name);
      }
    });
    store.deleteRecords(recordsIds, {
      fail_callback: (error) => {
        toaster.danger(error);
      },
      success_callback: () => {
        deleteFilesCallback(paths, fileNames);
        let msg = fileNames.length > 1
          ? gettext('Successfully deleted {name} and {n} other items')
          : gettext('Successfully deleted {name}');
        msg = msg.replace('{name}', fileNames[0])
          .replace('{n}', fileNames.length - 1);
        toaster.success(msg);
      },
    });
  };

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

  const modifyColumnData = useCallback((columnKey, newData, oldData, { optionModifyType } = {}) => {
    store.modifyColumnData(columnKey, newData, oldData, { optionModifyType });
  }, [store]);

  const modifyColumnWidth = useCallback((columnKey, newWidth) => {
    store.modifyColumnWidth(columnKey, newWidth);
  }, [store]);

  const modifyColumnOrder = useCallback((sourceColumnKey, targetColumnKey) => {
    store.modifyColumnOrder(sourceColumnKey, targetColumnKey);
  }, [store]);

  const updateFileTags = useCallback((data) => {
    store.updateFileTags(data);
  }, [store]);

  const insertColumn = useCallback((name, type, { key, data }) => {
    store.insertColumn(name, type, { key, data });
  }, [store]);

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

  const handleMoveItem = useCallback((destRepo, dirent, destPath, nodePath, isByDialog, recordID) => {
    const currrentRepoID = window.sfMetadataStore.repoId;
    const record = recordGetterById(recordID);
    const parentDir = getParentDirFromRecord(record);
    const updates = { [PRIVATE_COLUMN_KEY.PARENT_DIR]: destPath };
    const oldRowData = { [PRIVATE_COLUMN_KEY.PARENT_DIR]: parentDir };
    const originalUpdates = { [PRIVATE_COLUMN_KEY.PARENT_DIR]: destPath };
    const originalOldRowData = { [PRIVATE_COLUMN_KEY.PARENT_DIR]: parentDir };

    const handleSuccess = () => moveItem(destRepo, dirent, destPath, nodePath, isByDialog);
    const handleError = (error) => error && toaster.danger(error);

    if (currrentRepoID === destRepo.repo_id) {
      store.modifyRecords(
        [recordID],
        { [recordID]: updates },
        { [recordID]: originalUpdates },
        { [recordID]: oldRowData },
        { [recordID]: originalOldRowData },
        false,
        false,
        { fail_callback: handleError, success_callback: handleSuccess }
      );
    } else {
      store.deleteLocalRecords([recordID], { fail_callback: handleError, success_callback: () => {} });
      handleSuccess();
    }
  }, [store, recordGetterById, moveItem]);

  return (
    <div className="sf-metadata-container" ref={containerRef}>
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
        onGridKeyDown={onHotKey}
        onGridKeyUp={onHotKeyUp}
        moveItem={handleMoveItem}
      />
    </div>
  );
};

export default Table;
