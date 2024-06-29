// copy from sf-metadata
// Drop Target of top row's z-index is -1.
export const DEFAULT_DROP_TARGET = -1;

// CellMasks should render in front of the cells
// Unfrozen cells do not have a zIndex specifed
export const CELL_MASK = 1;
export const TABLE_MAIN_INTERVAL = 1;
export const RESIZE_HANDLE = 1;

export const SEQUENCE_COLUMN = 1;

// higher than unfrozen header cell(0), RESIZE_HANDLE
export const FROZEN_HEADER_CELL = 2;

export const GROUP_FROZEN_HEADER = 2;

export const SCROLL_BAR = 2;

// In front of CELL_MASK/non-frozen cell(1)、back of the frozen cells (2)
export const GROUP_BACKDROP = 2;

export const MOBILE_RECORDS_COLUMN_NAMES = 2;

export const FROZEN_GROUP_CELL = 2;

// Frozen cells have a zIndex value of 2 so CELL_MASK should have a higher value
export const FROZEN_CELL_MASK = 3;

// GALLERY_MAIN_HEADER, TABLE_MAIN_INTERVAL is 3 to hide first freeze column
export const GALLERY_MAIN_HEADER = 3;

// APP_HEADER is 8 than TABLE_HEADER because Logout Popover need to be at the top
export const APP_HEADER = 8;

// higher than frozen cells(2)
export const GRID_HORIZONTAL_SCROLLBAR = 3;

// In mobile list mode, row name fixed, so upper components z-index is 3
export const SEARCH_ALL_TABLES = 3;

export const MOBILE_TABLES_TABS_CONTAINER = 3;

export const MOBILE_TABLE_TOOLBAR = 3;

export const MOBILE_HEADER = 3;

// need higher than the doms(etc. cell, cell_mask) which behind of the grid header
export const GRID_HEADER = 4;

export const GRID_FOOTER = 4;

export const UPLOAD_PROGRESS = 4;

// frozen column header z-index is 3，row drop target horizontal line shoule appear so z-index is 4
export const ROW_DROP_TARGET = 4;

export const VIEW_SIDEBAR_RESIZE_HANDLER = 4;

// need higher or equal to GRID_HEADER(frozen): 4
export const TABLE_SETTING_PANEL = 4;

// higher than PANE_DIVIDER(4)
export const TABLE_TOOLBAR = 5;

export const TABLE_RIGHT_PANEL = 5;

// higher than TABLE_TOOLBAR(5)
export const TABLES_TABS_CONTAINER = 6;

// higher than TABLES_TABS_CONTAINER(6)
export const TABLE_HEADER = 7;

export const TABLE_COMMENT_CONTAINER = 7;

// higher than TABLE_HEADER(7)
export const PANE_DIVIDER = 8;

// EditorContainer is rendered outside the grid and it higher FROZEN_GROUP_CELL(2) and PANE_DIVIDER(8)
export const EDITOR_CONTAINER = 9;

// APP_LEFT_BAR_COLLAPSE z-index should taller than the APP_HEADER and the PANE_DIVIDER(8)
export const APP_LEFT_BAR_COLLAPSE = 9;

export const EXPAND_ROW_ICON = 99;

export const MOBILE_MASK = 100;

export const ROW_EXPAND_VIEW = 100;

export const APP_NAV_SLIDER = 100;

// LINK_RECORDS z-index should higher than EXPAND_ROW_ICON
export const LINK_RECORDS = 100;

// APP_LEFT_BAR is higher than APP_NAV_SLIDER
export const APP_LEFT_BAR = 101;

export const MOBILE_APP_NAV = 101;

export const STATISTIC_DIALOG_MODAL = 800;

export const STATISTIC_ENLARGE_DIALOG_MODAL = 900;

export const STATISTIC_RECORDS_DIALOG_MODAL = 1000;

export const SEARCH_TABLES_DIALOG_MODAL = 1000;

export const DATE_EDITOR = 1001;

export const NOTIFICATION_LIST_MODAL = 1046;

export const TRIGGER_ROWS_MODAL = 1047;

export const TRIGGER_ROWS_VIEW = 1047;

export const RECORD_DETAILS_DIALOG = 1048;

export const CALENDAR_DIALOG_MODAL = 1048;

export const PRINT_ROW_TYPE_MODAL = 1049;

export const IMAGE_PREVIEW_LIGHTBOX = 1051;

export const DROPDOWN_MENU = 1051;

export const RC_CALENDAR = 1053;

export const EDIT_COLUMN_POPOVER = 1060;

export const LARGE_MAP_EDITOR_DIALOG_MODAL = 1061;

export const TOAST_MANAGER = 999999;

export const LINK_PICKER = 10;
