export const OPERATION_TYPE = {
  // view
  MODIFY_FILTERS: 'modify_filters',
  MODIFY_SORTS: 'modify_sorts',
  MODIFY_GROUPBYS: 'modify_groupbys',
  MODIFY_HIDDEN_COLUMNS: 'modify_hidden_columns',
  MODIFY_SETTINGS: 'modify_settings',
  MODIFY_LOCAL_VIEW: 'modify_local_view',
  MODIFY_VIEW_TYPE: 'modify_view_type',

  // column
  INSERT_COLUMN: 'insert_column',
  DELETE_COLUMN: 'delete_column',
  RENAME_COLUMN: 'rename_column',
  MODIFY_COLUMN_DATA: 'modify_column_data',
  MODIFY_LOCAL_COLUMN_DATA: 'modify_local_column_data',
  MODIFY_COLUMN_WIDTH: 'modify_column_width',
  MODIFY_COLUMN_ORDER: 'modify_column_order',

  // record
  MODIFY_RECORDS: 'modify_records',
  DELETE_RECORDS: 'delete_records',
  RESTORE_RECORDS: 'restore_records',
  RELOAD_RECORDS: 'reload_records',
  LOCK_RECORD_VIA_BUTTON: 'lock_record_via_button',
  MODIFY_RECORD_VIA_BUTTON: 'modify_record_via_button',
  MODIFY_LOCAL_RECORD: 'modify_local_record',
  MOVE_RECORD: 'move_record',
  DUPLICATE_RECORD: 'duplicate_record',

  // face table
  RENAME_PEOPLE_NAME: 'rename_people_name',
  DELETE_PEOPLE_PHOTOS: 'delete_people_photos',
  REMOVE_PEOPLE_PHOTOS: 'remove_people_photos',
  ADD_PEOPLE_PHOTOS: 'add_people_photos',
  SET_PEOPLE_COVER_PHOTO: 'set_people_cover_photo',

  // tag
  UPDATE_FILE_TAGS: 'update_file_tags',
};

export const COLUMN_DATA_OPERATION_TYPE = {
  ADD_OPTION: 'add_options',
  DELETE_OPTION: 'delete_option',
  RENAME_OPTION: 'rename_option',
  MODIFY_OPTION_COLOR: 'modify_option_color',
  MOVE_OPTION: 'move_option',
  INIT_NEW_OPTION: 'init_new_option',
};

export const OPERATION_ATTRIBUTES = {
  [OPERATION_TYPE.MODIFY_RECORDS]: ['repo_id', 'row_ids', 'id_row_updates', 'id_original_row_updates', 'id_old_row_data', 'id_original_old_row_data', 'is_copy_paste', 'is_rename', 'id_obj_id'],
  [OPERATION_TYPE.DELETE_RECORDS]: ['repo_id', 'rows_ids', 'deleted_rows'],
  [OPERATION_TYPE.RELOAD_RECORDS]: ['repo_id', 'row_ids'],
  [OPERATION_TYPE.MOVE_RECORD]: ['repo_id', 'row_id', 'target_repo_id', 'dirent', 'target_parent_path', 'source_parent_path', 'update_data'],
  [OPERATION_TYPE.DUPLICATE_RECORD]: ['repo_id', 'row_id', 'target_repo_id', 'dirent', 'target_parent_path', 'source_parent_path'],
  [OPERATION_TYPE.MODIFY_LOCAL_RECORD]: ['repo_id', 'row_id', 'parent_dir', 'file_name', 'updates'],

  [OPERATION_TYPE.MODIFY_FILTERS]: ['repo_id', 'view_id', 'filter_conjunction', 'filters', 'basic_filters'],
  [OPERATION_TYPE.MODIFY_SORTS]: ['repo_id', 'view_id', 'sorts'],
  [OPERATION_TYPE.MODIFY_GROUPBYS]: ['repo_id', 'view_id', 'groupbys'],
  [OPERATION_TYPE.MODIFY_HIDDEN_COLUMNS]: ['repo_id', 'view_id', 'hidden_columns'],
  [OPERATION_TYPE.MODIFY_LOCAL_VIEW]: ['repo_id', 'view_id', 'update'],
  [OPERATION_TYPE.MODIFY_VIEW_TYPE]: ['repo_id', 'view_id', 'view_type'],

  [OPERATION_TYPE.INSERT_COLUMN]: ['repo_id', 'name', 'column_type', 'column_key', 'data', 'column'],
  [OPERATION_TYPE.RENAME_COLUMN]: ['repo_id', 'column_key', 'new_name', 'old_name'],
  [OPERATION_TYPE.MODIFY_COLUMN_DATA]: ['repo_id', 'column_key', 'new_data', 'old_data', 'option_modify_type'],
  [OPERATION_TYPE.MODIFY_LOCAL_COLUMN_DATA]: ['column_key', 'new_data', 'old_data'],
  [OPERATION_TYPE.DELETE_COLUMN]: ['repo_id', 'column_key', 'column'],
  [OPERATION_TYPE.MODIFY_COLUMN_WIDTH]: ['column_key', 'new_width', 'old_width'],
  [OPERATION_TYPE.MODIFY_COLUMN_ORDER]: ['repo_id', 'view_id', 'new_columns_keys', 'old_columns_keys'],

  [OPERATION_TYPE.RENAME_PEOPLE_NAME]: ['repo_id', 'people_id', 'new_name', 'old_name'],
  [OPERATION_TYPE.DELETE_PEOPLE_PHOTOS]: ['repo_id', 'people_id', 'deleted_photos'],
  [OPERATION_TYPE.REMOVE_PEOPLE_PHOTOS]: ['repo_id', 'people_id', 'removed_photos', 'success_callback'],
  [OPERATION_TYPE.ADD_PEOPLE_PHOTOS]: ['repo_id', 'people_id', 'old_people_id', 'added_photos', 'success_callback'],
  [OPERATION_TYPE.SET_PEOPLE_COVER_PHOTO]: ['repo_id', 'people_id', 'selected_photo'],

  [OPERATION_TYPE.MODIFY_SETTINGS]: ['repo_id', 'view_id', 'settings'],

  [OPERATION_TYPE.UPDATE_FILE_TAGS]: ['repo_id', 'file_tags_data'],
};

