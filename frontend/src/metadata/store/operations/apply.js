import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { UTC_FORMAT_DEFAULT } from '../../constants';
import { OPERATION_TYPE } from './constants';
import Column from '../../model/metadata/column';
import View from '../../model/metadata/view';

dayjs.extend(utc);

export default function apply(data, operation) {
  const { op_type } = operation;

  switch (op_type) {

    case OPERATION_TYPE.MODIFY_RECORD: {
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
    case OPERATION_TYPE.MODIFY_RECORDS: {
      const { id_original_row_updates, id_row_updates } = operation;
      const { rows } = data;
      const modifyTime = dayjs().utc().format(UTC_FORMAT_DEFAULT);
      const modifier = window.sfMetadataContext.getUsername();
      let updatedRows = [...rows];
      rows.forEach((row, index) => {
        const rowId = row._id;
        const originalRowUpdates = id_original_row_updates[rowId];
        const rowUpdates = id_row_updates[rowId];
        if (!rowUpdates && !originalRowUpdates) return;
        const updatedRow = Object.assign({}, row, rowUpdates, originalRowUpdates, {
          '_mtime': modifyTime,
          '_last_modifier': modifier,
        });
        updatedRows[index] = updatedRow;
        data.id_row_map[rowId] = updatedRow;
      });
      data.rows = updatedRows;
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
    case OPERATION_TYPE.INSERT_COLUMN: {
      const { column } = operation;
      const newColumn = new Column(column);
      data.columns.push(newColumn);
      data.view = new View(data.view, data.columns);
      return data;
    }
    case OPERATION_TYPE.DELETE_COLUMN: {
      const { column_key } = operation;
      const newColumns = data.columns.slice(0);
      const columnIndex = newColumns.findIndex(column => column.key === column_key);
      if (columnIndex !== -1) {
        newColumns.splice(columnIndex, 1);
        data.columns = newColumns;
        data.view = new View(data.view, data.columns);
      }
      return data;
    }
    case OPERATION_TYPE.RENAME_COLUMN: {
      const { column_key, new_name } = operation;
      const columnIndex = data.columns.findIndex(column => column.key === column_key);
      if (columnIndex !== -1) {
        const newColumn = new Column({ ...data.columns[columnIndex], name: new_name });
        data.columns[columnIndex] = newColumn;
      }
      data.view = new View(data.view, data.columns);
      return data;
    }
    case OPERATION_TYPE.MODIFY_COLUMN_DATA: {
      const { column_key, new_data } = operation;
      const columnIndex = data.columns.findIndex(column => column.key === column_key);
      if (columnIndex !== -1) {
        const oldColumn = data.columns[columnIndex];
        const newColumn = new Column({ ...oldColumn, data: { ...oldColumn.data, ...new_data } });
        data.columns[columnIndex] = newColumn;
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
    default: {
      return data;
    }
  }
}
