/*
  Handle metadata internal events
*/

export const EVENT_BUS_TYPE = {
  // folder/views
  ADD_FOLDER: 'add_folder',
  ADD_VIEW: 'add_view',

  QUERY_COLLABORATORS: 'query_collaborators',
  QUERY_COLLABORATOR: 'query_collaborator',
  UPDATE_TABLE_ROWS: 'update_table_rows',

  // table
  LOCAL_TABLE_CHANGED: 'local_table_changed',
  SERVER_TABLE_CHANGED: 'server_table_changed',
  TABLE_ERROR: 'table_error',
  OPEN_EDITOR: 'open_editor',
  CLOSE_EDITOR: 'close_editor',
  SELECT_CELL: 'select_cell',
  SELECT_START: 'select_start',
  SELECT_UPDATE: 'select_update',
  SELECT_END: 'select_end',
  SELECT_END_WITH_SHIFT: 'select_end_with_shift',
  SELECT_NONE: 'select_none',
  COPY_CELLS: 'copy_cells',
  PASTE_CELLS: 'paste_cells',
  CUT_CELLS: 'cut_cells',
  SEARCH_CELLS: 'search_cells',
  CLOSE_SEARCH_CELLS: 'close_search_cells',
  OPEN_SELECT: 'open_select',
  UPDATE_LINKED_RECORDS: 'update_linked_records',
  SELECT_COLUMN: 'select_column',
  DRAG_ENTER: 'drag_enter',
  COLLAPSE_ALL_GROUPS: 'collapse_all_groups',
  EXPAND_ALL_GROUPS: 'expand_all_groups',
  LOCAL_RECORD_CHANGED: 'local_record_changed',
  LOCAL_RECORD_DETAIL_CHANGED: 'local_record_detail_changed',
  LOCAL_COLUMN_DATA_CHANGED: 'local_column_data_changed',
  FOCUS_CANVAS: 'focus_canvas',

  // metadata
  RELOAD_DATA: 'reload_data',
  UPDATE_SEARCH_RESULT: 'update_search_result',

  // view
  MODIFY_FILTERS: 'modify_filters',
  MODIFY_SORTS: 'modify_sorts',
  MODIFY_GROUPBYS: 'modify_groupbys',
  MODIFY_HIDDEN_COLUMNS: 'modify_hidden_columns',
  MODIFY_SETTINGS: 'modify_settings',

  // change
  VIEW_CHANGED: 'view_changed',

  // column
  MODIFY_COLUMN_ORDER: 'modify_column_order',

  // data status
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error',

  // view
  TOGGLE_VIEW_TOOLBAR: 'toggle_view_toolbar',
  RESET_VIEW: 'reset_view',
  UPDATE_SERVER_VIEW: 'update_server_view',

  // gallery
  MODIFY_GALLERY_ZOOM_GEAR: 'modify_gallery_zoom_gear',
  SWITCH_GALLERY_GROUP_BY: 'switch_gallery_group_by',

  // kanban
  TOGGLE_KANBAN_SETTINGS: 'toggle_kanban_settings',
  OPEN_KANBAN_SETTINGS: 'open_kanban_settings',
  CLOSE_KANBAN_SETTINGS: 'close_kanban_settings',

  // map
  MODIFY_MAP_TYPE: 'modify_map_type',
  MAP_VIEW: 'map_view',

  // tag file
  MOVE_TAG_FILE: 'move_tag_file',
  COPY_TAG_FILE: 'copy_tag_file',
  RENAME_TAG_FILE: 'rename_tag_file',
  TOGGLE_RENAME_DIALOG: 'toggle_rename_dialog',
  DOWNLOAD_TAG_FILES: 'download_tag_files',
  DELETE_TAG_FILES: 'delete_tag_files',
  SHARE_TAG_FILE: 'share_tag_file',
  SELECTED_TAG_FILE_IDS: 'selected_tag_file_ids',
  UNSELECT_TAG_FILES: 'unselect_tag_files',
};
