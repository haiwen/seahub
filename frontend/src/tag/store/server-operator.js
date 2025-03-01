import { gettext } from '../../utils/constants';
import { OPERATION_TYPE } from './operations';
import { getColumnByKey } from '../../metadata/utils/column';
import ObjectUtils from '../../utils/object';
import { PRIVATE_COLUMN_KEY } from '../constants';

const MAX_LOAD_RECORDS = 100;

class ServerOperator {

  constructor(context) {
    this.context = context;
  }

  applyOperation(operation, data, callback) {
    const { op_type } = operation;

    switch (op_type) {
      case OPERATION_TYPE.ADD_RECORDS: {
        const { rows } = operation;
        this.context.addTags(rows).then(res => {
          const tags = res?.data?.tags || [];
          operation.tags = tags;
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to add tags') });
        });
        break;
      }
      case OPERATION_TYPE.ADD_CHILD_TAG: {
        const { tag_data, parent_tag_id } = operation;
        this.context.addTags([tag_data]).then(res => {
          const tags = res?.data?.tags || [];
          const childTag = tags[0];
          if (!childTag) {
            callback({ error: gettext('Failed to add tags') });
            return;
          }

          operation.tag = childTag;

          // set parent tag for new child tag
          const id_linked_rows_ids_map = { [childTag._id]: [parent_tag_id] };
          this.context.addTagLinks(PRIVATE_COLUMN_KEY.PARENT_LINKS, id_linked_rows_ids_map);
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to add tags') });
        });
        break;
      }
      case OPERATION_TYPE.MODIFY_RECORDS: {
        const { row_ids, id_row_updates } = operation;
        const recordsData = row_ids.map(rowId => {
          return { tag_id: rowId, tag: id_row_updates[rowId] };
        }).filter(tagData => tagData.tag && !ObjectUtils.isEmpty(tagData.tag));
        if (recordsData.length === 0) {
          callback({ operation });
          break;
        }
        this.context.modifyTags(recordsData).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify tags') });
        });
        break;
      }
      case OPERATION_TYPE.DELETE_RECORDS: {
        const { tag_ids } = operation;
        this.context.deleteTags(tag_ids).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to delete tags') });
        });
        break;
      }
      case OPERATION_TYPE.ADD_TAG_LINKS: {
        const { column_key, row_id, other_rows_ids } = operation;
        const id_linked_rows_ids_map = {
          [row_id]: other_rows_ids,
        };
        this.context.addTagLinks(column_key, id_linked_rows_ids_map).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to add linked tags') });
        });
        break;
      }
      case OPERATION_TYPE.DELETE_TAG_LINKS: {
        const { column_key, row_id, other_rows_ids } = operation;
        const id_linked_rows_ids_map = {
          [row_id]: other_rows_ids,
        };
        this.context.deleteTagLinks(column_key, id_linked_rows_ids_map).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to delete linked tags') });
        });
        break;
      }
      case OPERATION_TYPE.DELETE_TAGS_LINKS: {
        const { column_key, id_linked_rows_ids_map } = operation;
        this.context.deleteTagLinks(column_key, id_linked_rows_ids_map).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to delete linked tags') });
        });
        break;
      }
      case OPERATION_TYPE.MERGE_TAGS: {
        const { target_tag_id, merged_tags_ids } = operation;
        this.context.mergeTags(target_tag_id, merged_tags_ids).then((res) => {
          callback({ operation });
        }).catch((error) => {
          callback({ error: gettext('Failed to merge tags') });
        });
        break;
      }
      case OPERATION_TYPE.RESTORE_RECORDS: {
        const { repo_id, rows_data } = operation;
        if (!Array.isArray(rows_data) || rows_data.length === 0) {
          callback({ error: gettext('Failed to restore tags') });
          break;
        }
        window.sfMetadataContext.restoreRows(repo_id, rows_data).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to restore tags') });
        });
        break;
      }
      case OPERATION_TYPE.RELOAD_RECORDS: {
        callback({ operation });
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
        let relatedColumnKeyMap = {};
        table.columns.forEach(column => {
          const { key } = column;
          relatedColumnKeyMap[key] = true;
        });
        return {
          relatedColumnKeyMap,
          relatedColumns: table.columns,
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
    relatedColumnKeys.forEach(columnKey => {
      if (!relatedColumnKeyMap[columnKey]) {
        const column = getColumnByKey(table.columns, columnKey);
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
      const recordData = recordUpdates[rowId];
      if (recordData) {
        keys.push(...Object.keys(recordData));
      }
      return keys;
    }, []);
  }

}

export default ServerOperator;
