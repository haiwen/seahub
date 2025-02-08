import deepCopy from 'deep-copy';
import { getRowById, getRowsByIds } from '../utils/table';
import { getColumnByKey, normalizeColumns } from '../utils/column';
import {
  Operation, LOCAL_APPLY_OPERATION_TYPE, NEED_APPLY_AFTER_SERVER_OPERATION, OPERATION_TYPE, UNDO_OPERATION_TYPE,
  VIEW_OPERATION, COLUMN_OPERATION
} from './operations';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER, PRIVATE_COLUMN_KEY, DEFAULT_RETRY_TIMES, DEFAULT_RETRY_INTERVAL } from '../constants';
import DataProcessor from './data-processor';
import ServerOperator from './server-operator';
import LocalOperator from './local-operator';
import Metadata from '../model/metadata';
import { checkIsDir } from '../utils/row';
import { Utils } from '../../utils/utils';
import { getFileNameFromRecord, checkDuplicatedName } from '../utils/cell';

class Store {

  constructor(props) {
    this.repoId = props.repoId;
    this.viewId = props.viewId;
    this.data = null;
    this.context = props.context;
    this.startIndex = 0;
    this.redos = [];
    this.undo = [];
    this.pendingOperations = [];
    this.isSendingOperation = false;
    this.isReadonly = false;
    this.serverOperator = new ServerOperator();
    this.localOperator = new LocalOperator();
    this.collaborators = props.collaborators || [];
  }

  destroy = () => {
    this.viewId = '';
    this.data = null;
    this.startIndex = 0;
    this.redos = [];
    this.undo = [];
    this.pendingOperations = [];
    this.isSendingOperation = false;
  };

  initStartIndex = () => {
    this.startIndex = 0;
  };

  async loadMetadata(view, limit, retries = DEFAULT_RETRY_TIMES, delay = DEFAULT_RETRY_INTERVAL) {
    const res = await this.context.getMetadata({ view_id: this.viewId, start: this.startIndex, limit });
    const rows = res?.data?.results || [];
    if (rows.length === 0 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.loadMetadata(view, limit, retries - 1, delay);
    }
    const columns = normalizeColumns(res?.data?.metadata);
    let data = new Metadata({ rows, columns, view });
    data.view.rows = data.row_ids;
    const loadedCount = rows.length;
    data.hasMore = loadedCount === limit;
    this.data = data;
    this.startIndex += loadedCount;
    DataProcessor.run(this.data, { collaborators: this.collaborators });
  }

  async load(limit = PER_LOAD_NUMBER, isBeingBuilt = false) {
    const viewRes = await this.context.getView(this.viewId);
    const view = viewRes?.data?.view || {};
    const retries = isBeingBuilt ? DEFAULT_RETRY_TIMES : 0;
    await this.loadMetadata(view, limit, retries);
  }

  async reload(limit = PER_LOAD_NUMBER) {
    this.startIndex = 0;
    await this.loadMetadata(this.data.view, limit, 0);
  }

  async loadMore(limit) {
    if (!this.data) return;
    const res = await this.context.getMetadata({ view_id: this.viewId, start: this.startIndex, limit });
    const rows = res?.data?.results || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      this.hasMore = false;
      return;
    }

