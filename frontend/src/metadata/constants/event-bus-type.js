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
  UPDATE_SELECTED_RECORD_IDS: 'update_selected_record_ids',
  SELECT_RECORDS: 'select_records',
  TOGGLE_MOVE_DIALOG: 'toggle_move_dialog',
  MOVE_RECORD: 'move_record',
  DUPLICATE_RECORD: 'duplicate_record',
  TOGGLE_COPY_DIALOG: 'toggle_copy_dialog',
  COPY_RECORDS: 'copy_records',
  DOWNLOAD_RECORDS: 'download_records',
  DELETE_RECORDS: 'delete_records',
  UPDATE_RECORD_DETAILS: 'update_record_details',
  UPDATE_FACE_RECOGNITION: 'update_face_recognition',
  GENERATE_DESCRIPTION: 'generate_description',
  EXTRACT_TEXT: 'extract_text',
  SEARCH_ROWS: 'search_rows',
  RESET_SEARCH_BAR: 'reset_search_bar',
  GENERATE_FILE_TAGS: 'generate_file_tags',

  // metadata
  RELOAD_DATA: 'reload_data',
  UPDATE_SEARCH_RESULT: 'update_search_result',
  LOADING: 'loading',

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

  // face recognition
  DELETE_FACE_RECOGNITION_RECORDS: 'delete_face_recognition_records',
  REMOVE_PHOTOS_FROM_CURRENT_SET: 'remove_photos_from_current_set',
  SET_PHOTO_AS_COVER: 'set_photo_as_cover',
  ADD_PHOTO_TO_GROUPS: 'add_photo_to_groups',

  // card
  TOGGLE_CARD_SETTINGS: 'toggle_card_settings',
  OPEN_CARD_SETTINGS: 'open_card_settings',
  CLOSE_CARD_SETTINGS: 'close_card_settings',
  DISPLAY_SORTS: 'display_sorts',
  TOGGLE_CARD_RENAME_DIALOG: 'toggle_card_rename_dialog',

  // kanban
  TOGGLE_KANBAN_SETTINGS: 'toggle_kanban_settings',
  OPEN_KANBAN_SETTINGS: 'open_kanban_settings',
  CLOSE_KANBAN_SETTINGS: 'close_kanban_settings',
  TOGGLE_KANBAN_RENAME_DIALOG: 'toggle_kanban_rename_dialog',

  // map
  MODIFY_MAP_TYPE: 'modify_map_type',
  MAP_VIEW: 'map_view',
  CLEAR_MAP_INSTANCE: 'clear_map_instance',

  // tag file
  MOVE_TAG_FILE: 'move_tag_file',
  COPY_TAG_FILE: 'copy_tag_file',
  RENAME_TAG_FILE_IN_SITU: 'rename_tag_file_in_situ',
  RENAME_TAG_FILE_IN_DIALOG: 'rename_tag_file_in_dialog',
  SHARE_TAG_FILE: 'share_tag_file',
  DOWNLOAD_TAG_FILES: 'download_tag_files',
  DELETE_TAG_FILES: 'delete_tag_files',
  SELECT_TAG_FILES: 'select_tag_files',
  UNSELECT_TAG_FILES: 'unselect_tag_files',
  MODIFY_TAG_FILES_SORT: 'modify_tag_files_sort',
  SWITCH_TAG_FILES_VIEW_MODE: 'switch_tag_files_view_mode',

  // tags
  SELECT_TAGS: 'select_tags',
  DELETE_TAGS: 'delete_tags',
  MERGE_TAGS: 'merge_tags',
  NEW_SUB_TAG: 'new_sub_tag',
  MODIFY_TAGS_SORT: 'modify_tags_sort',

  // file
  FILE_HISTORY: 'file_history',
  FILE_ACCESS_LOG: 'file_access_log',
  OPEN_VIA_CLIENT: 'open_via_client',
  CONVERT_FILE: 'convert_file',
  EXPORT_DOCX: 'export_docx',
  EXPORT_SDOC: 'export_sdoc',

  // trash
  LOAD_TRASH_FOLDER_RECORDS: 'load_trash_folder_records',
  TRASH_FOLDER_RECORDS_LOADED: 'trash_folder_records_loaded',
  UPDATE_TRASH_FOLDER_PATH: 'update_trash_folder_path',
  RESTORE_TRASH_RECORDS: 'restore_trash_records',
  UPDATE_TRASH_RECORDS: 'update_trash_records',
};
