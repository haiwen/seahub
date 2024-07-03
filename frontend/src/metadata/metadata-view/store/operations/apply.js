import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { UTC_FORMAT_DEFAULT } from '../../_basic';
import { OPERATION_TYPE } from './constants';

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
      const { id_original_row_updates } = operation;
      const { rows } = data;
      const modifyTime = dayjs().utc().format(UTC_FORMAT_DEFAULT);
      const modifier = window.sfMetadataContext.getUsername();
      let updatedRows = [...rows];
      rows.forEach((row, index) => {
        const rowId = row._id;
        const rowUpdates = id_original_row_updates[rowId];
        if (!rowUpdates) {
          return;
        }
        const updatedRow = Object.assign({}, row, rowUpdates, {
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
      const { filter_conjunction, filters } = operation;
      data.view.filter_conjunction = filter_conjunction;
      data.view.filters = filters;
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
      const { shown_column_keys } = operation;
      data.view.shown_column_keys = shown_column_keys;
      return data;
    }
    default: {
      return data;
    }
  }
}
