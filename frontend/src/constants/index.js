import * as zIndexes from './zIndexes';
import KeyCodes from './keyCodes';

export const DIALOG_MAX_HEIGHT = window.innerHeight - 56; // Dialog margin is 3.5rem (56px)

export const PRIVATE_FILE_TYPE = {
  FILE_EXTENDED_PROPERTIES: '__file_extended_properties',
  TAGS_PROPERTIES: '__tags_properties',
  TRASH: '__trash'
};

const TAG_COLORS = [
  '#FBD44A', '#EAA775',
  '#F4667C', '#DC82D2',
  '#9860E5', '#9F8CF1',
  '#59CB74', '#ADDF84',
  '#89D2EA', '#4ECCCB',
  '#46A1FD', '#C2C2C2',
];

export const SIDE_PANEL_FOLDED_WIDTH = 71;
export const SUB_NAV_ITEM_HEIGHT = 28;

export const MAP_TYPE = {
  B_MAP: 'b_map', // baidu
  G_MAP: 'g_map', // google
};

// domestic map's format: [lng, lat], foreign map's format: [lat, lng]
export const DOMESTIC_MAP_TYPE = [MAP_TYPE.B_MAP];

export { KeyCodes, zIndexes, TAG_COLORS };

export const MODE_TYPE_MAP = {
  CURRENT_AND_OTHER_REPOS: 'current_repo_and_other_repos',
  ONLY_CURRENT_LIBRARY: 'only_current_library',
  ONLY_ALL_REPOS: 'only_all_repos',
  ONLY_OTHER_LIBRARIES: 'only_other_libraries',
  RECENTLY_USED: 'recently_used',
  SEARCH_RESULTS: 'search_results',
};

export const SYSTEM_FOLDERS = [
  '/_Internal',
  '/images'
];

export const DIRENT_DETAIL_SHOW_KEY = 'sf_dirent_detail_show';

export const CAPTURE_INFO_SHOW_KEY = 'sf_capture_info_show';

export const TREE_PANEL_STATE_KEY = 'sf_dir_view_tree_panel_open';

export const TREE_PANEL_SECTION_STATE_KEY = 'sf_dir_view_tree_panel_section_state';

export const RECENTLY_USED_LIST_KEY = 'recently_used_list';

export const SEARCH_FILTERS_KEY = {
  SEARCH_FILENAME_AND_CONTENT: 'search_filename_and_content',
  SEARCH_FILENAME_ONLY: 'search_filename_only',
  CREATOR_LIST: 'creator_list',
  DATE: 'date',
  SUFFIXES: 'suffixes',
};

export const SEARCH_FILTER_BY_DATE_OPTION_KEY = {
  TODAY: 'today',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  CUSTOM: 'custom',
};

export const SEARCH_FILTER_BY_DATE_TYPE_KEY = {
  CREATE_TIME: 'create_time',
  LAST_MODIFIED_TIME: 'last_modified_time',
};

export const SEARCH_FILTERS_SHOW_KEY = 'search_filters_show';

export const NAV_ITEM_MARGIN = 12;
