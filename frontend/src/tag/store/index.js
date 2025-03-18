import deepCopy from 'deep-copy';
import dayjs from 'dayjs';
import { getRowById, getRowsByIds } from '../../components/sf-table/utils/table';
import {
  Operation, LOCAL_APPLY_OPERATION_TYPE, NEED_APPLY_AFTER_SERVER_OPERATION, OPERATION_TYPE, UNDO_OPERATION_TYPE,
} from './operations';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER } from '../../metadata/constants';
import DataProcessor from './data-processor';
import ServerOperator from './server-operator';
import LocalOperator from './local-operator';
import TagsData from '../model/tagsData';
import { normalizeColumns } from '../utils/column';
import { getColumnByKey } from '../../components/sf-table/utils/column';
import { ALL_TAGS_SORT, TAGS_DEFAULT_SORT } from '../constants/sort';

class Store {

  constructor(props) {
    this.repoId = props.repoId;
    this.data = null;
    this.context = props.context;
    this.startIndex = 0;
    this.redos = [];
    this.undos = [];
    this.pendingOperations = [];
    this.isSendingOperation = false;
    this.isReadonly = false;
    this.serverOperator = new ServerOperator(this.context);
    this.localOperator = new LocalOperator();
  }

  destroy = () => {
    this.loadTime = '';
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

  async loadTagsData(limit) {
    const res = await this.context.getTags({ start: this.startIndex, limit });
    const rows = res?.data?.results || [];
    const columns = normalizeColumns(res?.data?.metadata);
    const storedSort = window.sfTagsDataContext?.localStorage?.getItem(ALL_TAGS_SORT);
    const sort = storedSort ? JSON.parse(storedSort) : TAGS_DEFAULT_SORT;
    let data = new TagsData({ rows, columns, sort });
    const loadedCount = rows.length;
    data.hasMore = loadedCount === limit;
    this.data = data;
    this.startIndex += loadedCount;
    DataProcessor.run(this.data, { collaborators: [] });
  }

  async load(limit = PER_LOAD_NUMBER) {
    this.loadTime = new Date();
    await this.loadTagsData(limit);
  }

  async reload(limit = PER_LOAD_NUMBER) {
    const currentTime = new Date();
    if (dayjs(currentTime).diff(this.loadTime, 'hours') > 1) {
      this.loadTime = currentTime;
      this.startIndex = 0;
      await this.loadTagsData(limit);
    }
  }

  async loadMore(limit) {
    if (!this.data) return;
    const res = await this.context.getTags({ start: this.startIndex, limit });
    const rows = res?.data?.results || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      this.hasMore = false;
      return;
    }

    this.data = { ...this.data };
    this.data.rows = [...this.data.rows];
    this.data.row_ids = [...this.data.row_ids];
    this.data.rows.push(...rows);
    rows.forEach(record => {
      this.data.row_ids.push(record._id);
      this.data.id_row_map[record._id] = record;
    });
    const loadedCount = rows.length;
    this.data.hasMore = loadedCount === limit;
    this.data.recordsCount = this.data.row_ids.length;
    this.startIndex = this.startIndex + loadedCount;
    DataProcessor.run(this.data, { collaborators: [] });
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
    DataProcessor.run(this.data, { collaborators: [] });
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
    DataProcessor.syncOperationOnData(this.data, operation, { collaborators: [] });
  }

