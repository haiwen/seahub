import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { OPERATION_TYPE } from './operations';
import { getColumnByKey } from '../utils/column';
import { getRowById } from '../utils/table';
import { checkIsDir } from '../utils/row';
import { getFileNameFromRecord, getServerOptions } from '../utils/cell';
import ObjectUtils from '../utils/object-utils';
import { CellType } from '../constants';

const MAX_LOAD_RECORDS = 100;

class ServerOperator {

  applyOperation(operation, data, callback) {
    const { op_type } = operation;

    switch (op_type) {
      case OPERATION_TYPE.MODIFY_RECORDS: {
        const { repo_id, row_ids, id_row_updates, id_original_row_updates, id_original_old_row_data, is_copy_paste, is_rename, id_obj_id } = operation;
        if (is_rename) {
          const rowId = row_ids[0];
          const oldRowData = id_original_old_row_data[rowId];
          const rowUpdates = id_original_row_updates[rowId];
          const oldName = getFileNameFromRecord(oldRowData);
          const newName = getFileNameFromRecord(rowUpdates);
          this.renameFile(newName, oldName, repo_id, rowId, data, {
            fail_callback: (error) => {
              callback({ error });
            },
            success_callback: () => {
              callback({ operation });
            }
          });
          return;
        }
        const recordsData = row_ids.map(rowId => {
          return { record_id: rowId, record: id_row_updates[rowId], obj_id: id_obj_id[rowId] };
        }).filter(recordData => recordData.record && !ObjectUtils.isEmpty(recordData.record));
        if (recordsData.length === 0) {
          callback({ operation });
        } else {
          window.sfMetadataContext.modifyRecords(repo_id, recordsData, is_copy_paste).then(res => {
            callback({ operation });
          }).catch(error => {
            callback({ error: gettext('Failed to modify records') });
          });
        }
        break;
      }
      case OPERATION_TYPE.DELETE_RECORDS: {
        const { repo_id, deleted_rows } = operation;
        const file_names = deleted_rows.map((row) => {
          const { _parent_dir, _name } = row || {};
          if (_parent_dir && _name) {
            return Utils.joinPath(_parent_dir, _name);
          }
          return null;
        }).filter(Boolean);
        window.sfMetadataContext.batchDeleteFiles(repo_id, file_names).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to delete records') });
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
      case OPERATION_TYPE.MOVE_RECORD: {
        const { row_id, repo_id, target_repo_id, dirent, target_parent_path, source_parent_path } = operation;
        seafileAPI.moveDir(repo_id, target_repo_id, target_parent_path, source_parent_path, dirent.name).then(res => {
          operation.task_id = res.data.task_id || null;
          callback({ operation });
        }).catch(error => {
          const row = getRowById(data, row_id);
          const isDir = checkIsDir(row);
          callback({ error: isDir ? gettext('Failed to move folder') : gettext('Failed to move file') });
        });
        break;
      }
      case OPERATION_TYPE.DUPLICATE_RECORD: {
        const { row_id, repo_id, target_repo_id, dirent, target_parent_path, source_parent_path } = operation;
        seafileAPI.copyDir(repo_id, target_repo_id, target_parent_path, source_parent_path, dirent.name).then(res => {
          operation.task_id = res.data.task_id || null;
          callback({ operation });
        }).catch(error => {
          const row = getRowById(data, row_id);
          const isDir = checkIsDir(row);
          callback({ error: isDir ? gettext('Failed to duplicate folder') : gettext('Failed to duplicate file') });
        });
        break;
      }
      case OPERATION_TYPE.INSERT_COLUMN: {
        const { repo_id, name, column_type, column_key, data } = operation;
        window.sfMetadataContext.insertColumn(repo_id, name, column_type, { key: column_key, data }).then(res => {
          operation.column = res.data.column;
          operation.column_key = operation.column.key;
          operation.data = operation.column.data;
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
        const column = getColumnByKey(data.columns, column_key);
        let origin_data = new_data;

        if (column.type === CellType.SINGLE_SELECT) {
          origin_data.options = getServerOptions({ key: column_key, data: origin_data });
        }
        window.sfMetadataContext.modifyColumnData(repo_id, column_key, origin_data).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify property data') });
        });
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
        const { repo_id, view_id, filter_conjunction, filters, basic_filters } = operation;
        window.sfMetadataContext.modifyView(repo_id, view_id, { filters, filter_conjunction, basic_filters }).then(res => {
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
          callback({ error: gettext('Failed to modify hidden properties') });
        });
        break;
      }
      case OPERATION_TYPE.MODIFY_SETTINGS: {
        const { repo_id, view_id, settings } = operation;
        window.sfMetadataContext.modifyView(repo_id, view_id, { settings }).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify settings') });
        });
        break;
      }

      // face table op
      case OPERATION_TYPE.RENAME_PEOPLE_NAME: {
        const { people_id, new_name } = operation;
        window.sfMetadataContext.renamePeople(people_id, new_name).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to modify people name') });
        });
        break;
      }
      case OPERATION_TYPE.REMOVE_PEOPLE_PHOTOS: {
        const { people_id, removed_photos } = operation;
        window.sfMetadataContext.removePeoplePhotos(people_id, removed_photos).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to remove people photos') });
        });
        break;
      }
      case OPERATION_TYPE.ADD_PEOPLE_PHOTOS: {
        const { people_id, added_photos } = operation;
        window.sfMetadataContext.addPeoplePhotos(people_id, added_photos).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to add people photos') });
        });
        break;
      }
      case OPERATION_TYPE.SET_PEOPLE_COVER_PHOTO: {
        const { people_id, selected_photo } = operation;
        window.sfMetadataContext.setPeoplePhoto(people_id, selected_photo).then(res => {
          callback({ operation });
        }).catch(error => {
          callback({ error: gettext('Failed to set people cover photo') });
        });
        break;
      }

      // tags
      case OPERATION_TYPE.UPDATE_FILE_TAGS: {
        const { file_tags_data } = operation;
        let valid_files_tags_data = [];
        file_tags_data.forEach(item => {
          const { record_id, tags } = item;
          valid_files_tags_data.push({ record_id, tags });
        });
        window.sfMetadataContext.updateFileTags(valid_files_tags_data).then(res => {
          const { success: success_record_ids, fail: fail_record_ids } = res.data;
          callback({ operation, success_record_ids, fail_record_ids });
        }).catch(error => {
          callback({ error: gettext('Failed to modify tags') });
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
      const recordData = recordUpdates[rowId];
      if (recordData) {
        keys.push(...Object.keys(recordData));
      }
      return keys;
    }, []);
  }

  renameFile = (newName, oldName, repo_id, rowId, data, { fail_callback, success_callback }) => {
    const row = getRowById(data, rowId);
    if (!row) {
      fail_callback();
      return;
    }

    const { _parent_dir } = row;
    const path = Utils.joinPath(_parent_dir, oldName);

    // rename folder
    if (checkIsDir(row)) {
      seafileAPI.renameDir(repo_id, path, newName).then(() => {
        success_callback();
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        if (errMessage === gettext('Error')) {
          errMessage = gettext('Renaming {name} failed').replace('{name}', oldName);
        }
        fail_callback(errMessage);
      });
      return;
    }

    // rename file
    seafileAPI.renameFile(repo_id, path, newName).then(() => {
      success_callback();
    }).catch((error) => {
      let errMessage = '';
      if (error && error.response.status == 403 && error.response.data && error.response.data['error_msg']) {
        errMessage = error.response.data['error_msg'];
      } else {
        errMessage = Utils.getErrorMsg(error);
      }
      if (errMessage === gettext('Error')) {
        errMessage = gettext('Renaming {name} failed').replace('{name}', oldName);
      }
      fail_callback(errMessage);
    });
  };
}

export default ServerOperator;
