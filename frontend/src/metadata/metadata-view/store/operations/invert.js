import deepCopy from 'deep-copy';
import Operation from './model';
import { OPERATION_TYPE } from './constants';

function createOperation(op) {
  return new Operation(op);
}

export default function invert(operation) {
  const { op_type } = operation.clone();
  switch (op_type) {
    case OPERATION_TYPE.MODIFY_RECORD: {
      const { page_id, row_id, updates, old_row_data, original_updates, original_old_row_data } = operation;
      return createOperation({
        type: OPERATION_TYPE.MODIFY_RECORD,
        page_id,
        row_id,
        updates: deepCopy(old_row_data),
        old_row_data: deepCopy(updates),
        original_updates: deepCopy(original_old_row_data),
        original_old_row_data: deepCopy(original_updates),
      });
    }
    case OPERATION_TYPE.MODIFY_RECORDS: {
      const {
        page_id, is_copy_paste, row_ids, id_row_updates, id_original_row_updates,
        id_old_row_data, id_original_old_row_data,
      } = operation;
      return createOperation({
        type: OPERATION_TYPE.MODIFY_RECORDS,
        page_id,
        is_copy_paste,
        row_ids: deepCopy(row_ids),
        id_row_updates: deepCopy(id_old_row_data),
        id_original_row_updates: deepCopy(id_original_old_row_data),
        id_old_row_data: deepCopy(id_row_updates),
        id_original_old_row_data: deepCopy(id_original_row_updates),
      });
    }
    case OPERATION_TYPE.RESTORE_RECORDS: {
      const { page_id, rows_data, original_rows, link_infos, upper_row_ids, } = operation;
      const row_ids = rows_data.map(recordData => recordData._id);
      return createOperation({
        type: OPERATION_TYPE.DELETE_RECORDS,
        page_id,
        row_ids,
        deleted_rows: deepCopy(rows_data),
        original_deleted_rows: deepCopy(original_rows),
        deleted_link_infos: deepCopy(link_infos),
        upper_row_ids: deepCopy(upper_row_ids),
      });
    }
    default: {
      break;
    }
  }
}
