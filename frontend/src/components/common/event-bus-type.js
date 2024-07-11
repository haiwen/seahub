export const EVENT_BUS_TYPE = {
  // metadata
  QUERY_COLLABORATORS: 'query-collaborators',
  QUERY_COLLABORATOR: 'query-collaborator',
  UPDATE_TABLE_ROWS: 'update-table-rows',

  // table
  LOCAL_TABLE_CHANGED: 'local-table-changed',
  SERVER_TABLE_CHANGED: 'server-table-changed',
  TABLE_ERROR: 'table-error',
  OPEN_EDITOR: 'open-editor',
  CLOSE_EDITOR: 'close-editor',
  SELECT_CELL: 'select_cell',
  SELECT_START: 'select_start',
  SELECT_UPDATE: 'select_update',
  SELECT_END: 'select_end',
  SELECT_END_WITH_SHIFT: 'select_end_with_shift',
  SELECT_NONE: 'select_none',
  COPY_CELLS: 'copy_cells',
  PASTE_CELLS: 'paste_cells',
  SEARCH_CELLS: 'search-cells',
  CLOSE_SEARCH_CELLS: 'close-search-cells',
  OPEN_SELECT: 'open-select',
  UPDATE_LINKED_RECORDS: 'update_linked_records',
  SELECT_COLUMN: 'select_column',
  DRAG_ENTER: 'drag_enter',
  COLLAPSE_ALL_GROUPS: 'collapse_all_groups',
  EXPAND_ALL_GROUPS: 'expand_all_groups',

  // modify view
  MODIFY_FILTERS: 'modify_filters',
  MODIFY_SORTS:'modify_sorts',
  MODIFY_GROUPBYS:'modify_groupbys',
  MODIFY_HIDDEN_COLUMNS:'modify_hidden_columns',

  // change
  VIEW_CHANGED: 'view_changed',

  // library
  CURRENT_LIBRARY_CHANGED: 'current_library_changed',
};
