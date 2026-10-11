export const EVENT_BUS_TYPE = {
  // library
  CURRENT_LIBRARY_CHANGED: 'current_library_changed',
  SEARCH_LIBRARY_CONTENT: 'search_library_content',
  SHARED_LIBRARIES_CHANGED: 'shared_libraries_changed',

  // group
  ADD_NEW_GROUP: 'add_new_group',
  ADD_SHARED_REPO_INTO_GROUP: 'add_shared_repo_into_group',
  UNSHARE_REPO_TO_GROUP: 'unshare_repo_to_group',
  GROUP_LIBRARIES_CHANGED: 'group_libraries_changed',
  GROUP_RENAMED: 'group_renamed',
  ONLY_SHOW_GROUPS_WITH_LIBRARIES_CHANGED: 'only_show_groups_with_libraries_changed',

  RESTORE_IMAGE: 'restore_image',
  OPEN_MARKDOWN: 'open_markdown',

  // tags
  TAG_STATUS: 'tag_status',
  TAGS_DATA: 'tags_data',
  SELECT_TAG: 'select_tag',
  UPDATE_SELECTED_TAG: 'update_selected_tag',

  // download file
  DOWNLOAD_FILE: 'download_file',
  CREATE_FILE: 'create_file',
  CREATE_FOLDER: 'create_folder',
  MOVE_FILE: 'move_file',
  COPY_FILE: 'copy_file',
  SHARE_FILE: 'share_file',
  RENAME_FILE: 'rename_file',
  PERMISSION: 'permission',
  ACCESS_LOG: 'access_log',
  PREVIEW_IMAGE: 'preview_image',

  // sys-admin pages
  CLEAR_DEVICE_ERRORS: 'clear_device_errors',
  SHOW_CLEAN_BTN: 'show_clean_btn',
  SYNC_USERNAME: 'sync_username',
  OPEN_CREATE_REPO_DIALOG: 'open_create_repo_dialog',
  OPEN_CLEAN_TRASH_DIALOG: 'open_clean_trash_dialog',
  HANDLE_SELECTED_OPERATIONS: 'handle_selected_operations',
  RESET_PER_PAGE: 'reset_per_page',

  // history view
  HISTORY_SEARCH: 'history_search',
  HISTORY_SORT: 'history_sort',
  HISTORY_FILTER: 'history_filter',
  HISTORY_COMMITS_UPDATED: 'history_commits_updated',
  SWITCH_TO_HISTORY_VIEW: 'switch_to_history_view',
  SWITCH_TO_CHAT_VIEW: 'switch_to_chat_view',
  CHAT_ATTACH_FILES: 'chat_attach_files',
  CHAT_NEW_SESSION: 'chat_new_session',
  CHAT_TOGGLE_SESSIONS: 'chat_toggle_sessions',
  ASK_QUESTION: 'ask_question',
  AI_REPLY: 'ai_reply',
  AI_STREAM_REPLY: 'ai_stream_reply',

  // column visibility
  HIDDEN_COLUMNS_CHANGED: 'hidden_columns_changed',
  HIDDEN_TABLE_VIEW_COLUMNS_CHANGED: 'hidden_table_view_columns_changed',

  // selection
  SELECT_NONE: 'select_none',

  // row
  MODIFY_ROW_HEIGHT: 'modify_row_height',

  // dirent properties
  DIRENT_METADATA_CHANGED: 'dirent_metadata_changed',
  COLUMN_DATA_MODIFIED: 'column_data_modified',

  // library settings
  SWITCH_TO_SETTINGS_VIEW: 'switch_to_settings_view',

  // tags
  SWITCH_TO_TAGS_VIEW: 'switch_to_tags_view',

  // trash
  SWITCH_TO_TRASH_VIEW: 'switch_to_trash_view',
  SELECT_TRASH: 'select_trash',
  UNSELECT_TRASH: 'unselect_trash',
  RESTORE_TRASH: 'restore_trash',
  TRASH_SEARCH: 'trash_search',
  TRASH_FILTER: 'trash_filter',
  REFRESH_TRASH: 'refresh_trash',
  ON_TRASH_ITEM_CLICK: 'on_trash_item_click',
  UPDATE_TRASH_PATH: 'update_trash_path',
  UPDATE_TRASH_PATH_BY_DIR_PATH: 'update_trash_path_by_dir_path',
  TRASH_SEARCH_STATE_CHANGED: 'trash_search_state_changed',

  // metadata events
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
  COPY_TAG_FILE: 'copy_tag_file',
  CHAT_WITH_AI_ABOUT_TAG_FILES: 'chat_with_ai_about_tag_files',
  SHARE_TAG_FILE: 'share_tag_file',
  DOWNLOAD_TAG_FILES: 'download_tag_files',
  SELECT_TAG_FILES: 'select_tag_files',
  UNSELECT_TAG_FILES: 'unselect_tag_files',
  MODIFY_TAG_FILES_SORT: 'modify_tag_files_sort',
  SWITCH_TAG_FILES_VIEW_MODE: 'switch_tag_files_view_mode',
  UPDATE_TAG_FILES: 'update_tag_files',

  // tags
  SELECT_TAGS: 'select_tags',
  DELETE_TAGS: 'delete_tags',
  MERGE_TAGS: 'merge_tags',
  NEW_SUB_TAG: 'new_sub_tag',
  MODIFY_TAGS_SORT: 'modify_tags_sort',

  // file
  FILE_HISTORY: 'file_history',
  FILE_ACCESS_LOG: 'file_access_log',
  PROPERTIES: 'properties',
  OPEN_WITH_DEFAULT: 'open_with_default',
  OPEN_WITH_ONLYOFFICE: 'open_with_onlyoffice',
  OPEN_VIA_CLIENT: 'open_via_client',
  CONVERT_FILE: 'convert_file',
  EXPORT_DOCX: 'export_docx',
  EXPORT_SDOC: 'export_sdoc',
  EXPORT_MARKDOWN: 'export_markdown',
};
