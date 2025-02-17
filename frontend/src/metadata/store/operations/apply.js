import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { UTC_FORMAT_DEFAULT, PRIVATE_COLUMN_KEY } from '../../constants';
import { OPERATION_TYPE } from './constants';
import Column from '../../model/column';
import View from '../../model/metadata/view';
import { getColumnOriginName } from '../../utils/column';
import { getFileNameFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../utils/cell';

dayjs.extend(utc);

export default function apply(data, operation) {
  const { op_type } = operation;

  const updateDataByModifyRecords = ({ id_original_row_updates = {}, id_row_updates = {} } = {}) => {
    const { rows } = data;
    const modifyTime = dayjs().utc().format(UTC_FORMAT_DEFAULT);
    const modifier = window.sfMetadataContext.getUsername();
    let updatedRows = [...rows];

    rows.forEach((row, index) => {
      const { _id: rowId } = row;
      const originalRowUpdates = id_original_row_updates[rowId];
      const rowUpdates = id_row_updates[rowId];
      if (rowUpdates || originalRowUpdates) {
        const updatedRow = Object.assign({}, row, rowUpdates, originalRowUpdates, {
          '_mtime': modifyTime,
          '_last_modifier': modifier,
        });
        updatedRows[index] = updatedRow;
        data.id_row_map[rowId] = updatedRow;
      }
    });

    data.rows = updatedRows;
  };

  const updateDataByDeleteRecords = (deletedIds) => {
    const idNeedDeletedMap = deletedIds.reduce((currIdNeedDeletedMap, rowId) => ({ ...currIdNeedDeletedMap, [rowId]: true }), {});
    data.rows = data.rows.filter((row) => !idNeedDeletedMap[row._id]);

    // delete rows in id_row_map
    deletedIds.forEach(rowId => {
      delete data.id_row_map[rowId];
    });

    data.row_ids = data.row_ids.filter(row_id => !idNeedDeletedMap[row_id]);
  };

  switch (op_type) {
    case OPERATION_TYPE.MODIFY_RECORDS: {
      const { id_original_row_updates, id_row_updates } = operation;
      updateDataByModifyRecords({ id_original_row_updates, id_row_updates });
      return data;
    }
    case OPERATION_TYPE.DELETE_RECORDS: {
      const { rows_ids } = operation;
      updateDataByDeleteRecords(rows_ids);
      return data;
    }
    case OPERATION_TYPE.RESTORE_RECORDS: {
      const { original_rows } = operation;
      const currentTime = dayjs().utc().format(UTC_FORMAT_DEFAULT);
      const username = window.sfMetadataContext.getUsername();
      let insertRows = [];
      original_rows.forEach(row => {
        const insertRow = {
          ...row,
          _ctime: currentTime,
          _mtime: currentTime,
          _creator: username,
          _last_modifier: username,
        };
        insertRows.push(insertRow);
        data.id_row_map[row._id] = insertRow;
      });
      data.rows.push(insertRows);
      return data;
    }
    case OPERATION_TYPE.LOCK_RECORD_VIA_BUTTON: {
      const { row_id } = operation;
      const { rows } = data;
      const updatedRowIndex = rows.findIndex(row => row_id === row._id);
      if (updatedRowIndex < 0) return data;
      const updatedRow = { ...rows[updatedRowIndex], _locked: true };
      data.rows[updatedRowIndex] = updatedRow;
      data.id_row_map[row_id] = updatedRow;
      return data;
    }
    case OPERATION_TYPE.MODIFY_RECORD_VIA_BUTTON: {
      const { row_id, original_updates } = operation;
      const { rows } = data;
      const updatedRowIndex = rows.findIndex(row => row_id === row._id);
      if (updatedRowIndex < 0) {
        return data;
      }
      const modifyTime = dayjs().utc().format(UTC_FORMAT_DEFAULT);
      const modifier = window.sfMetadataContext.getUsername();
      const updatedRow = Object.assign({},
        rows[updatedRowIndex],
        original_updates,
        { '_mtime': modifyTime, '_last_modifier': modifier },
      );
      data.rows[updatedRowIndex] = updatedRow;
      data.id_row_map[row_id] = updatedRow;
      return data;
    }
    case OPERATION_TYPE.MODIFY_LOCAL_RECORD: {
      const { row_id, parent_dir = '', file_name = '', updates } = operation;
      const { rows } = data;
      const modifyTime = dayjs().utc().format(UTC_FORMAT_DEFAULT);
      const modifier = window.sfMetadataContext.getUsername();
      let updatedRows = [...rows];
      rows.forEach((row, index) => {
        const rowId = getRecordIdFromRecord(row);
        const parentDir = getParentDirFromRecord(row);
        const fileName = getFileNameFromRecord(row);
        if ((rowId === row_id || (parentDir === parent_dir && fileName === file_name)) && updates) {
          const updatedRow = Object.assign({}, row, updates, {
            '_mtime': modifyTime,
            '_last_modifier': modifier,
          });
          updatedRows[index] = updatedRow;
          data.id_row_map[rowId] = updatedRow;
        }
      });

      data.rows = updatedRows;
      return data;
    }
    case OPERATION_TYPE.MOVE_RECORD: {
      const { update_data } = operation;
      const {
        modify_row_ids: updateRowIds,
        modify_id_row_updates: idRowUpdates,
        delete_row_ids: deletedRowIds,
      } = update_data;

      if (Array.isArray(updateRowIds) && updateRowIds.length > 0) {
        updateDataByModifyRecords({ id_row_updates: idRowUpdates });
      }

      if (Array.isArray(deletedRowIds) && deletedRowIds.length > 0) {
        updateDataByDeleteRecords(deletedRowIds);
      }
      return data;
    }
    case OPERATION_TYPE.MODIFY_FILTERS: {
      const { filter_conjunction, filters, basic_filters } = operation;
      data.view.filter_conjunction = filter_conjunction;
      data.view.filters = filters;
      data.view.basic_filters = basic_filters;
      return data;
    }
    case OPERATION_TYPE.MODIFY_SORTS: {
      const { sorts } = operation;
      data.view.sorts = sorts;
      return data;
    }
    case OPERATION_TYPE.MODIFY_GROUPBYS: {
      const { groupbys } = operation;
      data.view.groupbys = groupbys;
      return data;
    }
    case OPERATION_TYPE.MODIFY_HIDDEN_COLUMNS: {
      const { hidden_columns } = operation;
      data.view.hidden_columns = hidden_columns;
      return data;
    }
    case OPERATION_TYPE.MODIFY_LOCAL_VIEW: {
      const { update } = operation;
      data.view = { ...data.view, ...update };
      return data;
    }
    case OPERATION_TYPE.INSERT_COLUMN: {
      const { column } = operation;
      const newColumn = new Column(column);
      data.columns.push(newColumn);
      data.view = new View(data.view, data.columns);
      data.key_column_map[newColumn.key] = newColumn;
      return data;
    }
    case OPERATION_TYPE.DELETE_COLUMN: {
      const { column_key } = operation;
      const newColumns = data.columns.slice(0);
      const columnIndex = newColumns.findIndex(column => column.key === column_key);
      const deletedColumn = data.columns[columnIndex];
      if (columnIndex !== -1) {
        newColumns.splice(columnIndex, 1);
        data.columns = newColumns;
        data.view = new View(data.view, data.columns);

        // Delete invalid file attribute data
        const columnOriginName = getColumnOriginName(deletedColumn);
        let rows = [];
        let id_row_map = {};
        data.rows.forEach(row => {
          delete row[columnOriginName];
          const id = getRecordIdFromRecord(row);
          rows.push(row);
          id_row_map[id] = row;
        });
        data.id_row_map = id_row_map;
        delete data.key_column_map[column_key];
      }
      return data;
    }
    case OPERATION_TYPE.RENAME_COLUMN: {
      const { column_key, new_name } = operation;
      const columnIndex = data.columns.findIndex(column => column.key === column_key);
      if (columnIndex !== -1) {
        const newColumn = new Column({ ...data.columns[columnIndex], name: new_name });
        data.columns[columnIndex] = newColumn;
        data.key_column_map[column_key] = newColumn;
      }
      data.view = new View(data.view, data.columns);
      return data;
    }
    case OPERATION_TYPE.MODIFY_COLUMN_DATA:
    case OPERATION_TYPE.MODIFY_LOCAL_COLUMN_DATA: {
      const { column_key, new_data } = operation;
      const columnIndex = data.columns.findIndex(column => column.key === column_key);
      if (columnIndex !== -1) {
        const oldColumn = data.columns[columnIndex];
        const newColumn = new Column({ ...oldColumn, data: { ...oldColumn.data, ...new_data } });
        data.columns[columnIndex] = newColumn;
        data.key_column_map[column_key] = newColumn;
      }
      data.view = new View(data.view, data.columns);
      return data;
    }
    case OPERATION_TYPE.MODIFY_COLUMN_WIDTH: {
      const { column_key, new_width } = operation;
      const columnIndex = data.columns.findIndex(column => column.key === column_key);
      if (columnIndex !== -1) {
        const oldColumn = data.columns[columnIndex];
        const newColumn = new Column({ ...oldColumn, width: new_width });
        data.columns[columnIndex] = newColumn;
      }
      data.view = new View(data.view, data.columns);
      return data;
    }
    case OPERATION_TYPE.MODIFY_COLUMN_ORDER: {
      const { new_columns_keys } = operation;
      data.view = new View({ ...data.view, columns_keys: new_columns_keys }, data.columns);
      return data;
    }
    case OPERATION_TYPE.MODIFY_SETTINGS: {
      const { settings } = operation;
      data.view.settings = settings;
      return data;
    }

    // face table op
    case OPERATION_TYPE.RENAME_PEOPLE_NAME: {
      const { people_id, new_name } = operation;
      const { rows } = data;
      let updatedRows = [...rows];
      rows.forEach((row, index) => {
        const { _id: rowId } = row;
        if (rowId === people_id) {
          const updatedRow = Object.assign({}, row, { _name: new_name });
          updatedRows[index] = updatedRow;
          data.id_row_map[rowId] = updatedRow;
        }
      });
      data.rows = updatedRows;
      return data;
    }
    case OPERATION_TYPE.DELETE_PEOPLE_PHOTOS: {
      const { people_id, deleted_photos } = operation;
      const { rows } = data;
      const idNeedDeletedMap = deleted_photos.reduce((currIdNeedDeletedMap, rowId) => ({ ...currIdNeedDeletedMap, [rowId]: true }), {});
      let updatedRows = [...rows];
      rows.forEach((row, index) => {
        const { _id: rowId, _photo_links: photoLinks } = row;
        if (rowId === people_id) {
          const updatedRow = Object.assign({}, row, { _photo_links: photoLinks.filter(p => !idNeedDeletedMap[p.row_id]) });
          if (updatedRow._photo_links.length === 0) {
            updatedRows.splice(index, 1);
            delete data.id_row_map[rowId];
          } else {
            updatedRows[index] = updatedRow;
            data.id_row_map[rowId] = updatedRow;
          }
        }
      });
      data.rows = updatedRows;
      data.recordsCount = updatedRows.length;
      return data;
    }
    case OPERATION_TYPE.ADD_PEOPLE_PHOTOS: {
      const { people_id, old_people_id, added_photos } = operation;
      const { rows } = data;
      const idNeedDeletedMap = added_photos.reduce((currIdNeedDeletedMap, rowId) => ({ ...currIdNeedDeletedMap, [rowId]: true }), {});
      let updatedRows = [...rows];
      rows.forEach((row, index) => {
        const { _id: rowId, _photo_links: photoLinks } = row;
        if (rowId === old_people_id) {
          const updatedRow = Object.assign({}, row, { _photo_links: photoLinks.filter(p => !idNeedDeletedMap[p.row_id]) });
          if (updatedRow._photo_links.length === 0) {
            updatedRows.splice(index, 1);
            delete data.id_row_map[rowId];
          } else {
            updatedRows[index] = updatedRow;
            data.id_row_map[rowId] = updatedRow;
          }
        } else if (rowId === people_id) {
          const updatedRow = Object.assign({}, row, { _photo_links: [...photoLinks, ...added_photos.map(rowId => ({ row_id: rowId, display_name: '' }))] });
          updatedRows[index] = updatedRow;
          data.id_row_map[rowId] = updatedRow;
        }
      });
      data.rows = updatedRows;
      data.recordsCount = updatedRows.length;
      return data;
    }
    case OPERATION_TYPE.REMOVE_PEOPLE_PHOTOS: {
      const { people_id, removed_photos } = operation;
      const { rows } = data;
      const idNeedDeletedMap = removed_photos.reduce((currIdNeedDeletedMap, rowId) => ({ ...currIdNeedDeletedMap, [rowId]: true }), {});
      let updatedRows = [...rows];
      rows.forEach((row, index) => {
        const { _id: rowId, _photo_links: photoLinks } = row;
        if (rowId === people_id) {
          const updatedRow = Object.assign({}, row, { _photo_links: photoLinks.filter(p => !idNeedDeletedMap[p.row_id]) });
          if (updatedRow._photo_links.length === 0) {
            updatedRows.splice(index, 1);
            delete data.id_row_map[rowId];
          } else {
            updatedRows[index] = updatedRow;
            data.id_row_map[rowId] = updatedRow;
          }
        }
      });
      data.rows = updatedRows;
      data.recordsCount = updatedRows.length;
      return data;
    }

    // tags
    case OPERATION_TYPE.UPDATE_FILE_TAGS: {
      const { file_tags_data: filesTagsData } = operation;
      const { rows } = data;
      let updateMap = {};
      Array.isArray(filesTagsData) && filesTagsData.forEach(fileTags => {
        const { record_id, tags } = fileTags;
        const value = tags ? tags.map(tagId => ({ row_id: tagId })) : [];
        updateMap[record_id] = value;
      });
      let updatedRows = [...rows];
      rows.forEach((row, index) => {
        const { _id: rowId } = row;
        if (updateMap[rowId]) {
          const updatedRow = Object.assign({}, row, { [PRIVATE_COLUMN_KEY.TAGS]: updateMap[rowId] });
          updatedRows[index] = updatedRow;
          data.id_row_map[rowId] = updatedRow;
        }
      });
      data.rows = updatedRows;
      return data;
    }

    default: {
      return data;
    }
  }
}
