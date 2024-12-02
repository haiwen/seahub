/*
  Handle metadata internal events
*/

export const EVENT_BUS_TYPE = {
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
  FOCUS_CANVAS: 'focus_canvas',

  // metadata
  RELOAD_DATA: 'reload_data',

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

  // gallery
  MODIFY_GALLERY_ZOOM_GEAR: 'modify_gallery_zoom_gear',
  SWITCH_GALLERY_GROUP_BY: 'switch_gallery_group_by',

  // face recognition
  TOGGLE_VIEW_TOOLBAR: 'toggle_view_toolbar',

  // kanban
  TOGGLE_KANBAN_SETTINGS: 'toggle_kanban_settings',
  OPEN_KANBAN_SETTINGS: 'open_kanban_settings',
  CLOSE_KANBAN_SETTINGS: 'close_kanban_settings',
};
