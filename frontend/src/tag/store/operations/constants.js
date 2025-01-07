export const OPERATION_TYPE = {
  ADD_RECORDS: 'add_records',
  MODIFY_RECORDS: 'modify_records',
  DELETE_RECORDS: 'delete_records',
  RESTORE_RECORDS: 'restore_records',
  RELOAD_RECORDS: 'reload_records',
  ADD_TAG_LINKS: 'add_tag_links',
  DELETE_TAG_LINKS: 'delete_tag_links',

  MODIFY_LOCAL_RECORDS: 'modify_local_records',

  MODIFY_COLUMN_WIDTH: 'modify_column_width',
};

export const OPERATION_ATTRIBUTES = {
  [OPERATION_TYPE.ADD_RECORDS]: ['repo_id', 'rows', 'tags'],
  [OPERATION_TYPE.MODIFY_RECORDS]: ['repo_id', 'row_ids', 'id_row_updates', 'id_original_row_updates', 'id_old_row_data', 'id_original_old_row_data', 'is_copy_paste', 'is_rename', 'id_obj_id'],
  [OPERATION_TYPE.DELETE_RECORDS]: ['repo_id', 'tag_ids', 'deleted_tags'],
  [OPERATION_TYPE.RESTORE_RECORDS]: ['repo_id', 'rows_data', 'original_rows', 'link_infos', 'upper_row_ids'],
  [OPERATION_TYPE.RELOAD_RECORDS]: ['repo_id', 'row_ids'],
  [OPERATION_TYPE.ADD_TAG_LINKS]: ['repo_id', 'column_key', 'row_id', 'other_rows_ids'],
  [OPERATION_TYPE.DELETE_TAG_LINKS]: ['repo_id', 'column_key', 'row_id', 'other_rows_ids'],
  [OPERATION_TYPE.MODIFY_LOCAL_RECORDS]: ['repo_id', 'row_ids', 'id_row_updates', 'id_original_row_updates', 'id_old_row_data', 'id_original_old_row_data', 'is_copy_paste', 'is_rename', 'id_obj_id'],
  [OPERATION_TYPE.MODIFY_COLUMN_WIDTH]: ['column_key', 'new_width', 'old_width'],
};

export const UNDO_OPERATION_TYPE = [
  // OPERATION_TYPE.MODIFY_RECORDS,
  // OPERATION_TYPE.RESTORE_RECORDS,
];

// only apply operation on the local
export const LOCAL_APPLY_OPERATION_TYPE = [
  OPERATION_TYPE.MODIFY_LOCAL_RECORDS,
  OPERATION_TYPE.MODIFY_COLUMN_WIDTH,
];

// apply operation after exec operation on the server
export const NEED_APPLY_AFTER_SERVER_OPERATION = [
  OPERATION_TYPE.ADD_RECORDS,
];

export const VIEW_OPERATION = [
];
