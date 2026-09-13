import { CellType, PRIVATE_COLUMN_KEY } from '../column';

export const CELL_NAVIGATION_MODE = {
  NONE: 'none',
  CHANGE_ROW: 'changeRow',
  LOOP_OVER_ROW: 'loopOverRow',
};

export const SEQUENCE_COLUMN_WIDTH = 80;

export const ROW_HEIGHT = 32;

export const GRID_HEADER_DEFAULT_HEIGHT = 32;

export const GRID_HEADER_DOUBLE_HEIGHT = 56;

export const GROUP_VIEW_OFFSET = 16;

export const GROUP_HEADER_HEIGHT = 48;

export const TABLE_LEFT_MARGIN = 10;

export const TABLE_BORDER_WIDTH = 1;

export const UNABLE_TO_CALCULATE = '--';

export const FROZEN_COLUMN_SHADOW = '2px 0 5px -2px hsla(0,0%,53.3%,.3)';

export const TABLE_NOT_SUPPORT_EDIT_TYPE_MAP = {
  [CellType.CREATOR]: true,
  [CellType.LAST_MODIFIER]: true,
  [CellType.CTIME]: true,
  [CellType.MTIME]: true,
  [CellType.FILE_NAME]: true,
};

export const TABLE_SUPPORT_EDIT_TYPE_MAP = {
  [CellType.TEXT]: true,
  [CellType.DATE]: true,
  [CellType.NUMBER]: true,
  [CellType.SINGLE_SELECT]: true,
  [CellType.MULTIPLE_SELECT]: true,
  [CellType.COLLABORATOR]: true,
  [CellType.CHECKBOX]: true,
  [CellType.LONG_TEXT]: true,
  [CellType.LINK]: true,
  [CellType.TAGS]: true,
};

export const TABLE_NOT_DISPLAY_COLUMN_KEYS = [
  PRIVATE_COLUMN_KEY.SUFFIX,
];

export const TABLE_MOBILE_SUPPORT_EDIT_CELL_TYPE_MAP = {
  [CellType.TEXT]: true,
};

export const CANVAS_RIGHT_INTERVAL = 44;

export const LEFT_NAV = 280;
export const ROW_DETAIL_PADDING = 40 * 2;
export const ROW_DETAIL_MARGIN = 20 * 2;
export const EDITOR_PADDING = 1.5 * 16; // 1.5: 0.75 * 2

export const GROUP_ROW_TYPE = {
  GROUP_CONTAINER: 'group_container',
  ROW: 'row',
  BTN_INSERT_ROW: 'btn_insert_row',
};

export const INSERT_ROW_HEIGHT = 32;

export const CHANGE_HEADER_WIDTH = 'CHANGE_HEADER_WIDTH';

export const NOT_SUPPORT_DRAG_COPY_COLUMN_TYPES = [
];

export const SUPPORT_PREVIEW_COLUMN_TYPES = [];

export const OVER_SCAN_COLUMNS = 10;

export const DELETED_OPTION_BACKGROUND_COLOR = '#eaeaea';

export const DELETED_OPTION_TIPS = 'Deleted option';

export const SUPPORT_BATCH_DOWNLOAD_TYPES = [];

export const PER_LOAD_NUMBER = 10000;

export const DEFAULT_RETRY_TIMES = 4;

export const DEFAULT_RETRY_INTERVAL = 1000;

export const MAX_LOAD_NUMBER = 10000;

export const EDITOR_TYPE = {
  PREVIEWER: 'previewer',
  ADDITION: 'addition',
};

export const PASTE_SOURCE = {
  COPY: 'copy',
  CUT: 'cut',
};

export const SUPPORT_SEARCH_COLUMN_LIST = [
  CellType.FILE_NAME,
  CellType.DATE,
  CellType.TEXT,
  CellType.LONG_TEXT,
  CellType.NUMBER,
  CellType.SINGLE_SELECT,
  CellType.CTIME,
  CellType.MTIME,
  CellType.MULTIPLE_SELECT,
  CellType.LAST_MODIFIER,
  CellType.CREATOR,
  CellType.COLLABORATOR,
  CellType.GEOLOCATION,
  CellType.TAGS,
];
