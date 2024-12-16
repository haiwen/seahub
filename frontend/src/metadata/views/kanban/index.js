import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useMetadataView } from '../../hooks/metadata-view';
import { EVENT_BUS_TYPE } from '../../constants';
import toaster from '../../../components/toast';
import Boards from './boards';
import Settings from './settings';
import { getRowById } from '../../utils/table';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../utils/cell';
import { Utils, validateName } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';

import './index.css';

const Kanban = () => {
  const [isShowSettings, setShowSettings] = useState(false);

  const { metadata, store, renameFileCallback, deleteFilesCallback } = useMetadataView();

  const columns = useMemo(() => metadata.view.columns, [metadata.view.columns]);

  const modifyRecord = useCallback((rowId, updates, oldRowData, originalUpdates, originalOldRowData, { success_callback }) => {
    const rowIds = [rowId];
    const idRowUpdates = { [rowId]: updates };
    const idOriginalRowUpdates = { [rowId]: originalUpdates };
    const idOldRowData = { [rowId]: oldRowData };
    const idOriginalOldRowData = { [rowId]: originalOldRowData };
    const isRename = store.checkIsRenameFileOperator(rowIds, idOriginalRowUpdates);
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
      if (store.checkDuplicatedName(newName, _parent_dir)) {
        let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
        errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
        toaster.danger(errMessage);
        return;
      }
    }
    store.modifyRecords(rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, false, isRename, {
      fail_callback: (error) => {
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
          success_callback && success_callback();
        }
        const eventBus = window.sfMetadataContext.eventBus;
        eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_DETAIL_CHANGED, rowId, updates);
      },
    });
  }, [store, metadata, renameFileCallback]);

  const deleteRecords = useCallback((recordsIds, { success_callback }) => {
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
        success_callback && success_callback();
      },
    });
  }, [metadata, store, deleteFilesCallback]);

  const modifySettings = useCallback((newSettings) => {
    store.modifySettings(newSettings);
  }, [store]);

  const modifyColumnData = useCallback((columnKey, newData, oldData, { optionModifyType } = {}) => {
    store.modifyColumnData(columnKey, newData, oldData, { optionModifyType });
  }, [store]);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  useEffect(() => {
    const eventBus = window.sfMetadataContext.eventBus;
    const unsubscribeKanbanSetting = eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_KANBAN_SETTINGS, () => setShowSettings(!isShowSettings));
    const unsubscribeCloseKanbanSetting = eventBus.subscribe(EVENT_BUS_TYPE.CLOSE_KANBAN_SETTINGS, () => setShowSettings(false));
    return () => {
      unsubscribeKanbanSetting();
      unsubscribeCloseKanbanSetting();
    };
  }, [isShowSettings]);

  return (
    <div className="sf-metadata-container">
      <div className="sf-metadata-view-kanban">
        <Boards
          modifyRecord={modifyRecord}
          deleteRecords={deleteRecords}
          modifyColumnData={modifyColumnData}
          onCloseSettings={closeSettings}
        />
        <div className="sf-metadata-view-setting-panel sf-metadata-view-kanban-setting h-100">
          {isShowSettings && (
            <Settings
              columns={columns}
              columnsMap={metadata.key_column_map}
              settings={metadata.view.settings}
              modifySettings={modifySettings}
              onClose={closeSettings}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Kanban;