  addTags(tags, { fail_callback, success_callback } = {}) {
    const type = OPERATION_TYPE.ADD_RECORDS;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      rows: tags,
      fail_callback,
      success_callback,
    });
    this.applyOperation(operation);
  }

  addChildTag(tagData, parentTagId, { fail_callback, success_callback } = {}) {
    const type = OPERATION_TYPE.ADD_CHILD_TAG;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      tag_data: tagData,
      parent_tag_id: parentTagId,
      fail_callback,
      success_callback,
    });
    this.applyOperation(operation);
  }

  modifyTags(row_ids, id_row_updates, id_original_row_updates, id_old_row_data, id_original_old_row_data, { fail_callback, success_callback }) {
    const originalRows = getRowsByIds(this.data, row_ids);
    let valid_row_ids = [];
    let valid_id_row_updates = {};
    let valid_id_original_row_updates = {};
    let valid_id_old_row_data = {};
    let valid_id_original_old_row_data = {};
    originalRows.forEach(row => {
      if (row && this.context.canModifyTag(row)) {
        const rowId = row._id;
        valid_row_ids.push(rowId);
        valid_id_row_updates[rowId] = id_row_updates[rowId];
        valid_id_original_row_updates[rowId] = id_original_row_updates[rowId];
        valid_id_old_row_data[rowId] = id_old_row_data[rowId];
        valid_id_original_old_row_data[rowId] = id_original_old_row_data[rowId];
      }
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
      fail_callback,
      success_callback,
    });
    this.applyOperation(operation);
  }

  modifyLocalTags(row_ids, id_row_updates, id_original_row_updates, id_old_row_data, id_original_old_row_data, { fail_callback, success_callback }) {
    const originalRows = getRowsByIds(this.data, row_ids);
    let valid_row_ids = [];
    let valid_id_row_updates = {};
    let valid_id_original_row_updates = {};
    let valid_id_old_row_data = {};
    let valid_id_original_old_row_data = {};
    originalRows.forEach(row => {
      const rowId = row._id;
      valid_row_ids.push(rowId);
      valid_id_row_updates[rowId] = id_row_updates[rowId];
      valid_id_original_row_updates[rowId] = id_original_row_updates[rowId];
      valid_id_old_row_data[rowId] = id_old_row_data[rowId];
      valid_id_original_old_row_data[rowId] = id_original_old_row_data[rowId];
    });

    const type = OPERATION_TYPE.MODIFY_LOCAL_RECORDS;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      row_ids: valid_row_ids,
      id_row_updates: valid_id_row_updates,
      id_original_row_updates: valid_id_original_row_updates,
      id_old_row_data: valid_id_old_row_data,
      id_original_old_row_data: valid_id_original_old_row_data,
      fail_callback,
      success_callback,
    });
    this.applyOperation(operation);
  }

  deleteTags(tag_ids, { fail_callback, success_callback } = {}) {
    const type = OPERATION_TYPE.DELETE_RECORDS;
    if (!Array.isArray(tag_ids) || tag_ids.length === 0) return;
    const validTagIds = Array.isArray(tag_ids) ? tag_ids.filter((tagId) => {
      const tag = getRowById(this.data, tagId);
      return tag && this.context.canModifyTag(tag);
    }) : [];

    const deletedTags = validTagIds.map((tagId) => getRowById(this.data, tagId));

    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      tag_ids: validTagIds,
      deleted_tags: deletedTags,
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

  addTagLinks(column_key, row_id, other_rows_ids, success_callback, fail_callback) {
    const type = OPERATION_TYPE.ADD_TAG_LINKS;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      column_key,
      row_id,
      other_rows_ids,
      success_callback,
      fail_callback,
    });
    this.applyOperation(operation);
  }

  deleteTagLinks(column_key, row_id, other_rows_ids, success_callback, fail_callback) {
    const type = OPERATION_TYPE.DELETE_TAG_LINKS;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      column_key,
      row_id,
      other_rows_ids,
      success_callback,
      fail_callback,
    });
    this.applyOperation(operation);
  }

  deleteTagsLinks(column_key, id_linked_rows_ids_map, success_callback, fail_callback) {
    const type = OPERATION_TYPE.DELETE_TAGS_LINKS;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      column_key,
      id_linked_rows_ids_map,
      success_callback,
      fail_callback,
    });
    this.applyOperation(operation);
  }

  mergeTags(target_tag_id, merged_tags_ids, success_callback, fail_callback) {
    const type = OPERATION_TYPE.MERGE_TAGS;
    const operation = this.createOperation({
      type,
      repo_id: this.repoId,
      target_tag_id,
      merged_tags_ids,
      success_callback,
      fail_callback,
    });
    this.applyOperation(operation);
  }

  modifyColumnWidth(columnKey, newWidth) {
    const type = OPERATION_TYPE.MODIFY_COLUMN_WIDTH;
    const column = getColumnByKey(this.data.columns, columnKey);
    const operation = this.createOperation({
      type, repo_id: this.repoId, column_key: columnKey, new_width: newWidth, old_width: column.width
    });
    this.applyOperation(operation);
  }

  modifyLocalFileTags(file_id, tags_ids) {
    const type = OPERATION_TYPE.MODIFY_LOCAL_FILE_TAGS;
    const operation = this.createOperation({ type, file_id, tags_ids });
    this.applyOperation(operation);
  }

  modifyTagsSort(sort) {
    const type = OPERATION_TYPE.MODIFY_TAGS_SORT;
    const operation = this.createOperation({ type, sort });
    this.applyOperation(operation);
  }
}

export default Store;
