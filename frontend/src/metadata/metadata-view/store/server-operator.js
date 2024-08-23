import { OPERATION_TYPE } from './operations';
import { getColumnByKey } from '../_basic';
import { gettext } from '../utils';

const MAX_LOAD_RECORDS = 100;

class ServerOperator {

  applyOperation(operation, callback) {
    const { op_type } = operation;

    switch (op_type) {
      case OPERATION_TYPE.MODIFY_RECORD: {
        const { repo_id, row_id, updates } = operation;
        const rowsData = [{ record_id: row_id, record: updates }];
        window.sfMetadataContext.modifyRecords(repo_id, rowsData).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify record') });
        });
        break;
      }
      case OPERATION_TYPE.MODIFY_RECORDS: {
        const { repo_id, row_ids, id_row_updates, is_copy_paste, id_obj_id } = operation;
        const rowsData = row_ids.map(rowId => {
          return { record_id: rowId, record: id_row_updates[rowId], obj_id: id_obj_id[rowId] };
        });
        window.sfMetadataContext.modifyRecords(repo_id, rowsData, is_copy_paste).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify records') });
        });
        break;
      }
      case OPERATION_TYPE.RESTORE_RECORDS: {
        const { repo_id, rows_data } = operation;
        if (!Array.isArray(rows_data) || rows_data.length === 0) {
          callback({ error: gettext('Failed to restore records') });
          break;
        }
        window.sfMetadataContext.restoreRows(repo_id, rows_data).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to restore records') });
        });
        break;
      }
      case OPERATION_TYPE.RELOAD_RECORDS: {
        callback({ operation });
        break;
      }
      case OPERATION_TYPE.INSERT_COLUMN: {
        const { repo_id, name, column_type, key, data } = operation;
        window.sfMetadataContext.insertColumn(repo_id, name, column_type, { key, data }).then(res => {
          operation.column = res.data.column;
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to insert property') });
        });
        break;
      }
      case OPERATION_TYPE.DELETE_COLUMN: {
        const { repo_id, column_key } = operation;
        window.sfMetadataContext.deleteColumn(repo_id, column_key).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to delete property') });
        });
        break;
      }
      case OPERATION_TYPE.RENAME_COLUMN: {
        const { repo_id, column_key, new_name } = operation;
        window.sfMetadataContext.renameColumn(repo_id, column_key, new_name).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to rename property') });
        });
        break;
      }
      case OPERATION_TYPE.MODIFY_COLUMN_DATA: {
        const { repo_id, column_key, new_data } = operation;
        window.sfMetadataContext.modifyColumnData(repo_id, column_key, new_data).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify property data') });
        });
        break;
      }
      case OPERATION_TYPE.MODIFY_COLUMN_WIDTH: {
        const { column_key, new_width } = operation;
        try {
          const oldValue = window.sfMetadataContext.localStorage.getItem('columns_width') || {};
          window.sfMetadataContext.localStorage.setItem('columns_width', { ...oldValue, [column_key]: new_width });
          callback({ operation });
        } catch {
          callback({ error: gettext('Failed to modify property width') });
        }
        break;
      }
      case OPERATION_TYPE.MODIFY_COLUMN_ORDER: {
        const { repo_id, view_id, new_columns_keys } = operation;
        window.sfMetadataContext.modifyView(repo_id, view_id, { columns_keys: new_columns_keys }).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify property order') });
        });
        break;
      }
      case OPERATION_TYPE.MODIFY_FILTERS: {
        const { repo_id, view_id, filter_conjunction, filters } = operation;
        window.sfMetadataContext.modifyView(repo_id, view_id, { filters, filter_conjunction }).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify filter') });
        });
        break;
      }
      case OPERATION_TYPE.MODIFY_SORTS: {
        const { repo_id, view_id, sorts } = operation;
        window.sfMetadataContext.modifyView(repo_id, view_id, { sorts }).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify sort') });
        });
        break;
      }
      case OPERATION_TYPE.MODIFY_GROUPBYS: {
        const { repo_id, view_id, groupbys } = operation;
        window.sfMetadataContext.modifyView(repo_id, view_id, { groupbys }).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify group') });
        });
        break;
      }
      case OPERATION_TYPE.MODIFY_HIDDEN_COLUMNS: {
        const { repo_id, view_id, hidden_columns } = operation;
        window.sfMetadataContext.modifyView(repo_id, view_id, { hidden_columns }).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify hidden columns') });
        });
        break;
      }
      default: {
        break;
      }
    }
  }

  checkReloadRecordsOperation = (operation) => {
    const { op_type } = operation;
    switch (op_type) {
      case OPERATION_TYPE.RELOAD_RECORDS: {
        return true;
      }
      default: {
        return false;
      }
    }
  };

  handleReloadRecords(table, operation, callback) {
    const { repo_id: repoId } = operation;
    const { relatedColumnKeyMap } = this.getOperationRelatedColumns(table, operation);
    const isReloadRecordsOp = this.checkReloadRecordsOperation(operation);
    if (!isReloadRecordsOp) return;

    const rowsIds = this.getOperatedRowsIds(operation);
    this.asyncReloadRecords(rowsIds, repoId, relatedColumnKeyMap, callback);
  }

  asyncReloadRecords(rowsIds, repoId, relatedColumnKeyMap, callback) {
    if (!Array.isArray(rowsIds) || rowsIds.length === 0) return;
    const restRowsIds = [...rowsIds];
    const currentRowsIds = restRowsIds.splice(0, MAX_LOAD_RECORDS);

    window.sfMetadataContext.getRowsByIds(repoId, currentRowsIds).then(res => {
      if (!res || !res.data || !res.data.results) {
        this.asyncReloadRecords(restRowsIds, repoId, relatedColumnKeyMap, callback);
        return;
      }
      const fetchedRecords = res.data.results;
      let reloadedRecords = [];
      let idRecordLoadedMap = {};
      let idRecordNotExistMap = {};
      if (fetchedRecords.length > 0) {
        fetchedRecords.forEach((record) => {
          reloadedRecords.push(record);
          idRecordLoadedMap[record._id] = true;
        });
      }
      currentRowsIds.forEach((recordId) => {
        if (!idRecordLoadedMap[recordId]) {
          idRecordNotExistMap[recordId] = true;
        }
      });
      callback({
        reloadedRecords,
        idRecordNotExistMap,
        relatedColumnKeyMap,
      });
      this.asyncReloadRecords(restRowsIds, repoId, relatedColumnKeyMap, callback);
    }).catch (error => {
      // for debug
      // eslint-disable-next-line no-console
      console.log(error);
      this.asyncReloadRecords(restRowsIds, repoId, relatedColumnKeyMap, callback);
    });
  }

  getOperationRelatedColumns(table, operation) {
    const { op_type } = operation;
    let relatedColumnKeys;
    switch (op_type) {
      case OPERATION_TYPE.MODIFY_RECORDS: {
        const { id_original_row_updates } = operation;
        relatedColumnKeys = this.getRelatedColumnKeysFromRecordUpdates(id_original_row_updates);
        break;
      }
      case OPERATION_TYPE.RELOAD_RECORDS: {
        const { available_columns } = table.view;
        let relatedColumnKeyMap = {};
        available_columns.forEach(column => {
          const { key } = column;
          relatedColumnKeyMap[key] = true;
        });
        return {
          relatedColumnKeyMap,
          relatedColumns: available_columns,
        };
      }
      case OPERATION_TYPE.MODIFY_RECORD_VIA_BUTTON: {
        const { row_id, original_updates } = operation;
        relatedColumnKeys = this.getRelatedColumnKeysFromRecordUpdates({ [row_id]: original_updates });
        break;
      }
      default: {
        relatedColumnKeys = [];
        break;
      }
    }
    return this.getRelatedColumns(relatedColumnKeys, table);
  }

  getOperatedRowsIds(operation) {
    const { op_type } = operation;
    switch (op_type) {
      case OPERATION_TYPE.MODIFY_RECORDS:
      case OPERATION_TYPE.RELOAD_RECORDS: {
        const { row_ids } = operation;
        return Array.isArray(row_ids) ? [...row_ids] : [];
      }
      case OPERATION_TYPE.MODIFY_RECORD_VIA_BUTTON: {
        const { row_id } = operation;
        return row_id ? [row_id] : [];
      }
      default: {
        return [];
      }
    }
  }

  /**
   * @param {array} relatedColumnKeys
   * @param {object} pageData
   * @param {object} table
   * @returns relatedColumnKeyMap, relatedFormulaColumnKeyMap, relatedColumns, relatedFormulaColumns
   */
  getRelatedColumns(relatedColumnKeys, table) {
    if (!relatedColumnKeys || relatedColumnKeys.length === 0) {
      return {
        relatedColumnKeyMap: {},
        relatedColumns: [],
      };
    }
    let relatedColumnKeyMap = {};
    let relatedColumns = [];
    const { available_columns } = table.view;
    relatedColumnKeys.forEach(columnKey => {
      if (!relatedColumnKeyMap[columnKey]) {
        const column = getColumnByKey(available_columns, columnKey);
        if (column) {
          relatedColumnKeyMap[columnKey] = true;
          relatedColumns.push(column);
        }
      }
    });
    return {
      relatedColumnKeyMap,
      relatedColumns,
    };
  }

  /**
   * @param {object} recordUpdates: { [record._id]: { [column.key]: '', ... }, ... }
   * @returns related column keys: [ column.key, ... ]
   */
  getRelatedColumnKeysFromRecordUpdates(recordUpdates) {
    if (!recordUpdates) return [];
    const rowIds = Object.keys(recordUpdates);
    return rowIds.reduce((keys, rowId) => {
      const rowData = recordUpdates[rowId];
      if (rowData) {
        keys.push(...Object.keys(rowData));
      }
      return keys;
    }, []);
  }
}

export default ServerOperator;
