export const OPERATION_TYPE = {
  MODIFY_RECORD: 'modify_record',
  MODIFY_RECORDS: 'modify_records',
  RESTORE_RECORDS: 'restore_records',
  RELOAD_RECORDS: 'reload_records',
  MODIFY_FILTERS: 'modify_filters',
  MODIFY_SORTS: 'modify_sorts',
  MODIFY_GROUPBYS: 'modify_groupbys',
  MODIFY_HIDDEN_COLUMNS: 'modify_hidden_columns',
  LOCK_RECORD_VIA_BUTTON: 'lock_record_via_button',
  MODIFY_RECORD_VIA_BUTTON: 'modify_record_via_button',

  // column
  INSERT_COLUMN: 'insert_column',
  DELETE_COLUMN: 'delete_column',
  RENAME_COLUMN: 'rename_column',
  MODIFY_COLUMN_DATA: 'modify_column_data',
};

export const OPERATION_ATTRIBUTES = {
  [OPERATION_TYPE.MODIFY_RECORD]: ['repo_id', 'row_id', 'updates', 'old_row_data', 'original_updates', 'original_old_row_data'],
  [OPERATION_TYPE.MODIFY_RECORDS]: ['repo_id', 'row_ids', 'id_row_updates', 'id_original_row_updates', 'id_old_row_data', 'id_original_old_row_data', 'is_copy_paste'],
  [OPERATION_TYPE.RESTORE_RECORDS]: ['repo_id', 'rows_data', 'original_rows', 'link_infos', 'upper_row_ids'],
  [OPERATION_TYPE.RELOAD_RECORDS]: ['repo_id', 'row_ids'],
  [OPERATION_TYPE.MODIFY_FILTERS]: ['repo_id', 'view_id', 'filter_conjunction', 'filters'],
  [OPERATION_TYPE.MODIFY_SORTS]: ['repo_id', 'view_id', 'sorts'],
  [OPERATION_TYPE.MODIFY_GROUPBYS]: ['repo_id', 'view_id', 'groupbys'],
  [OPERATION_TYPE.MODIFY_HIDDEN_COLUMNS]: ['repo_id', 'view_id', 'hidden_columns'],
  [OPERATION_TYPE.LOCK_RECORD_VIA_BUTTON]: ['repo_id', 'row_id', 'button_column_key'],
  [OPERATION_TYPE.MODIFY_RECORD_VIA_BUTTON]: ['repo_id', 'row_id', 'updates', 'old_row_data', 'original_updates', 'original_old_row_data', 'button_column_key'],
  [OPERATION_TYPE.INSERT_COLUMN]: ['repo_id', 'name', 'column_type', 'key', 'data'],
  [OPERATION_TYPE.RENAME_COLUMN]: ['repo_id', 'column_key', 'new_name', 'old_name'],
  [OPERATION_TYPE.MODIFY_COLUMN_DATA]: ['repo_id', 'column_key', 'new_data', 'old_data'],
  [OPERATION_TYPE.DELETE_COLUMN]: ['repo_id', 'column_key', 'column'],
};

export const UNDO_OPERATION_TYPE = [
  // OPERATION_TYPE.MODIFY_RECORD,
  // OPERATION_TYPE.MODIFY_RECORDS,
  // OPERATION_TYPE.RESTORE_RECORDS,
  // OPERATION_TYPE.INSERT_COLUMN,
];

// only apply operation on the local
export const LOCAL_APPLY_OPERATION_TYPE = [

];

// apply operation after exec operation on the server
export const NEED_APPLY_AFTER_SERVER_OPERATION = [
  OPERATION_TYPE.MODIFY_RECORD,
  OPERATION_TYPE.MODIFY_RECORDS,
  OPERATION_TYPE.MODIFY_FILTERS,
  OPERATION_TYPE.MODIFY_SORTS,
  OPERATION_TYPE.MODIFY_GROUPBYS,
  OPERATION_TYPE.MODIFY_HIDDEN_COLUMNS,
  OPERATION_TYPE.INSERT_COLUMN,
  OPERATION_TYPE.DELETE_COLUMN,
  OPERATION_TYPE.RENAME_COLUMN,
  OPERATION_TYPE.MODIFY_COLUMN_DATA,
];

export const VIEW_OPERATION = [
  OPERATION_TYPE.MODIFY_FILTERS,
  OPERATION_TYPE.MODIFY_SORTS,
  OPERATION_TYPE.MODIFY_GROUPBYS,
  OPERATION_TYPE.MODIFY_HIDDEN_COLUMNS,
];

export const COLUMN_OPERATION = [
  OPERATION_TYPE.INSERT_COLUMN,
  OPERATION_TYPE.DELETE_COLUMN,
  OPERATION_TYPE.RENAME_COLUMN,
  OPERATION_TYPE.MODIFY_COLUMN_DATA,
];
