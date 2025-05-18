/* eslint-disable react/prop-types */
import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import toaster from '../../components/toast';
import Context from '../context';
import Store from '../store';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER, PRIVATE_COLUMN_KEY } from '../constants';
import { Utils, validateName } from '../../utils/utils';
import { useMetadata } from './metadata';
import { useCollaborators } from './collaborators';
import { getRowById } from '../../components/sf-table/utils/table';
import { getFileNameFromRecord, getFileObjIdFromRecord, getParentDirFromRecord, getRecordIdFromRecord, getUniqueFileName } from '../utils/cell';
import { gettext } from '../../utils/constants';
import { checkIsDir } from '../utils/row';
import { useTags } from '../../tag/hooks';
import { useMetadataAIOperations } from '../../hooks/metadata-ai-operation';
import { getColumnByKey } from '../utils/column';

const MetadataViewContext = React.createContext(null);

export const MetadataViewProvider = ({
  children,
  repoID,
  viewID,
  renameFileCallback,
  deleteFilesCallback,
  moveFileCallback,
  copyFileCallback,
  toggleShowDirentToolbar,
  ...params
}) => {
  const { modifyLocalFileTags } = useTags();
  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ rows: [], columns: [], view: {} });
  const [errorMessage, setErrorMessage] = useState(null);

  const storeRef = useRef(null);
  const delayReloadDataTimer = useRef(null);

  const { collaborators } = useCollaborators();
  const { isBeingBuilt, setIsBeingBuilt } = useMetadata();
  const { onOCR, generateDescription, extractFilesDetails, faceRecognition } = useMetadataAIOperations();

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
      delayReloadDataTimer.current = null;
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      setErrorMessage(errorMsg);
      setLoading(false);
    });
  }, []);

  const delayReloadMetadata = useCallback(() => {
    delayReloadDataTimer.current && clearTimeout(delayReloadDataTimer.current);
    delayReloadDataTimer.current = setTimeout(() => {
      reloadMetadata();
    }, 600);
  }, [reloadMetadata]);

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

  const updateLocalRecord = useCallback(({ recordId, parentDir, fileName }, update) => {
    storeRef.current.modifyLocalRecord({ record_id: recordId, parent_dir: parentDir, file_name: fileName }, update);
  }, [storeRef]);

  const updateLocalColumnData = useCallback((columnKey, newData, oldData) => {
    storeRef.current.modifyLocalColumnData(columnKey, newData, oldData);
  }, []);

  const modifyRecords = useCallback((rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, isCopyPaste = false, { success_callback, fail_callback } = {}) => {
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
  }, [metadata, storeRef, renameFileCallback]);

  const deleteRecords = (recordsIds, { success_callback, fail_callback } = {}) => {
    if (!Array.isArray(recordsIds) || recordsIds.length === 0) return;
    let paths = [];
    let fileNames = [];
    const table = storeRef.current?.data || metadata;
    recordsIds.forEach((recordId) => {
      const record = getRowById(table, recordId);
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

  const moveRecord = (rowId, targetRepo, dirent, targetParentPath, sourceParentPath, isByDialog) => {
    const targetRepoId = targetRepo.repo_id;
    const row = getRowById(metadata, rowId);
    const { rows } = metadata;
    const isDir = checkIsDir(row);
    const oldName = dirent.name;
    const oldParentPath = Utils.joinPath(sourceParentPath, oldName);

    let needDeletedRowIds = [];
    let updateRowIds = [];
    let idRowUpdates = {};
    let idOldRowData = {};

    if (repoID === targetRepoId) {
      const newName = getUniqueFileName(rows, targetParentPath, oldName);
      updateRowIds.push(rowId);
      idRowUpdates[rowId] = { [PRIVATE_COLUMN_KEY.PARENT_DIR]: targetParentPath, [PRIVATE_COLUMN_KEY.FILE_NAME]: newName };
      idOldRowData[rowId] = { [PRIVATE_COLUMN_KEY.PARENT_DIR]: sourceParentPath, [PRIVATE_COLUMN_KEY.FILE_NAME]: oldName };
      if (isDir) {
        const newPath = Utils.joinPath(targetParentPath, newName);
        rows.forEach((row) => {
          const parentDir = getParentDirFromRecord(row);
          if (row && parentDir.startsWith(oldParentPath)) {
            const updateRowId = getRecordIdFromRecord(row);
            updateRowIds.push(updateRowId);
            idRowUpdates[updateRowId] = { [PRIVATE_COLUMN_KEY.PARENT_DIR]: parentDir.replace(oldParentPath, newPath) };
            idOldRowData[updateRowId] = { [PRIVATE_COLUMN_KEY.PARENT_DIR]: parentDir };
          }
        });
      }
    } else {
      needDeletedRowIds = [rowId];
      if (isDir) {
        rows.forEach((row) => {
          const parentDir = getParentDirFromRecord(row);
          if (row && parentDir.startsWith(oldParentPath)) {
            const id = getRecordIdFromRecord(row);
            needDeletedRowIds.push(id);
          }
        });
      }
    }

    storeRef.current.moveRecord(rowId, targetRepoId, dirent, targetParentPath, sourceParentPath, {
      modify_row_ids: updateRowIds,
      modify_id_row_updates: idRowUpdates,
      modify_id_old_row_data: idOldRowData,
      delete_row_ids: needDeletedRowIds,
    }, {
      success_callback: (operation) => {
        moveFileCallback && moveFileCallback(repoID, targetRepo, dirent, targetParentPath, sourceParentPath, operation.task_id, isByDialog);
      },
      fail_callback: (error) => {
        error && toaster.danger(error);
      }
    });
  };

  const duplicateRecord = (rowId, targetRepo, dirent, targetPath, nodeParentPath, isByDialog) => {
    storeRef.current.duplicateRecord(rowId, targetRepo.repo_id, dirent, targetPath, nodeParentPath, {
      success_callback: (operation) => {
        copyFileCallback && copyFileCallback(repoID, targetRepo, dirent, targetPath, nodeParentPath, operation.task_id, isByDialog);
        if (repoID === targetRepo.repo_id) {
          delayReloadMetadata();
        }
      },
      fail_callback: (error) => {
        error && toaster.danger(error);
      }
    });
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
    const { record_id, tags } = data[0];
    modifyLocalFileTags(record_id, tags);
    storeRef.current.updateFileTags(data);
  }, [storeRef, modifyLocalFileTags]);

  const updateSelectedRecordIds = useCallback((ids) => {
    toggleShowDirentToolbar(ids.length > 0);
    setTimeout(() => {
      window.sfMetadataContext && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_RECORDS, ids, metadata);
    }, 0);
  }, [metadata, toggleShowDirentToolbar]);

  const updateRecordDetails = useCallback((records) => {
    const recordObjIds = records.map(record => getFileObjIdFromRecord(record));
    if (recordObjIds.length > 50) {
      toaster.danger(gettext('Select up to 50 files'));
      return;
    }

    const recordIds = records.map(record => getRecordIdFromRecord(record));
    extractFilesDetails(recordObjIds, {
      success_callback: ({ details }) => {
        let idOldRecordData = {};
        let idOriginalOldRecordData = {};
        let idRecordUpdates = {};
        let idOriginalRecordUpdates = {};
        const captureColumnKey = PRIVATE_COLUMN_KEY.CAPTURE_TIME;
        const captureColumn = getColumnByKey(metadata.columns, PRIVATE_COLUMN_KEY.CAPTURE_TIME);
        const locationColumnKey = PRIVATE_COLUMN_KEY.LOCATION;
        const locationColumn = getColumnByKey(metadata.columns, PRIVATE_COLUMN_KEY.LOCATION);
        records.forEach(record => {
          const recordId = record[PRIVATE_COLUMN_KEY.ID];
          idOldRecordData[recordId] = {};
          idOriginalOldRecordData[recordId] = {};

          if (captureColumn) {
            idOldRecordData[recordId][captureColumnKey] = record[captureColumnKey];
            idOriginalOldRecordData[recordId][captureColumnKey] = record[captureColumnKey];
          }

          if (locationColumn) {
            idOldRecordData[recordId][locationColumnKey] = record[locationColumnKey];
            idOriginalOldRecordData[recordId][locationColumnKey] = record[locationColumnKey];
          }
        });
        details.forEach(detail => {
          const updateRecordId = detail[PRIVATE_COLUMN_KEY.ID];
          idRecordUpdates[updateRecordId] = {};
          idOriginalRecordUpdates[updateRecordId] = {};

          if (captureColumn) {
            idRecordUpdates[updateRecordId][captureColumnKey] = detail[captureColumnKey];
            idOriginalRecordUpdates[updateRecordId][captureColumnKey] = detail[captureColumnKey];
          }

          if (locationColumn) {
            idRecordUpdates[updateRecordId][locationColumnKey] = detail[locationColumnKey];
            idOriginalRecordUpdates[updateRecordId][locationColumnKey] = detail[locationColumnKey];
          }
        });
        modifyRecords(recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData);
      }
    });
  }, [metadata, extractFilesDetails, modifyRecords]);

  const updateFaceRecognition = useCallback((records) => {
    const recordObjIds = records.map(record => getFileObjIdFromRecord(record));
    if (recordObjIds.length > 50) {
      toaster.danger(gettext('Select up to 50 files'));
      return;
    }
    faceRecognition(recordObjIds);
  }, [faceRecognition]);

  const updateRecordDescription = useCallback((record) => {
    const parentDir = getParentDirFromRecord(record);
    const fileName = getFileNameFromRecord(record);
    if (!fileName || !parentDir) return;
    const checkIsDescribableFile = Utils.isDescriptionSupportedFile(fileName);
    if (!checkIsDescribableFile) return;

    const descriptionColumnKey = PRIVATE_COLUMN_KEY.FILE_DESCRIPTION;
    let idOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [descriptionColumnKey]: record[descriptionColumnKey] } };
    let idOriginalOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [descriptionColumnKey]: record[descriptionColumnKey] } };
    generateDescription({ parentDir, fileName }, {
      success_callback: ({ description }) => {
        const updateRecordId = record[PRIVATE_COLUMN_KEY.ID];
        const recordIds = [updateRecordId];
        let idRecordUpdates = {};
        let idOriginalRecordUpdates = {};
        idRecordUpdates[updateRecordId] = { [descriptionColumnKey]: description };
        idOriginalRecordUpdates[updateRecordId] = { [descriptionColumnKey]: description };
        modifyRecords(recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData);
      }
    });
  }, [modifyRecords, generateDescription]);

  const ocr = useCallback((record) => {
    const parentDir = getParentDirFromRecord(record);
    const fileName = getFileNameFromRecord(record);
    if (!Utils.imageCheck(fileName)) return;

    const ocrResultColumnKey = PRIVATE_COLUMN_KEY.OCR;
    let idOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [ocrResultColumnKey]: record[ocrResultColumnKey] } };
    let idOriginalOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [ocrResultColumnKey]: record[ocrResultColumnKey] } };
    onOCR({ parentDir, fileName }, {
      success_callback: ({ ocrResult }) => {
        if (!ocrResult) return;
        const updateRecordId = record[PRIVATE_COLUMN_KEY.ID];
        const recordIds = [updateRecordId];
        let idRecordUpdates = {};
        let idOriginalRecordUpdates = {};
        idRecordUpdates[updateRecordId] = { [ocrResultColumnKey]: ocrResult ? JSON.stringify(ocrResult) : null };
        idOriginalRecordUpdates[updateRecordId] = { [ocrResultColumnKey]: ocrResult ? JSON.stringify(ocrResult) : null };
        modifyRecords(recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData);
      },
    });
  }, [modifyRecords, onOCR]);

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
    const unsubscribeLocalColumnChanged = eventBus.subscribe(EVENT_BUS_TYPE.LOCAL_COLUMN_DATA_CHANGED, updateLocalColumnData);
    const unsubscribeUpdateSelectedRecordIds = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_SELECTED_RECORD_IDS, updateSelectedRecordIds);
    const unsubscribeMoveRecord = eventBus.subscribe(EVENT_BUS_TYPE.MOVE_RECORD, moveRecord);
    const unsubscribeDeleteRecords = eventBus.subscribe(EVENT_BUS_TYPE.DELETE_RECORDS, deleteRecords);
    const unsubscribeUpdateDetails = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_RECORD_DETAILS, updateRecordDetails);
    const unsubscribeUpdateFaceRecognition = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_FACE_RECOGNITION, updateFaceRecognition);
    const unsubscribeUpdateDescription = eventBus.subscribe(EVENT_BUS_TYPE.GENERATE_DESCRIPTION, updateRecordDescription);
    const unsubscribeOCR = eventBus.subscribe(EVENT_BUS_TYPE.OCR, ocr);

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
      unsubscribeLocalColumnChanged();
      unsubscribeUpdateSelectedRecordIds();
      unsubscribeMoveRecord();
      unsubscribeDeleteRecords();
      unsubscribeUpdateDetails();
      unsubscribeUpdateFaceRecognition();
      unsubscribeUpdateDescription();
      unsubscribeOCR();
      delayReloadDataTimer.current && clearTimeout(delayReloadDataTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, viewID]);

  return (
    <MetadataViewContext.Provider
      value={{
        isLoading,
        repoID,
        viewID,
        isBeingBuilt,
        errorMessage,
        metadata,
        store: storeRef.current,
        isDirentDetailShow: params.isDirentDetailShow,
        updateCurrentDirent: params.updateCurrentDirent,
        showDirentDetail: params.showDirentDetail,
        deleteFilesCallback: deleteFilesCallback,
        renameFileCallback: renameFileCallback,
        modifySettings,
        modifyRecords,
        deleteRecords,
        modifyRecord,
        moveRecord,
        duplicateRecord,
        renameColumn,
        deleteColumn,
        modifyColumnOrder,
        modifyColumnData,
        modifyColumnWidth,
        insertColumn,
        updateFileTags,
        addFolder: params.addFolder,
        updateCurrentPath: params.updateCurrentPath,
        updateSelectedRecordIds,
        updateRecordDetails,
        updateFaceRecognition,
        updateRecordDescription,
        ocr,
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
