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

};

export const OPERATION_ATTRIBUTES = {
  [OPERATION_TYPE.MODIFY_RECORD]: ['repo_id', 'row_id', 'updates', 'old_row_data', 'original_updates', 'original_old_row_data'],
  [OPERATION_TYPE.MODIFY_RECORDS]: ['repo_id', 'row_ids', 'id_row_updates', 'id_original_row_updates', 'id_old_row_data', 'id_original_old_row_data', 'is_copy_paste'],
  [OPERATION_TYPE.RESTORE_RECORDS]: ['repo_id', 'rows_data', 'original_rows', 'link_infos', 'upper_row_ids'],
  [OPERATION_TYPE.RELOAD_RECORDS]: ['repo_id', 'row_ids'],
  [OPERATION_TYPE.MODIFY_FILTERS]: ['filter_conjunction', 'filters'],
  [OPERATION_TYPE.MODIFY_SORTS]: ['sorts'],
  [OPERATION_TYPE.MODIFY_GROUPBYS]: ['groupbys'],
  [OPERATION_TYPE.MODIFY_HIDDEN_COLUMNS]: ['shown_column_keys'],
  [OPERATION_TYPE.LOCK_RECORD_VIA_BUTTON]: ['repo_id', 'row_id', 'button_column_key'],
  [OPERATION_TYPE.MODIFY_RECORD_VIA_BUTTON]: ['repo_id', 'row_id', 'updates', 'old_row_data', 'original_updates', 'original_old_row_data', 'button_column_key'],
  [OPERATION_TYPE.INSERT_COLUMN]: ['repo_id', 'name', 'column_type', 'key', 'data'],
};

export const UNDO_OPERATION_TYPE = [
  OPERATION_TYPE.MODIFY_RECORD,
  OPERATION_TYPE.MODIFY_RECORDS,
  OPERATION_TYPE.RESTORE_RECORDS,
];

// only apply operation on the local
export const LOCAL_APPLY_OPERATION_TYPE = [
  OPERATION_TYPE.MODIFY_FILTERS,
  OPERATION_TYPE.MODIFY_SORTS,
  OPERATION_TYPE.MODIFY_GROUPBYS,
  OPERATION_TYPE.MODIFY_HIDDEN_COLUMNS,
];

// apply operation after exec operation on the server
export const NEED_APPLY_AFTER_SERVER_OPERATION = [
  OPERATION_TYPE.INSERT_COLUMN,
];
