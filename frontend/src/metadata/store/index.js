import deepCopy from 'deep-copy';
import { getRowById, getRowsByIds } from '../utils/table';
import { getColumnByKey, normalizeColumns } from '../utils/column';
import {
  Operation, LOCAL_APPLY_OPERATION_TYPE, NEED_APPLY_AFTER_SERVER_OPERATION, OPERATION_TYPE, UNDO_OPERATION_TYPE,
  VIEW_OPERATION, COLUMN_OPERATION
} from './operations';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER } from '../constants';
import DataProcessor from './data-processor';
import ServerOperator from './server-operator';
import Metadata from '../model/metadata';

class Store {

  constructor(props) {
    this.repoId = props.repoId;
    this.viewId = props.viewId;
    this.data = null;
    this.context = props.context;
    this.startIndex = 0;
    this.redos = [];
    this.undos = [];
    this.pendingOperations = [];
    this.isSendingOperation = false;
    this.isReadonly = false;
    this.serverOperator = new ServerOperator();
    this.collaborators = props.collaborators || [];
  }

  destroy = () => {
    this.viewId = '';
    this.data = null;
    this.startIndex = 0;
    this.redos = [];
    this.undos = [];
    this.pendingOperations = [];
    this.isSendingOperation = false;
  };

  initStartIndex = () => {
    this.startIndex = 0;
  };

  async loadMetadata(view, limit) {
    const res = await this.context.getMetadata({ view_id: this.viewId, start: this.startIndex, limit });
    const rows = res?.data?.results || [];
    const columns = normalizeColumns(res?.data?.metadata);
    let data = new Metadata({ rows, columns, view });
    data.view.rows = data.row_ids;
    const loadedCount = rows.length;
    data.hasMore = loadedCount === limit;
    this.data = data;
    this.startIndex += loadedCount;
    DataProcessor.run(this.data, { collaborators: this.collaborators });
  }

  async load(limit = PER_LOAD_NUMBER) {
    const viewRes = await this.context.getView(this.viewId);
    const view = viewRes?.data?.view || {};
    await this.loadMetadata(view, limit);
  }

  async reload(limit = PER_LOAD_NUMBER) {
    this.startIndex = 0;
    await this.loadMetadata(this.data.view, limit);
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
    this.serverOperator.applyOperation(operation, this.sendOperationCallback.bind(this, undoRedoHandler));
  }

  sendOperationCallback = (undoRedoHandler, { operation, error }) => {
    if (error) {
      operation && operation.fail_callback && operation.fail_callback();
      this.context.eventBus.dispatch(EVENT_BUS_TYPE.TABLE_ERROR, { error });
      this.sendNextOperation(undoRedoHandler);
      return;
    }
    if (NEED_APPLY_AFTER_SERVER_OPERATION.includes(operation.op_type)) {
      this.handleUndoRedos(undoRedoHandler, operation);
      this.data = deepCopy(operation.apply(this.data));
      this.syncOperationOnData(operation);
    }

    if (VIEW_OPERATION.includes(operation.op_type) || COLUMN_OPERATION.includes(operation.op_type)) {
      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.VIEW_CHANGED, this.data.view);
    }

    operation.success_callback && operation.success_callback();
    this.context.eventBus.dispatch(EVENT_BUS_TYPE.SERVER_TABLE_CHANGED);

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
      if (this.undos.length > 10) {
        this.undos = this.undos.slice(-10);
      }
      if (UNDO_OPERATION_TYPE.includes(operation.op_type)) {
        this.undos.push(operation);
      }
    }
    asyncUndoRedo && asyncUndoRedo(operation);
  }

  undoOperation() {
    if (this.isReadonly || this.undos.length === 0) return;
    const lastOperation = this.undos.pop();
    const lastInvertOperation = lastOperation.invert();
    if (NEED_APPLY_AFTER_SERVER_OPERATION.includes(lastInvertOperation.op_type)) {
      this.applyOperation(lastInvertOperation, { handleUndo: false, asyncUndoRedo: (operation) => {
        if (operation.op_type === OPERATION_TYPE.INSERT_RECORD) {
          lastOperation.row_id = operation.row_data._id;
        }
        this.redos.push(lastOperation);
      } });
      return;
    }
    this.redos.push(lastOperation);
    this.applyOperation(lastInvertOperation, { handleUndo: false });
  }

  redoOperation() {
    if (this.isReadonly || this.redos.length === 0) return;
    let lastOperation = this.redos.pop();
    if (NEED_APPLY_AFTER_SERVER_OPERATION.includes(lastOperation.op_type)) {
      this.applyOperation(lastOperation, { handleUndo: false, asyncUndoRedo: (operation) => {
        if (operation.op_type === OPERATION_TYPE.INSERT_RECORD) {
          lastOperation = operation;
        }
        this.undos.push(lastOperation);
      } });
      return;
    }
    this.undos.push(lastOperation);
    this.applyOperation(lastOperation, { handleUndo: false });
  }

  syncOperationOnData(operation) {
    DataProcessor.syncOperationOnData(this.data, operation, { collaborators: this.collaborators });
  }

  /**
   * @param {String} row_id target row id
   * @param {Object} updates { [column.name]: cell_value }
   * @param {Object} original_updates { [column.key]: cell_value }
   * @param {Object} old_row_data { [column.name]: cell_value }
   * @param {Object} original_old_row_data { [column.key]: cell_value }
   */
  modifyRecord(row_id, updates, old_row_data, original_updates, original_old_row_data) {
    const row = getRowById(this.data, row_id);
    if (!row || !this.context.canModifyRow(row)) return;
    const type = OPERATION_TYPE.MODIFY_RECORD;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      row_id,
      updates,
      old_row_data,
      original_updates,
      original_old_row_data,
    });
    this.applyOperation(operation);
  }

  modifyRecords(row_ids, id_row_updates, id_original_row_updates, id_old_row_data, id_original_old_row_data, is_copy_paste) {
    const originalRows = getRowsByIds(this.data, row_ids);
    let valid_row_ids = [];
    let valid_id_row_updates = {};
    let valid_id_original_row_updates = {};
    let valid_id_old_row_data = {};
    let valid_id_original_old_row_data = {};
    let id_obj_id = {};
    originalRows.forEach(row => {
      if (!row || !this.context.canModifyRow(row)) {
        return;
      }
      const rowId = row._id;
      valid_row_ids.push(rowId);
      valid_id_row_updates[rowId] = id_row_updates[rowId];
      id_obj_id[rowId] = row._obj_id;
      valid_id_original_row_updates[rowId] = id_original_row_updates[rowId];
      valid_id_old_row_data[rowId] = id_old_row_data[rowId];
      valid_id_original_old_row_data[rowId] = id_original_old_row_data[rowId];
    });

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
      id_obj_id: id_obj_id
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

  // column
  insertColumn = (name, columnType, { key, data }) => {
    const operationType = OPERATION_TYPE.INSERT_COLUMN;
    const operation = this.createOperation({
      type: operationType, repo_id: this.repoId, name, column_type: columnType, key, data
    });
    this.applyOperation(operation);
  };

  deleteColumn = (columnKey, column) => {
    const type = OPERATION_TYPE.DELETE_COLUMN;
    const operation = this.createOperation({
      type, repo_id: this.repoId, column_key: columnKey,
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

}

export default Store;
