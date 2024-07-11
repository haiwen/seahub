import { CellType } from '../_basic';
import { EVENT_BUS_TYPE } from '../../../components/common/event-bus-type';
import TRANSFER_TYPES from './TransferTypes';

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
};

export const TABLE_MOBILE_SUPPORT_EDIT_CELL_TYPE_MAP = {
  [CellType.TEXT]: true,
};

export const CANVAS_RIGHT_INTERVAL = 240;

export const LEFT_NAV = 280;
export const ROW_DETAIL_PADDING = 40 * 2;
export const ROW_DETAIL_MARGIN = 20 * 2;
export const EDITOR_PADDING = 1.5 * 16; // 1.5: 0.75 * 2

export const COLUMN_RATE_MAX_NUMBER = [
  { name: 1 },
  { name: 2 },
  { name: 3 },
  { name: 4 },
  { name: 5 },
  { name: 6 },
  { name: 7 },
  { name: 8 },
  { name: 9 },
  { name: 10 },
];

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

export const DELETED_OPTION_TIPS = 'deleted_option';

export const SUPPORT_BATCH_DOWNLOAD_TYPES = [];

export const DEFAULT_COLUMNS = [
  { name: 'Name', type: CellType.TEXT, width: 200, editable: false, key: 'name' },
  { name: 'Parent_dir', type: CellType.TEXT, width: 200, editable: false, key: 'parent_dir' },
  { name: 'CTime', type: CellType.CTIME, width: 200, editable: false, key: 'created_time' },
  { name: 'MTime', type: CellType.MTIME, width: 200, editable: false, key: 'modified_time' },
  { name: 'Creator', type: CellType.CREATOR, width: 200, editable: false, key: 'creator' },
  { name: 'Last_modified', type: CellType.LAST_MODIFIER, width: 200, editable: false, key: 'modifier' },
  { name: 'Is_dir', type: CellType.TEXT, width: 200, editable: false, key: 'is_dir' },
];

export const PER_LOAD_NUMBER = 1000;

// dtable-db limit loads up to 10,000 rows at a time
export const MAX_LOAD_NUMBER = 10000;

export const EDITOR_TYPE = {
  PREVIEWER: 'previewer',
  ADDITION: 'addition',
};

export {
  EVENT_BUS_TYPE,
  TRANSFER_TYPES,
};
