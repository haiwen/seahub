/* eslint-disable react/prop-types */
import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import toaster from '../../components/toast';
import Context from '../context';
import Store from '../store';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER } from '../constants';
import { Utils, validateName } from '../../utils/utils';
import { useMetadata } from './metadata';
import { useCollaborators } from './collaborators';
import { getRowById } from '../utils/table';
import { getFileNameFromRecord, getParentDirFromRecord } from '../utils/cell';
import { gettext } from '../../utils/constants';

const MetadataViewContext = React.createContext(null);

export const MetadataViewProvider = ({
  children,
  repoID,
  viewID,
  renameFileCallback,
  deleteFilesCallback,
  ...params
}) => {
  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ rows: [], columns: [], view: {} });
  const [errorMessage, setErrorMessage] = useState(null);
  const storeRef = useRef(null);
  const { collaborators } = useCollaborators();
  const { isBeingBuilt, setIsBeingBuilt } = useMetadata();

  const tableChanged = useCallback(() => {
    setMetadata(storeRef.current.data);
  }, []);

  const handleTableError = useCallback((error) => {
    toaster.danger(error.error);
  }, []);

  const updateMetadata = useCallback((data) => {
    setMetadata(data);
  }, []);

  const reloadMetadata = useCallback(() => {
    setLoading(true);
    storeRef.current.reload(PER_LOAD_NUMBER).then(() => {
      setMetadata(storeRef.current.data);
      setLoading(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      setErrorMessage(errorMsg);
      setLoading(false);
    });
  }, []);

  const modifyFilters = useCallback((filters, filterConjunction, basicFilters) => {
    storeRef.current.modifyFilters(filterConjunction, filters, basicFilters);
  }, [storeRef]);

  const modifySorts = useCallback((sorts, displaySorts = false) => {
    storeRef.current.modifySorts(sorts, displaySorts);
  }, [storeRef]);

  const modifyGroupbys = useCallback((groupbys) => {
    storeRef.current.modifyGroupbys(groupbys);
  }, [storeRef]);

  const modifyHiddenColumns = useCallback((hiddenColumns) => {
    storeRef.current.modifyHiddenColumns(hiddenColumns);
  }, [storeRef]);

  const modifySettings = useCallback((settings) => {
    storeRef.current.modifySettings(settings);
  }, [storeRef]);

  const updateLocalRecord = useCallback((recordId, update) => {
    storeRef.current.modifyLocalRecord(recordId, update);
  }, [storeRef]);

  const modifyRecords = (rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, isCopyPaste = false, { success_callback, fail_callback } = {}) => {
    const isRename = storeRef.current.checkIsRenameFileOperator(rowIds, idOriginalRowUpdates);
    let newName = null;
    if (isRename) {
      const rowId = rowIds[0];
      const row = getRowById(metadata, rowId);
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
      if (storeRef.current.checkDuplicatedName(newName, _parent_dir)) {
        let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
        errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
        toaster.danger(errMessage);
        return;
      }
    }
    storeRef.current.modifyRecords(rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, isCopyPaste, isRename, {
      fail_callback: (error) => {
        fail_callback && fail_callback(error);
        error && toaster.danger(error);
      },
      success_callback: (operation) => {
        if (operation.is_rename) {
          const rowId = operation.row_ids[0];
          const row = getRowById(metadata, rowId);
          const rowUpdates = operation.id_original_row_updates[rowId];
          const oldRow = operation.id_original_old_row_data[rowId];
          const parentDir = getParentDirFromRecord(row);
          const oldName = getFileNameFromRecord(oldRow);
          const path = Utils.joinPath(parentDir, oldName);
          const newName = getFileNameFromRecord(rowUpdates);
          renameFileCallback(path, newName);
        }
        success_callback && success_callback();
      },
    });
  };

  const deleteRecords = (recordsIds, { success_callback, fail_callback } = {}) => {
    if (!Array.isArray(recordsIds) || recordsIds.length === 0) return;
    let paths = [];
    let fileNames = [];
    recordsIds.forEach((recordId) => {
      const record = getRowById(metadata, recordId);
      const { _parent_dir, _name } = record || {};
      if (_parent_dir && _name) {
        const path = Utils.joinPath(_parent_dir, _name);
        paths.push(path);
        fileNames.push(_name);
      }
    });
    storeRef.current.deleteRecords(recordsIds, {
      fail_callback: (error) => {
        fail_callback && fail_callback(error);
        error && toaster.danger(error);
      },
      success_callback: () => {
        deleteFilesCallback(paths, fileNames);
        let msg = fileNames.length > 1
          ? gettext('Successfully deleted {name} and {n} other items')
          : gettext('Successfully deleted {name}');
        msg = msg.replace('{name}', fileNames[0])
          .replace('{n}', fileNames.length - 1);
        toaster.success(msg);
        success_callback && success_callback();
      },
    });
  };

  const modifyRecord = (rowId, updates, oldRowData, originalUpdates, originalOldRowData, isCopyPaste, { success_callback, fail_callback } = {}) => {
    const rowIds = [rowId];
    const idRowUpdates = { [rowId]: updates };
    const idOriginalRowUpdates = { [rowId]: originalUpdates };
    const idOldRowData = { [rowId]: oldRowData };
    const idOriginalOldRowData = { [rowId]: originalOldRowData };
    modifyRecords(rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, isCopyPaste, { success_callback, fail_callback });
  };

  const renameColumn = useCallback((columnKey, newName, oldName) => {
    storeRef.current.renameColumn(columnKey, newName, oldName);
  }, [storeRef]);

  const deleteColumn = useCallback((columnKey, oldColumn) => {
    storeRef.current.deleteColumn(columnKey, oldColumn);
  }, [storeRef]);

  const modifyColumnData = useCallback((columnKey, newData, oldData, { optionModifyType } = {}) => {
    storeRef.current.modifyColumnData(columnKey, newData, oldData, { optionModifyType });
  }, [storeRef]);

  const modifyColumnWidth = useCallback((columnKey, newWidth) => {
    storeRef.current.modifyColumnWidth(columnKey, newWidth);
  }, [storeRef]);

  const modifyColumnOrder = useCallback((sourceColumnKey, targetColumnKey) => {
    storeRef.current.modifyColumnOrder(sourceColumnKey, targetColumnKey);
  }, [storeRef]);

  const insertColumn = useCallback((name, type, { key, data }) => {
    storeRef.current.insertColumn(name, type, { key, data });
  }, [storeRef]);

  const updateFileTags = useCallback((data) => {
    storeRef.current.updateFileTags(data);
  }, [storeRef]);

  // init
  useEffect(() => {
    setLoading(true);
    // init context
    const context = new Context();
    window.sfMetadataContext = context;
    window.sfMetadataContext.init({ ...params, repoID, viewID });
    storeRef.current = new Store({ context: window.sfMetadataContext, repoId: repoID, viewId: viewID, collaborators });
    window.sfMetadataStore = storeRef.current;
    storeRef.current.initStartIndex();
    storeRef.current.load(PER_LOAD_NUMBER, isBeingBuilt).then(() => {
      setMetadata(storeRef.current.data);
      setIsBeingBuilt(false);
      setLoading(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
    const eventBus = window.sfMetadataContext.eventBus;
    const unsubscribeServerTableChanged = eventBus.subscribe(EVENT_BUS_TYPE.SERVER_TABLE_CHANGED, tableChanged);
    const unsubscribeTableChanged = eventBus.subscribe(EVENT_BUS_TYPE.LOCAL_TABLE_CHANGED, tableChanged);
    const unsubscribeHandleTableError = eventBus.subscribe(EVENT_BUS_TYPE.TABLE_ERROR, handleTableError);
    const unsubscribeUpdateRows = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_TABLE_ROWS, updateMetadata);
    const unsubscribeReloadData = eventBus.subscribe(EVENT_BUS_TYPE.RELOAD_DATA, reloadMetadata);
    const unsubscribeModifyFilters = eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_FILTERS, modifyFilters);
    const unsubscribeModifySorts = eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_SORTS, modifySorts);
    const unsubscribeModifyGroupbys = eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_GROUPBYS, modifyGroupbys);
    const unsubscribeModifyHiddenColumns = eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_HIDDEN_COLUMNS, modifyHiddenColumns);
    const unsubscribeModifyColumnOrder = eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_COLUMN_ORDER, modifyColumnOrder);
    const unsubscribeModifySettings = eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_SETTINGS, modifySettings);
    const unsubscribeLocalRecordChanged = eventBus.subscribe(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, updateLocalRecord);

    return () => {
      if (window.sfMetadataContext) {
        window.sfMetadataContext.destroy();
      }
      window.sfMetadataStore.destroy();
      unsubscribeServerTableChanged();
      unsubscribeTableChanged();
      unsubscribeHandleTableError();
      unsubscribeUpdateRows();
      unsubscribeReloadData();
      unsubscribeModifyFilters();
      unsubscribeModifySorts();
      unsubscribeModifyGroupbys();
      unsubscribeModifyHiddenColumns();
      unsubscribeModifyColumnOrder();
      unsubscribeModifySettings();
      unsubscribeLocalRecordChanged();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, viewID]);

  return (
    <MetadataViewContext.Provider
      value={{
        isLoading,
        isBeingBuilt,
        errorMessage,
        metadata,
        store: storeRef.current,
        isDirentDetailShow: params.isDirentDetailShow,
        updateCurrentDirent: params.updateCurrentDirent,
        closeDirentDetail: params.closeDirentDetail,
        showDirentDetail: params.showDirentDetail,
        deleteFilesCallback: deleteFilesCallback,
        renameFileCallback: renameFileCallback,
        modifySettings,
        modifyRecords,
        deleteRecords,
        modifyRecord,
        renameColumn,
        deleteColumn,
        modifyColumnOrder,
        modifyColumnData,
        modifyColumnWidth,
        insertColumn,
        updateFileTags,
      }}
    >
      {children}
    </MetadataViewContext.Provider>
  );
};

export const useMetadataView = () => {
  const context = useContext(MetadataViewContext);
  if (!context) {
    throw new Error('\'MetadataContext\' is null');
  }
  return context;
};