    this.data.rows.push(...rows);
    rows.forEach(record => {
      this.data.row_ids.push(record._id);
      this.data.id_row_map[record._id] = record;
    });
    const loadedCount = rows.length;
    this.data.hasMore = loadedCount === limit;
    this.data.recordsCount = this.data.row_ids.length;
    this.startIndex = this.startIndex + loadedCount;
    DataProcessor.run(this.data, { collaborators: this.collaborators });
    this.context.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_TABLE_CHANGED);
  }

  async updateRowData(newRowId) {
    const res = await this.context.getRowsByIds(this.repoId, [newRowId]);
    if (!res || !res.data) {
      return;
    }
    const newRow = res.data.results[0];
    const rowIndex = this.data.rows.findIndex(row => row._id === newRowId);
    this.data.id_row_map[newRowId] = newRow;
    this.data.rows[rowIndex] = newRow;
    DataProcessor.run(this.data, { collaborators: this.collaborators });
  }

  createOperation(op) {
    return new Operation(op);
  }

  applyOperation(operation, undoRedoHandler = { handleUndo: true }) {
    const { op_type } = operation;

    if (!NEED_APPLY_AFTER_SERVER_OPERATION.includes(op_type)) {
      this.handleUndoRedos(undoRedoHandler, operation);
      this.data = deepCopy(operation.apply(this.data));
      this.syncOperationOnData(operation);
      this.context.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_TABLE_CHANGED);
    }

    if (LOCAL_APPLY_OPERATION_TYPE.includes(op_type)) {
      this.localOperator.applyOperation(operation);
      return;
    }

    this.addPendingOperations(operation, undoRedoHandler);
  }

  addPendingOperations(operation, undoRedoHandler) {
    this.pendingOperations.push(operation);
    this.startSendOperation(undoRedoHandler);
  }

  startSendOperation(undoRedoHandler) {
    if (this.isSendingOperation || this.pendingOperations.length === 0) {
      return;
    }
    this.isSendingOperation = true;
    this.context.eventBus.dispatch(EVENT_BUS_TYPE.SAVING);
    this.sendNextOperation(undoRedoHandler);
  }

  sendNextOperation(undoRedoHandler) {
    if (this.pendingOperations.length === 0) {
      this.isSendingOperation = false;
      this.context.eventBus.dispatch(EVENT_BUS_TYPE.SAVED);
      return;
    }
    const operation = this.pendingOperations.shift();
    this.serverOperator.applyOperation(operation, this.data, this.sendOperationCallback.bind(this, undoRedoHandler));
  }

  sendOperationCallback = (undoRedoHandler, { operation, error }) => {
    if (error) {
      this.context.eventBus.dispatch(EVENT_BUS_TYPE.TABLE_ERROR, { error });
      operation && operation.fail_callback && operation.fail_callback(error);
      this.sendNextOperation(undoRedoHandler);
      return;
    }

    const isAfterServerOperation = NEED_APPLY_AFTER_SERVER_OPERATION.includes(operation.op_type);
    if (isAfterServerOperation) {
      this.handleUndoRedos(undoRedoHandler, operation);
      this.data = deepCopy(operation.apply(this.data));
      this.syncOperationOnData(operation);
    }

    if (VIEW_OPERATION.includes(operation.op_type) || COLUMN_OPERATION.includes(operation.op_type)) {
      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.VIEW_CHANGED, this.data.view);
    }

    if (isAfterServerOperation) {
      this.context.eventBus.dispatch(EVENT_BUS_TYPE.SERVER_TABLE_CHANGED);
    }
    operation.success_callback && operation.success_callback(operation);

    // need reload records if has related formula columns
    this.serverOperator.handleReloadRecords(this.data, operation, ({ reloadedRecords, idRecordNotExistMap, relatedColumnKeyMap }) => {
      if (reloadedRecords.length > 0) {
        DataProcessor.handleReloadedRecords(this.data, reloadedRecords, relatedColumnKeyMap);
      }
      if (Object.keys(idRecordNotExistMap).length > 0) {
        DataProcessor.handleNotExistRecords(this.data, idRecordNotExistMap);
      }
      this.context.eventBus.dispatch(EVENT_BUS_TYPE.SERVER_TABLE_CHANGED);
    });

    this.sendNextOperation(undoRedoHandler);
  };

  handleUndoRedos(undoRedoHandler, operation) {
    const { handleUndo, asyncUndoRedo } = undoRedoHandler;
    if (handleUndo) {
      if (this.redos.length > 0) {
        this.redos = [];
      }
      if (this.undo.length > 10) {
        this.undo = this.undo.slice(-10);
      }
      if (UNDO_OPERATION_TYPE.includes(operation.op_type)) {
        this.undo.push(operation);
      }
    }
    asyncUndoRedo && asyncUndoRedo(operation);
  }

  undoOperation() {
    if (this.isReadonly || this.undo.length === 0) return;
    const lastOperation = this.undo.pop();
    const lastInvertOperation = lastOperation.invert();
    this.applyOperation(lastInvertOperation, { handleUndo: false, asyncUndoRedo: (operation) => {
      this.redos.push(lastOperation);
    } });
  }

  redoOperation() {
    if (this.isReadonly || this.redos.length === 0) return;
    let lastOperation = this.redos.pop();
    this.applyOperation(lastOperation, { handleUndo: false, asyncUndoRedo: (operation) => {
      this.undo.push(lastOperation);
    } });
  }

  syncOperationOnData(operation) {
    DataProcessor.syncOperationOnData(this.data, operation, { collaborators: this.collaborators });
  }

  modifyRecords(row_ids, id_row_updates, id_original_row_updates, id_old_row_data, id_original_old_row_data, is_copy_paste, is_rename, { fail_callback, success_callback }) {
    const originalRows = getRowsByIds(this.data, row_ids);
    let valid_row_ids = [];
    let valid_id_row_updates = {};
    let valid_id_original_row_updates = {};
    let valid_id_old_row_data = {};
    let valid_id_original_old_row_data = {};
    let id_obj_id = {};
    originalRows.forEach(row => {
      if (row && this.context.canModifyRow(row)) {
        const rowId = row._id;
        valid_row_ids.push(rowId);
        id_obj_id[rowId] = row._obj_id;
        valid_id_row_updates[rowId] = id_row_updates[rowId];
        valid_id_original_row_updates[rowId] = id_original_row_updates[rowId];
        valid_id_old_row_data[rowId] = id_old_row_data[rowId];
        valid_id_original_old_row_data[rowId] = id_original_old_row_data[rowId];
      }
    });

    // get updates which the parent dir is changed
    let oldParentDirPath = null;
    let newParentDirPath = null;
    if (is_rename) {
      const rowId = valid_row_ids[0];
      const row = getRowById(this.data, rowId);
      if (row && checkIsDir(row)) {
        const rowUpdates = id_original_row_updates[rowId];
        const oldName = getFileNameFromRecord(row);
        const newName = getFileNameFromRecord(rowUpdates);
        const { _parent_dir } = row;
        oldParentDirPath = Utils.joinPath(_parent_dir, oldName);
        newParentDirPath = Utils.joinPath(_parent_dir, newName);
      }

      if (newParentDirPath) {
        this.data.rows.forEach((row) => {
          const { _id: rowId, _parent_dir: currentParentDir } = row;
          if (currentParentDir.includes(oldParentDirPath) && !valid_row_ids.includes(rowId)) {
            valid_row_ids.push(rowId);
            id_obj_id[rowId] = row._obj_id;
            const updates = { _parent_dir: currentParentDir.replace(oldParentDirPath, newParentDirPath) };
            valid_id_row_updates[rowId] = Object.assign({}, valid_id_row_updates[rowId], updates);
            valid_id_original_row_updates[rowId] = Object.assign({}, valid_id_original_row_updates[rowId], updates);
            valid_id_old_row_data[rowId] = Object.assign({}, valid_id_old_row_data[rowId], { _parent_dir: currentParentDir });
            valid_id_original_old_row_data[rowId] = Object.assign({}, valid_id_original_old_row_data[rowId], { _parent_dir: currentParentDir });
          }
        });
      }
    }

    const type = OPERATION_TYPE.MODIFY_RECORDS;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      row_ids: valid_row_ids,
      id_row_updates: valid_id_row_updates,
      id_original_row_updates: valid_id_original_row_updates,
      id_old_row_data: valid_id_old_row_data,
      id_original_old_row_data: valid_id_original_old_row_data,
      is_copy_paste,
      is_rename,
      id_obj_id: id_obj_id,
      fail_callback,
      success_callback,
    });
    this.applyOperation(operation);
  }

  deleteRecords(rows_ids, { fail_callback, success_callback }) {
    if (!Array.isArray(rows_ids) || rows_ids.length === 0) return;
    const type = OPERATION_TYPE.DELETE_RECORDS;

    const valid_rows_ids = rows_ids.filter((rowId) => {
      const row = getRowById(this.data, rowId);
      return row && this.context.canModifyRow(row);
    });

    // delete rows where parent dir is deleted
    const deletedDirsPaths = rows_ids.map((rowId) => {
      const row = getRowById(this.data, rowId);
      if (row && checkIsDir(row)) {
        const { _parent_dir, _name } = row;
        return Utils.joinPath(_parent_dir, _name);
      }
      return null;
    }).filter(Boolean);
    if (deletedDirsPaths.length > 0) {
      this.data.rows.forEach((row) => {
        if (deletedDirsPaths.some((deletedDirPath) => row._parent_dir.includes(deletedDirPath)) && !valid_rows_ids.includes(row._id)) {
          valid_rows_ids.push(row._id);
        }
      });
    }

    if (valid_rows_ids.length === 0) {
      return;
    }

    const deleted_rows = valid_rows_ids.map((rowId) => getRowById(this.data, rowId));

    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      rows_ids: valid_rows_ids,
      deleted_rows,
      fail_callback,
      success_callback,
    });
    this.applyOperation(operation);
  }

  reloadRecords(row_ids) {
    const type = OPERATION_TYPE.RELOAD_RECORDS;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      row_ids,
    });
    this.applyOperation(operation);
  }

  lockRecordViaButton(row_id, button_column_key, { success_callback, fail_callback }) {
    const type = OPERATION_TYPE.LOCK_RECORD_VIA_BUTTON;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      row_id,
      button_column_key,
      success_callback,
      fail_callback,
    });
    this.applyOperation(operation);
  }

  /**
   * @param {String} row_id target row id
   * @param {Object} updates { [column.name]: cell_value }
   * @param {Object} original_updates { [column.key]: cell_value }
   * @param {Object} old_row_data { [column.name]: cell_value }
   * @param {Object} original_old_row_data { [column.key]: cell_value }
   * @param {String} button_column_key button column key
   */
  modifyRecordViaButton(row_id, updates, old_row_data, original_updates, original_old_row_data, button_column_key, { success_callback, fail_callback }) {
    const row = getRowById(this.data, row_id);
    if (!row) {
      return;
    }
    const type = OPERATION_TYPE.MODIFY_RECORD_VIA_BUTTON;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      row_id,
      updates,
      old_row_data,
      original_updates,
      original_old_row_data,
      button_column_key,
      success_callback,
      fail_callback,
    });
    this.applyOperation(operation);
  }

  modifyLocalRecord({ parent_dir, file_name, record_id }, updates) {
    const type = OPERATION_TYPE.MODIFY_LOCAL_RECORD;
    const operation = this.createOperation({
      type,
      row_id: record_id,
      parent_dir,
      file_name,
      repo_id: this.repoId,
      updates
    });
    this.applyOperation(operation);
  }

  modifyLocalColumnData(column_key, new_data, old_data) {
    const type = OPERATION_TYPE.MODIFY_LOCAL_COLUMN_DATA;
    const operation = this.createOperation({
      type,
      column_key,
      new_data,
      old_data,
      repo_id: this.repoId,
    });
    this.applyOperation(operation);
  }

  moveRecord(row_id, target_repo_id, dirent, target_parent_path, source_parent_path, update_data, { success_callback, fail_callback }) {
    const type = OPERATION_TYPE.MOVE_RECORD;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      row_id,
      target_repo_id,
      dirent,
      target_parent_path,
      source_parent_path,
      update_data,
      success_callback,
      fail_callback,
    });
    this.applyOperation(operation);
  }

  duplicateRecord(row_id, target_repo_id, dirent, target_parent_path, source_parent_path, { success_callback, fail_callback }) {
    const type = OPERATION_TYPE.DUPLICATE_RECORD;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      row_id,
      target_repo_id,
      dirent,
      target_parent_path,
      source_parent_path,
      success_callback,
      fail_callback,
    });
    this.applyOperation(operation);
  }

  modifyFilters(filterConjunction, filters, basicFilters = []) {
    const type = OPERATION_TYPE.MODIFY_FILTERS;
    const operation = this.createOperation({
      type,
      filter_conjunction: filterConjunction,
      filters,
      basic_filters: basicFilters,
      repo_id: this.repoId,
      view_id: this.viewId,
      success_callback: () => {
        this.context.eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
      }
    });
    this.applyOperation(operation);
  }

  modifySorts(sorts, displaySorts = false) {
    const type = OPERATION_TYPE.MODIFY_SORTS;
    const operation = this.createOperation({
      type,
      sorts,
      repo_id: this.repoId,
      view_id: this.viewId,
      success_callback: () => {
        this.context.eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
        displaySorts && this.context.eventBus.dispatch(EVENT_BUS_TYPE.DISPLAY_SORTS);
      }
    });
    this.applyOperation(operation);
  }

  modifyLocalView(update) {
    const type = OPERATION_TYPE.MODIFY_LOCAL_VIEW;
    const operation = this.createOperation({
      type,
      update,
      repo_id: this.repoId,
      view_id: this.viewId,
    });
    this.applyOperation(operation);
  }

  modifyGroupbys(groupbys) {
    const type = OPERATION_TYPE.MODIFY_GROUPBYS;
    const operation = this.createOperation({
      type, groupbys, repo_id: this.repoId, view_id: this.viewId
    });
    this.applyOperation(operation);
  }

  modifyHiddenColumns(hidden_columns) {
    const type = OPERATION_TYPE.MODIFY_HIDDEN_COLUMNS;
    const operation = this.createOperation({
      type, hidden_columns, repo_id: this.repoId, view_id: this.viewId
    });
    this.applyOperation(operation);
  }

  modifySettings = (settings) => {
    const type = OPERATION_TYPE.MODIFY_SETTINGS;
    const operation = this.createOperation({
      type, repo_id: this.repoId, view_id: this.viewId, settings
    });
    this.applyOperation(operation);
  };

  // column
  insertColumn = (name, columnType, { key, data }) => {
    const operationType = OPERATION_TYPE.INSERT_COLUMN;
    const operation = this.createOperation({
      type: operationType, repo_id: this.repoId, name, column_type: columnType, column_key: key, data
    });
    this.applyOperation(operation);
  };

  deleteColumn = (columnKey, column) => {
    const type = OPERATION_TYPE.DELETE_COLUMN;
    const operation = this.createOperation({
      type, repo_id: this.repoId, column_key: columnKey, column,
    });
    this.applyOperation(operation);
  };

  renameColumn = (columnKey, newName, oldName) => {
    const type = OPERATION_TYPE.RENAME_COLUMN;
    const operation = this.createOperation({
      type, repo_id: this.repoId, column_key: columnKey, new_name: newName, old_name: oldName
    });
    this.applyOperation(operation);
  };

  modifyColumnData = (columnKey, newData, oldData, { optionModifyType } = {}) => {
    const type = OPERATION_TYPE.MODIFY_COLUMN_DATA;
    const operation = this.createOperation({
      type, repo_id: this.repoId, column_key: columnKey, new_data: newData, old_data: oldData, option_modify_type: optionModifyType
    });
    this.applyOperation(operation);
  };

  modifyColumnWidth = (columnKey, newWidth) => {
    const type = OPERATION_TYPE.MODIFY_COLUMN_WIDTH;
    const column = getColumnByKey(this.data.columns, columnKey);
    const operation = this.createOperation({
      type, repo_id: this.repoId, column_key: columnKey, new_width: newWidth, old_width: column.width
    });
    this.applyOperation(operation);
  };

  modifyColumnOrder = (sourceColumnKey, targetColumnKey) => {
    const type = OPERATION_TYPE.MODIFY_COLUMN_ORDER;
    const { columns_keys } = this.data.view;
    const targetColumnIndex = columns_keys.indexOf(targetColumnKey);
    let newColumnsKeys = columns_keys.slice(0);
    newColumnsKeys = newColumnsKeys.filter(key => key !== sourceColumnKey);
    newColumnsKeys.splice(targetColumnIndex, 0, sourceColumnKey);
    const operation = this.createOperation({
      type, repo_id: this.repoId, view_id: this.viewId, new_columns_keys: newColumnsKeys, old_columns_keys: columns_keys
    });
    this.applyOperation(operation);
  };

  checkIsRenameFileOperator = (rows_ids, id_original_row_updates) => {
    if (rows_ids.length > 1) {
      return false;
    }
    const rowId = rows_ids[0];
    const rowUpdates = id_original_row_updates[rowId];
    const updatedKeys = rowUpdates && Object.keys(rowUpdates);
    if (!updatedKeys || updatedKeys.length > 1 || updatedKeys[0] !== PRIVATE_COLUMN_KEY.FILE_NAME) {
      return false;
    }
    return true;
  };

  checkDuplicatedName = (name, parentDir) => {
    return checkDuplicatedName(this.data.rows, parentDir, name);
  };

  renamePeopleName = (peopleId, newName, oldName) => {
    const type = OPERATION_TYPE.RENAME_PEOPLE_NAME;
    const operation = this.createOperation({
      type, repo_id: this.repoId, people_id: peopleId, new_name: newName, old_name: oldName
    });
    this.applyOperation(operation);
  };

  deletePeoplePhotos = (peopleId, deletedPhotos) => {
    const type = OPERATION_TYPE.DELETE_PEOPLE_PHOTOS;
    const operation = this.createOperation({
      type, repo_id: this.repoId, people_id: peopleId, deleted_photos: deletedPhotos
    });
    this.applyOperation(operation);
  };

  removePeoplePhotos = (peopleId, removedPhotos, { success_callback }) => {
    const type = OPERATION_TYPE.REMOVE_PEOPLE_PHOTOS;
    const operation = this.createOperation({
      type, repo_id: this.repoId, people_id: peopleId, removed_photos: removedPhotos, success_callback
    });
    this.applyOperation(operation);
  };

  addPeoplePhotos = (peopleId, oldPeopleId, addedPhotos, { success_callback, fail_callback }) => {
    const type = OPERATION_TYPE.ADD_PEOPLE_PHOTOS;
    const operation = this.createOperation({
      type, repo_id: this.repoId, people_id: peopleId, old_people_id: oldPeopleId, added_photos: addedPhotos, success_callback, fail_callback
    });
    this.applyOperation(operation);
  };

  // tag
  updateFileTags = (data) => {
    const type = OPERATION_TYPE.UPDATE_FILE_TAGS;
    const operation = this.createOperation({
      type, repo_id: this.repoId, file_tags_data: data
    });
    this.applyOperation(operation);
  };

}

export default Store;
