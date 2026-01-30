/* eslint-disable react/prop-types */
import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Dirent } from '@/models';
import toaster from '../../components/toast';
import Context from '../context';
import Store from '../store';
import {
  CellType,
  EVENT_BUS_TYPE,
  PER_LOAD_NUMBER,
  PRIVATE_COLUMN_KEY,
  SUPPORT_SEARCH_COLUMN_LIST,
  TABLE_NOT_DISPLAY_COLUMN_KEYS,
  TRASH_VIEW_ID,
  shouldPreserveSearchForOperation
} from '../constants';
import { Utils, validateName } from '../../utils/utils';
import { useMetadata } from './metadata';
import { useCollaborators } from './collaborators';
import { getRowById } from '../../components/sf-table/utils/table';
import { getCellValueByColumn, getCollaboratorsName, getFileNameFromRecord, getFileObjIdFromRecord, getNumberDisplayString, getParentDirFromRecord, getRecordIdFromRecord, getUniqueFileName } from '../utils/cell';
import { gettext } from '../../utils/constants';
import { checkIsDir } from '../utils/row';
import { useTags } from '../../tag/hooks';
import { useFileOperations, useMetadataAIOperations, useMetadataStatus } from '../../hooks';
import { getColumnByKey } from '../utils/column';
import { getSearchRule } from '../../components/sf-table/utils/search';

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

  const [searchState, setSearchState] = useState({
    searchValue: '',
    searchResult: null,
    isActive: false,
    lastSearchMetadata: null // Store original metadata before search
  });

  const { collaborators, collaboratorsCache } = useCollaborators();
  const { isBeingBuilt, setIsBeingBuilt } = useMetadata();
  const { onOCR: OCRAPI, generateDescription, extractFilesDetails, faceRecognition, generateFileTags: generateFileTagsAPI } = useMetadataAIOperations();
  const { handleMove, handleCopy, handleDownload } = useFileOperations();
  const { globalHiddenColumns } = useMetadataStatus();

  const storeRef = useRef(null);
  const delayReloadDataTimer = useRef(null);
  const collaboratorsRef = useRef(collaborators);

  const shouldPreserveSearch = useCallback((operationType) => {
    if (!searchState.isActive || !searchState.searchValue) return false;
    return shouldPreserveSearchForOperation(operationType);
  }, [searchState.isActive, searchState.searchValue]);

  const clearSearchState = useCallback(() => {
    setSearchState({
      searchValue: '',
      searchResult: null,
      isActive: false,
      lastSearchMetadata: null
    });
  }, []);

  const updateSearchState = useCallback((updates) => {
    setSearchState(prev => ({ ...prev, ...updates }));
  }, []);

  const smartTableChangedRef = useRef(null);

  const notifyTableChanged = useCallback((operationType) => {
    if (smartTableChangedRef.current) {
      smartTableChangedRef.current(operationType);
    } else {
      if (storeRef.current?.data) {
        setMetadata(storeRef.current.data);
      }
      if (searchState.isActive) {
        clearSearchState();
        if (window.sfMetadataContext?.eventBus) {
          window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.RESET_SEARCH_BAR);
        }
      }
    }
  }, [searchState.isActive, clearSearchState]);

  const tableChanged = useCallback(() => {
    notifyTableChanged(EVENT_BUS_TYPE.LOCAL_TABLE_CHANGED);
  }, [notifyTableChanged]);

  const serverTableChanged = useCallback(() => {
    notifyTableChanged(EVENT_BUS_TYPE.SERVER_TABLE_CHANGED);
  }, [notifyTableChanged]);

  const handleTableError = useCallback((error) => {
    toaster.danger(error.error);
  }, []);

  const updateMetadata = useCallback((data) => {
    notifyTableChanged(EVENT_BUS_TYPE.UPDATE_TABLE_ROWS);
  }, [notifyTableChanged]);

  const reloadMetadata = useCallback(() => {
    setLoading(true);
    storeRef.current.reload(PER_LOAD_NUMBER).then(() => {
      setLoading(false);
      delayReloadDataTimer.current = null;
      notifyTableChanged(EVENT_BUS_TYPE.RELOAD_DATA);
      if (viewID == TRASH_VIEW_ID) {
        window.sfMetadataContext && window.sfMetadataContext.eventBus && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_TRASH_TOOLBAR, storeRef.current.data);
      }
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      setErrorMessage(errorMsg);
      setLoading(false);
    });
  }, [notifyTableChanged, viewID]);

  const delayReloadMetadata = useCallback(() => {
    delayReloadDataTimer.current && clearTimeout(delayReloadDataTimer.current);
    delayReloadDataTimer.current = setTimeout(() => {
      reloadMetadata();
    }, 600);
  }, [reloadMetadata]);

  const modifyFilters = useCallback((filters, filterConjunction, basicFilters) => {
    storeRef.current.modifyFilters(filterConjunction, filters, basicFilters);
    setTimeout(() => notifyTableChanged(EVENT_BUS_TYPE.MODIFY_FILTERS), 0);
  }, [storeRef, notifyTableChanged]);

  const modifySorts = useCallback((sorts, displaySorts = false) => {
    storeRef.current.modifySorts(sorts, displaySorts);
    setTimeout(() => notifyTableChanged(EVENT_BUS_TYPE.MODIFY_SORTS), 0);
  }, [storeRef, notifyTableChanged]);

  const modifyGroupbys = useCallback((groupbys) => {
    storeRef.current.modifyGroupbys(groupbys);
    setTimeout(() => notifyTableChanged(EVENT_BUS_TYPE.MODIFY_GROUPBYS), 0);
  }, [storeRef, notifyTableChanged]);

  const modifyHiddenColumns = useCallback((hiddenColumns) => {
    storeRef.current.modifyHiddenColumns(hiddenColumns);
    setTimeout(() => notifyTableChanged(EVENT_BUS_TYPE.MODIFY_HIDDEN_COLUMNS), 0);
  }, [storeRef, notifyTableChanged]);

  const modifySettings = useCallback((settings) => {
    storeRef.current.modifySettings(settings);
    setTimeout(() => notifyTableChanged(EVENT_BUS_TYPE.MODIFY_SETTINGS), 0);
  }, [storeRef, notifyTableChanged]);

  const updateLocalRecord = useCallback(({ recordId, parentDir, fileName }, update) => {
    storeRef.current.modifyLocalRecord({ record_id: recordId, parent_dir: parentDir, file_name: fileName }, update);
    setTimeout(() => notifyTableChanged(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED), 0);
  }, [storeRef, notifyTableChanged]);

  const updateLocalColumnData = useCallback((columnKey, newData, oldData) => {
    storeRef.current.modifyLocalColumnData(columnKey, newData, oldData);
    setTimeout(() => notifyTableChanged(EVENT_BUS_TYPE.LOCAL_COLUMN_DATA_CHANGED), 0);
  }, [notifyTableChanged]);

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

  const restoreTrashRecords = (recordsIds, { success_callback, fail_callback } = {}) => {
    if (!Array.isArray(recordsIds) || recordsIds.length === 0) return;
    storeRef.current.restoreTrashRecords(recordsIds, {
      fail_callback: (error) => {
        fail_callback && fail_callback(error);
        error && toaster.danger(error);
      },
      success_callback: (returned) => {
        const { success, failed } = returned.res.data;
        if (success.length) {
          storeRef.current.updateTrashRecords(success);
          const itemPathList = success[0].path.split('/');
          const itemName = itemPathList[itemPathList.length - 1];
          let msg = success.length > 1
            ? gettext('Successfully restored {name} and {n} other item(s)')
            : gettext('Successfully restored {name}');
          msg = msg.replace('{name}', itemName)
            .replace('{n}', success.length - 1);
          toaster.success(msg);
        }
        if (failed.length) {
          failed.forEach((item) => {
            toaster.danger('{item.path}: {item.error_msg}');
          });
        }
        success_callback && success_callback();
      },
    });
  };

  const updateTrashRecords = () => {
    setMetadata(storeRef.current.data);
  };

  const loadTrashFolderRecords = (commitID, baseDir, folderPath) => {
    storeRef.current.loadTrashFolderRecords(commitID, baseDir, folderPath);
  };

  const trashFolderRecordsLoaded = () => {
    setMetadata(storeRef.current.data);
    setTimeout(() => {
      window.sfMetadataContext && window.sfMetadataContext.eventBus && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_TRASH_FOLDER_PATH, storeRef.current.data);
      window.sfMetadataContext && window.sfMetadataContext.eventBus && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_TRASH_TOOLBAR, storeRef.current.data);
    }, 0);
  };

  const searchTrashRecords = (query, filters) => {
    storeRef.current.searchTrashRecords(query, filters);
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
    // Column order changes preserve search context
    setTimeout(() => notifyTableChanged(EVENT_BUS_TYPE.MODIFY_COLUMN_ORDER), 0);
  }, [storeRef, notifyTableChanged]);

  const insertColumn = useCallback((name, type, { key, data }) => {
    storeRef.current.insertColumn(name, type, { key, data });
  }, [storeRef]);

  const updateFileTags = useCallback((data) => {
    const { record_id, tags } = data[0];
    modifyLocalFileTags(record_id, tags);
    storeRef.current.updateFileTags(data);
  }, [storeRef, modifyLocalFileTags]);

  const updateSelectedRecordIds = useCallback((ids, isSomeone, faceMetadata) => {
    toggleShowDirentToolbar(ids.length > 0);
    const data = isSomeone !== undefined ? faceMetadata : metadata;
    setTimeout(() => {
      window.sfMetadataContext && window.sfMetadataContext.eventBus && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_RECORDS, ids, data, isSomeone);
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
        const locationColumnKey = PRIVATE_COLUMN_KEY.LOCATION;

        const freshMetadata = storeRef.current?.data || metadata;

        const captureColumn = getColumnByKey(freshMetadata.columns, PRIVATE_COLUMN_KEY.CAPTURE_TIME);
        const locationColumn = getColumnByKey(freshMetadata.columns, PRIVATE_COLUMN_KEY.LOCATION);

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

            if (record._location_translated) {
              idOldRecordData[recordId]._location_translated = record._location_translated;
              idOriginalOldRecordData[recordId]._location_translated = record._location_translated;
            }
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

            if (detail._location_translated) {
              idRecordUpdates[updateRecordId]._location_translated = detail._location_translated;
              idOriginalRecordUpdates[updateRecordId]._location_translated = detail._location_translated;
            }
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
    const recordId = getRecordIdFromRecord(record);
    if (!fileName || !parentDir) return;
    const checkIsDescribableFile = Utils.isDescriptionSupportedFile(fileName);
    if (!checkIsDescribableFile) return;

    const descriptionColumnKey = PRIVATE_COLUMN_KEY.FILE_DESCRIPTION;
    let idOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [descriptionColumnKey]: record[descriptionColumnKey] } };
    let idOriginalOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [descriptionColumnKey]: record[descriptionColumnKey] } };
    generateDescription({ parentDir, fileName, recordId }, {
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

  const onOCR = useCallback((record, target) => {
    const parentDir = getParentDirFromRecord(record);
    const fileName = getFileNameFromRecord(record);
    if (!fileName || !parentDir) return;
    const descriptionColumnKey = PRIVATE_COLUMN_KEY.FILE_DESCRIPTION;
    let idOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [descriptionColumnKey]: record[descriptionColumnKey] } };
    let idOriginalOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [descriptionColumnKey]: record[descriptionColumnKey] } };
    OCRAPI(record, {
      success_callback: (description) => {
        if (!description) return;
        const updateRecordId = record[PRIVATE_COLUMN_KEY.ID];
        const recordIds = [updateRecordId];
        let idRecordUpdates = {};
        let idOriginalRecordUpdates = {};
        idRecordUpdates[updateRecordId] = { [descriptionColumnKey]: description || null };
        idOriginalRecordUpdates[updateRecordId] = { [descriptionColumnKey]: description || null };
        modifyRecords(recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData);
      }
    }, target);
  }, [modifyRecords, OCRAPI]);

  const generateFileTags = useCallback((record) => {
    const parentDir = getParentDirFromRecord(record);
    const fileName = getFileNameFromRecord(record);
    if (!fileName || !parentDir) return;
    generateFileTagsAPI(record, {
      success_callback: updateFileTags
    });
  }, [updateFileTags, generateFileTagsAPI]);

  const areRecordsInSameFolder = useCallback((records) => {
    if (!records || records.length <= 1) return true;
    const firstPath = getParentDirFromRecord(records[0]);
    return records.every(record => getParentDirFromRecord(record) === firstPath);
  }, []);

  const calculateBatchMoveUpdateData = useCallback((records, targetRepoId, targetParentPath, sourceParentPath) => {
    const { rows } = storeRef.current.data || metadata;
    let needDeletedRowIds = [];
    let updateRowIds = [];
    let idRowUpdates = {};
    let idOldRowData = {};

    records.forEach(record => {
      const rowId = getRecordIdFromRecord(record);
      const isDir = checkIsDir(record);
      const oldName = getFileNameFromRecord(record);
      const oldParentPath = Utils.joinPath(sourceParentPath, oldName);

      if (repoID === targetRepoId) {
        const newName = getUniqueFileName(rows, targetParentPath, oldName);
        updateRowIds.push(rowId);
        idRowUpdates[rowId] = {
          [PRIVATE_COLUMN_KEY.PARENT_DIR]: targetParentPath,
          [PRIVATE_COLUMN_KEY.FILE_NAME]: newName
        };
        idOldRowData[rowId] = {
          [PRIVATE_COLUMN_KEY.PARENT_DIR]: sourceParentPath,
          [PRIVATE_COLUMN_KEY.FILE_NAME]: oldName
        };

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
        needDeletedRowIds.push(rowId);
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
    });

    return {
      modify_row_ids: updateRowIds,
      modify_id_row_updates: idRowUpdates,
      modify_id_old_row_data: idOldRowData,
      delete_row_ids: needDeletedRowIds,
    };
  }, [metadata, repoID]);

  const handleMoveRecords = (records) => {
    if (records.length > 1) {
      if (!areRecordsInSameFolder(records)) {
        toaster.danger(gettext('Can only move files that are in the same folder'));
        return;
      }

      const path = getParentDirFromRecord(records[0]);
      const recordIds = records.map(r => getRecordIdFromRecord(r));
      const dirents = records.map(r => getFileNameFromRecord(r));
      const selectedDirentList = records.map(r => {
        const fileName = getFileNameFromRecord(r);
        return new Dirent({ name: fileName, is_dir: checkIsDir(r) });
      });

      const callback = (destRepo, destDirentPath, isByDialog = false) => {
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
        const updateData = calculateBatchMoveUpdateData(records, destRepo.repo_id, destDirentPath, path);

        storeRef.current.moveRecords(recordIds, destRepo.repo_id, dirents, destDirentPath, path, updateData, {
          success_callback: (operation) => {
            if (selectedDirentList.length > 0) {
              moveFileCallback && moveFileCallback(
                repoID,
                destRepo,
                selectedDirentList[0],
                destDirentPath,
                path,
                operation.task_id,
                isByDialog,
                {
                  isBatchOperation: true,
                  batchFileNames: dirents,
                }
              );
            }
          },
          fail_callback: (error) => {
            error && toaster.danger(error);
          }
        });
      };
      handleMove(path, selectedDirentList, true, callback);
    } else {
      // Single record
      const path = getParentDirFromRecord(records[0]);
      const currentRecordId = getRecordIdFromRecord(records[0]);
      const fileName = getFileNameFromRecord(records[0]);
      const dirent = new Dirent({ name: fileName, is_dir: checkIsDir(records[0]) });
      const callback = (...params) => {
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
        moveRecord && moveRecord(currentRecordId, ...params);
      };
      handleMove(path, dirent, false, callback);
    }
  };

  const handleCopyRecords = (records) => {
    if (records.length > 1) {
      if (!areRecordsInSameFolder(records)) {
        toaster.danger(gettext('Can only copy files that are in the same folder'));
        return;
      }

      const path = getParentDirFromRecord(records[0]);
      const recordIds = records.map(r => getRecordIdFromRecord(r));
      const dirents = records.map(r => getFileNameFromRecord(r));
      const selectedDirentList = records.map(r => {
        const fileName = getFileNameFromRecord(r);
        return new Dirent({ name: fileName, is_dir: checkIsDir(r) });
      });

      const callback = (destRepo, destDirentPath, isByDialog = false) => {
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
        storeRef.current.duplicateRecords(recordIds, destRepo.repo_id, dirents, destDirentPath, path, {
          success_callback: (operation) => {
            if (selectedDirentList.length > 0) {
              copyFileCallback && copyFileCallback(
                repoID,
                destRepo,
                selectedDirentList[0],
                destDirentPath,
                path,
                operation.task_id,
                isByDialog,
                {
                  isBatchOperation: true,
                  batchFileNames: dirents,
                }
              );
            }

            if (repoID === destRepo.repo_id) {
              delayReloadMetadata();
            }
          },
          fail_callback: (error) => {
            error && toaster.danger(error);
          }
        });
      };
      handleCopy(path, selectedDirentList, true, callback);
    } else {
      // Single record
      const path = getParentDirFromRecord(records[0]);
      const currentRecordId = getRecordIdFromRecord(records[0]);
      const fileName = getFileNameFromRecord(records[0]);
      const dirent = new Dirent({ name: fileName, is_dir: checkIsDir(records[0]) });
      const callback = (...params) => {
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
        duplicateRecord && duplicateRecord(currentRecordId, ...params);
      };
      handleCopy(path, dirent, false, callback);
    }
  };

  const handleDownloadRecords = (recordIds) => {
    if (recordIds.length === 0) return;

    const records = recordIds.map(id => storeRef.current?.data?.id_row_map?.[id]).filter(Boolean);
    if (records.length === 0) return;

    if (!areRecordsInSameFolder(records)) {
      toaster.danger(gettext('Can only download files that are in the same folder'));
      return;
    }

    const path = getParentDirFromRecord(records[0]);
    const direntList = records.map(record => {
      const fileName = getFileNameFromRecord(record);
      return { name: fileName, is_dir: checkIsDir(record) };
    });

    handleDownload(path, direntList);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  };

  const getSearchableValue = useCallback((row, column, collaborators, tagsData, collaboratorsCache) => {
    const { type: columnType } = column;
    let cellValue = getCellValueByColumn(row, column);

    if (!cellValue) return '';

    switch (columnType) {
      case CellType.GEOLOCATION:
        return row._location_translated?.address || '';

      case CellType.COLLABORATOR:
        return getCollaboratorsName(collaborators, cellValue);

      case CellType.LAST_MODIFIER:
      case CellType.CREATOR: {
        const collaborator = collaborators.find(user => user.email === cellValue)
        || collaboratorsCache[cellValue];
        return collaborator?.name || cellValue;
      }

      case CellType.NUMBER:
        return getNumberDisplayString(cellValue, column.data);

      case CellType.TAGS:
        return cellValue?.map(tag => {
          const foundTag = tagsData?.rows.find(t => t._id === tag.row_id);
          return foundTag?._tag_name;
        }).filter(Boolean).join(', ') || '';

      default:
        return String(cellValue);
    }
  }, []);

  const filterGroups = useCallback((groups, matchedRowIds) => {
    if (!Array.isArray(groups)) return groups;

    return groups.map(group => {
      const { subgroups, row_ids, ...groupData } = group;

      if (subgroups && subgroups.length > 0) {
        const filteredSubgroups = filterGroups(subgroups, matchedRowIds);
        return {
          ...groupData,
          subgroups: filteredSubgroups.filter(subgroup =>
            (subgroup.subgroups && subgroup.subgroups.length > 0) ||
            (subgroup.row_ids && subgroup.row_ids.length > 0)
          )
        };
      } else if (row_ids && row_ids.length > 0) {
        const filteredRowIds = row_ids.filter(rowId => matchedRowIds.includes(rowId));
        return {
          ...groupData,
          row_ids: filteredRowIds
        };
      }

      return group;
    }).filter(group =>
      (group.subgroups && group.subgroups.length > 0) ||
      (group.row_ids && group.row_ids.length > 0)
    );
  }, []);

  const performSearch = useCallback((metadata, searchableColumns, searchRegRule, collaborators, tagsData, collaboratorsCache) => {
    let searchResult = { matchedCells: [], matchedRows: {}, currentSelectIndex: 0 };
    let hasMatches = false;

    metadata.rows.forEach((row, rowIndex) => {
      for (const column of searchableColumns) {
        const searchableValue = getSearchableValue(row, column, collaborators, tagsData, collaboratorsCache);

        if (searchRegRule.test(searchableValue)) {
          hasMatches = true;
          if (!searchResult.matchedRows[row._id]) {
            searchResult.matchedRows[row._id] = [];
          }
          searchResult.matchedRows[row._id].push(column.key);
          searchResult.matchedCells.push({
            rowId: row._id,
            columnKey: column.key,
            value: searchableValue,
            rowIndex,
          });
          break;
        }
      }
    });

    return { searchResult, hasMatches };
  }, [getSearchableValue]);

  const createFilteredMetadata = useCallback((metadata, matchedRowIds, hasMatches) => {
    if (!hasMatches) {
      return {
        ...metadata,
        row_ids: [],
        rows: [],
        view: {
          ...metadata.view,
          rows: [],
          ...(metadata.view.groups && { groups: [] })
        }
      };
    }

    return {
      ...metadata,
      row_ids: matchedRowIds,
      rows: matchedRowIds.map(id => metadata.id_row_map[id]).filter(Boolean),
      view: {
        ...metadata.view,
        rows: matchedRowIds,
        ...(metadata.view.groups && {
          groups: filterGroups(metadata.view.groups, matchedRowIds)
        })
      }
    };
  }, [filterGroups]);

  const reapplySearchToMetadata = useCallback((searchValue, baseMetadata) => {
    if (!searchValue || !baseMetadata) return baseMetadata;

    const searchRegRule = getSearchRule(searchValue);
    if (!searchRegRule) return baseMetadata;

    const { columns, hidden_columns } = baseMetadata.view;
    const searchableColumns = columns.filter(column =>
      !globalHiddenColumns.includes(column.key) &&
      !hidden_columns.includes(column.key) &&
      !TABLE_NOT_DISPLAY_COLUMN_KEYS.includes(column.key) &&
      SUPPORT_SEARCH_COLUMN_LIST.includes(column.type)
    );

    if (!searchableColumns.length) return baseMetadata;

    const collaborators = collaboratorsRef.current;
    const tagsData = window.sfTagsDataStore?.data;
    const { searchResult, hasMatches } = performSearch(
      baseMetadata,
      searchableColumns,
      searchRegRule,
      collaborators,
      tagsData,
      collaboratorsCache
    );

    const matchedRowIds = Object.keys(searchResult.matchedRows);
    const filteredMetadata = createFilteredMetadata(baseMetadata, matchedRowIds, hasMatches);

    setSearchState(prev => ({
      ...prev,
      searchResult,
      lastSearchMetadata: baseMetadata
    }));

    return filteredMetadata;
  }, [globalHiddenColumns, collaboratorsCache, performSearch, createFilteredMetadata]);

  const smartTableChanged = useCallback((operationType = 'UNKNOWN') => {
    if (!storeRef.current?.data) {
      return;
    }

    const newMetadata = storeRef.current.data;

    if (shouldPreserveSearch(operationType)) {
      if (searchState.searchValue) {
        const filteredMetadata = reapplySearchToMetadata(searchState.searchValue, newMetadata);
        setMetadata(filteredMetadata);
      } else {
        setMetadata(newMetadata);
      }
    } else {
      // Clear search: show full new data (only for filters and groupby)
      setMetadata(newMetadata);
      if (searchState.isActive) {
        clearSearchState();
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.RESET_SEARCH_BAR);
      }
    }
  }, [searchState, shouldPreserveSearch, reapplySearchToMetadata, clearSearchState]);

  smartTableChangedRef.current = smartTableChanged;

  const handleSearchRows = useCallback((searchVal, callback) => {
    const metadata = storeRef.current?.data;
    const tagsData = window.sfTagsDataStore?.data;

    if (!metadata || !metadata.rows || !metadata.view || !metadata.view.columns) {
      callback && callback(null);
      return;
    }

    if (!searchVal || !metadata.rows.length) {
      setSearchState({
        searchValue: '',
        searchResult: null,
        isActive: false,
        lastSearchMetadata: null
      });
      setMetadata(metadata);
      callback && callback(null);
      return;
    }

    const searchRegRule = getSearchRule(searchVal);
    if (!searchRegRule) {
      setSearchState({
        searchValue: '',
        searchResult: null,
        isActive: false,
        lastSearchMetadata: null
      });
      setMetadata(metadata);
      callback && callback(null);
      return;
    }

    const { columns, hidden_columns } = metadata.view;
    const searchableColumns = columns.filter(column =>
      !globalHiddenColumns.includes(column.key) &&
      !hidden_columns.includes(column.key) &&
      !TABLE_NOT_DISPLAY_COLUMN_KEYS.includes(column.key) &&
      SUPPORT_SEARCH_COLUMN_LIST.includes(column.type)
    );

    if (!searchableColumns.length) {
      callback && callback(null);
      setMetadata(metadata);
      return;
    }

    const collaborators = collaboratorsRef.current;
    const { searchResult, hasMatches } = performSearch(
      metadata,
      searchableColumns,
      searchRegRule,
      collaborators,
      tagsData,
      collaboratorsCache
    );

    const matchedRowIds = Object.keys(searchResult.matchedRows);
    const newMetadata = createFilteredMetadata(metadata, matchedRowIds, hasMatches);

    setSearchState({
      searchValue: searchVal,
      searchResult,
      isActive: true,
      lastSearchMetadata: metadata
    });

    setMetadata(newMetadata);
    callback && callback(searchResult);
  }, [globalHiddenColumns, collaboratorsCache, createFilteredMetadata, performSearch]);

  // init
  useEffect(() => {
    if (searchState.isActive) {
      setSearchState({
        searchValue: '',
        searchResult: null,
        isActive: false,
        lastSearchMetadata: null
      });
    }

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
    const unsubscribeServerTableChanged = eventBus.subscribe(EVENT_BUS_TYPE.SERVER_TABLE_CHANGED, serverTableChanged);
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
    const unsubscribeDuplicateRecord = eventBus.subscribe(EVENT_BUS_TYPE.DUPLICATE_RECORD, duplicateRecord);
    const unsubscribeDeleteRecords = eventBus.subscribe(EVENT_BUS_TYPE.DELETE_RECORDS, deleteRecords);
    const unsubscribeRestoreTrashRecords = eventBus.subscribe(EVENT_BUS_TYPE.RESTORE_TRASH_RECORDS, restoreTrashRecords);
    const unsubscribeLoadTrashFolderRecords = eventBus.subscribe(EVENT_BUS_TYPE.LOAD_TRASH_FOLDER_RECORDS, loadTrashFolderRecords);
    const unsubscribeTrashFolderRecordsLoaded = eventBus.subscribe(EVENT_BUS_TYPE.TRASH_FOLDER_RECORDS_LOADED, trashFolderRecordsLoaded);
    const unsubscribeUpdateTrashRecords = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_TRASH_RECORDS, updateTrashRecords);
    const unsubscribeSearchTrashRecords = eventBus.subscribe(EVENT_BUS_TYPE.SEARCH_TRASH_RECORDS, searchTrashRecords);
    const unsubscribeUpdateDetails = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_RECORD_DETAILS, updateRecordDetails);
    const unsubscribeUpdateFaceRecognition = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_FACE_RECOGNITION, updateFaceRecognition);
    const unsubscribeUpdateDescription = eventBus.subscribe(EVENT_BUS_TYPE.GENERATE_DESCRIPTION, updateRecordDescription);
    const unsubscribeOCR = eventBus.subscribe(EVENT_BUS_TYPE.EXTRACT_TEXT, onOCR);
    const unsubscribeToggleMoveDialog = eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_MOVE_DIALOG, handleMoveRecords);
    const unsubscribeToggleCopyDialog = eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_COPY_DIALOG, handleCopyRecords);
    const unsubscribeDownloadRecords = eventBus.subscribe(EVENT_BUS_TYPE.DOWNLOAD_RECORDS, handleDownloadRecords);
    const unsubscribeSearchRows = eventBus.subscribe(EVENT_BUS_TYPE.SEARCH_ROWS, handleSearchRows);
    const unsubscribeGenerateFileTags = eventBus.subscribe(EVENT_BUS_TYPE.GENERATE_FILE_TAGS, generateFileTags);
    const unsubscribeLoading = eventBus.subscribe(EVENT_BUS_TYPE.LOADING, (loading = false) => setLoading(loading));

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
      unsubscribeDuplicateRecord();
      unsubscribeDeleteRecords();
      unsubscribeRestoreTrashRecords();
      unsubscribeUpdateTrashRecords();
      unsubscribeSearchTrashRecords();
      unsubscribeLoadTrashFolderRecords();
      unsubscribeTrashFolderRecordsLoaded();
      unsubscribeUpdateDetails();
      unsubscribeUpdateFaceRecognition();
      unsubscribeUpdateDescription();
      unsubscribeOCR();
      unsubscribeToggleMoveDialog();
      unsubscribeToggleCopyDialog();
      unsubscribeDownloadRecords();
      unsubscribeSearchRows();
      unsubscribeGenerateFileTags();
      unsubscribeLoading();
      delayReloadDataTimer.current && clearTimeout(delayReloadDataTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, viewID]);

  useEffect(() => {
    collaboratorsRef.current && (collaboratorsRef.current = collaborators);
  }, [collaborators]);

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
        searchState,
        updateSearchState,
        isDirentDetailShow: params.isDirentDetailShow,
        updateCurrentDirent: params.updateCurrentDirent,
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
        updateCurrentPath: params.updateCurrentPath,
        updateSelectedRecordIds,
        updateRecordDetails,
        updateFaceRecognition,
        updateRecordDescription,
        onOCR,
        generateFileTags,
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
