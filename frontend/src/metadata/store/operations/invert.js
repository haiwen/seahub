import deepCopy from 'deep-copy';
import Operation from './model';
import { OPERATION_TYPE } from './constants';
import { getColumnOriginName } from '../../utils/column';

function createOperation(op) {
  return new Operation(op);
}

export default function invert(operation) {
  const { op_type } = operation.clone();
  switch (op_type) {
    case OPERATION_TYPE.MODIFY_RECORDS: {
      const {
        repo_id,
        row_ids,
        id_row_updates,
        id_original_row_updates,
        id_old_row_data,
        id_original_old_row_data,
        is_copy_paste,
        is_rename,
        id_obj_id,
        fail_callback,
        success_callback,
      } = operation;
      return createOperation({
        type: OPERATION_TYPE.MODIFY_RECORDS,
        repo_id,
        is_copy_paste,
        row_ids: deepCopy(row_ids),
        id_row_updates: deepCopy(id_old_row_data),
        id_original_row_updates: deepCopy(id_original_old_row_data),
        id_old_row_data: deepCopy(id_row_updates),
        id_original_old_row_data: deepCopy(id_original_row_updates),
        is_rename,
        id_obj_id,
        fail_callback,
        success_callback,
      });
    }
    case OPERATION_TYPE.INSERT_COLUMN: {
      const { repo_id, name, column_type, column_key, data } = operation;
      return createOperation({
        type: OPERATION_TYPE.DELETE_COLUMN,
        repo_id,
        column_key,
        name,
        column_type,
        data,
      });
    }
    case OPERATION_TYPE.DELETE_COLUMN: {
      const { repo_id, column_key, column } = operation;
      return createOperation({
        type: OPERATION_TYPE.INSERT_COLUMN,
        repo_id,
        column_key,
        name: getColumnOriginName(column),
        column_type: column.type,
        data: column.data,
      });
    }
    case OPERATION_TYPE.RENAME_COLUMN: {
      const { repo_id, column_key, new_name, old_name } = operation;
      return createOperation({
        type: OPERATION_TYPE.RENAME_COLUMN,
        repo_id,
        column_key,
        new_name: old_name,
        old_name: new_name,
      });
    }
    case OPERATION_TYPE.MODIFY_COLUMN_DATA: {
      const { repo_id, column_key, new_data, old_data, option_modify_type } = operation;
      return createOperation({
        type: OPERATION_TYPE.MODIFY_COLUMN_DATA,
        repo_id,
        column_key,
        new_data: old_data,
        old_data: new_data,
        option_modify_type,
      });
    }
    case OPERATION_TYPE.MODIFY_COLUMN_WIDTH: {
      const { repo_id, column_key, new_width, old_width } = operation;
      return createOperation({
        type: OPERATION_TYPE.MODIFY_COLUMN_WIDTH,
        repo_id,
        column_key,
        new_width: old_width,
        old_width: new_width,
      });
    }
    case OPERATION_TYPE.MODIFY_COLUMN_ORDER: {
      const { repo_id, view_id, new_columns_keys, old_columns_keys } = operation;
      return createOperation({
        type: OPERATION_TYPE.MODIFY_COLUMN_WIDTH,
        repo_id,
        view_id,
        new_columns_keys: old_columns_keys,
        old_columns_keys: new_columns_keys,
      });
    }
    case OPERATION_TYPE.UPDATE_FILE_TAGS: {
      const { repo_id, file_tags_data } = operation;
      return createOperation({
        type: OPERATION_TYPE.UPDATE_FILE_TAGS,
        repo_id,
        file_tags_data: file_tags_data.map(item => {
          const { record_id, tags, old_tags } = item;
          return {
            record_id,
            tags: old_tags || [],
            old_tags: tags || [],
          };
        })
      });
    }
    default: {
      break;
    }
  }
}