export const UNDO_OPERATION_TYPE = [
  OPERATION_TYPE.MODIFY_RECORDS,
  OPERATION_TYPE.INSERT_COLUMN,
  OPERATION_TYPE.DELETE_COLUMN,
  OPERATION_TYPE.RENAME_COLUMN,
  OPERATION_TYPE.MODIFY_COLUMN_DATA,
  OPERATION_TYPE.MODIFY_COLUMN_WIDTH,
  OPERATION_TYPE.MODIFY_COLUMN_ORDER,
  OPERATION_TYPE.UPDATE_FILE_TAGS,
];

// only apply operation on the local
export const LOCAL_APPLY_OPERATION_TYPE = [
  OPERATION_TYPE.MODIFY_COLUMN_WIDTH,
  OPERATION_TYPE.MODIFY_LOCAL_RECORD,
  OPERATION_TYPE.MODIFY_LOCAL_COLUMN_DATA,
  OPERATION_TYPE.DELETE_PEOPLE_PHOTOS,
  OPERATION_TYPE.MODIFY_LOCAL_VIEW,
];

// apply operation after exec operation on the server
export const NEED_APPLY_AFTER_SERVER_OPERATION = [
  OPERATION_TYPE.INSERT_COLUMN,
  OPERATION_TYPE.MODIFY_FILTERS,
  OPERATION_TYPE.MODIFY_SORTS,
  OPERATION_TYPE.MOVE_RECORD,
  OPERATION_TYPE.DUPLICATE_RECORD,
];

export const VIEW_OPERATION = [
  OPERATION_TYPE.MODIFY_FILTERS,
  OPERATION_TYPE.MODIFY_SORTS,
  OPERATION_TYPE.MODIFY_GROUPBYS,
  OPERATION_TYPE.MODIFY_HIDDEN_COLUMNS,
  OPERATION_TYPE.MODIFY_VIEW_TYPE,
];

export const COLUMN_OPERATION = [
  OPERATION_TYPE.INSERT_COLUMN,
  OPERATION_TYPE.DELETE_COLUMN,
  OPERATION_TYPE.RENAME_COLUMN,
  OPERATION_TYPE.MODIFY_COLUMN_DATA,
  OPERATION_TYPE.MODIFY_COLUMN_WIDTH,
  OPERATION_TYPE.MODIFY_COLUMN_ORDER,
  OPERATION_TYPE.MODIFY_LOCAL_COLUMN_DATA,
];
