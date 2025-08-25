import { PRIVATE_COLUMN_KEY } from '../column';
import { FILTER_PREDICATE_TYPE } from '../filter';
import { SORT_COLUMN_OPTIONS, GALLERY_SORT_COLUMN_OPTIONS, GALLERY_FIRST_SORT_COLUMN_OPTIONS, SORT_TYPE,
  GALLERY_SORT_PRIVATE_COLUMN_KEYS, GALLERY_FIRST_SORT_PRIVATE_COLUMN_KEYS,
} from '../sort';

export * from './gallery';
export * from './kanban';
export * from './map';
export * from './table';

export const METADATA_VIEWS_KEY = 'sf-metadata-views';

export const METADATA_VIEWS_DRAG_DATA_KEY = 'application/drag-sf-metadata-views';

export const TREE_NODE_LEFT_INDENT = 20;

export const VIEWS_TYPE_FOLDER = 'folder';

export const VIEWS_TYPE_VIEW = 'view';

export const VIEW_TYPE = {
  TABLE: 'table',
  GALLERY: 'gallery',
  FACE_RECOGNITION: 'face_recognition',
  KANBAN: 'kanban',
  MAP: 'map',
  STATISTICS: 'statistics',
};

export const FACE_RECOGNITION_VIEW_ID = '_face_recognition';

export const VIEW_TYPE_ICON = {
  [VIEW_TYPE.TABLE]: 'table',
  [VIEW_TYPE.GALLERY]: 'image',
  [VIEW_TYPE.FACE_RECOGNITION]: 'face-recognition-view',
  [VIEW_TYPE.KANBAN]: 'kanban',
  [VIEW_TYPE.MAP]: 'map',
  [VIEW_TYPE.STATISTICS]: 'statistics',
  'image': 'image'
};

export const VIEW_TYPE_DEFAULT_BASIC_FILTER = {
  [VIEW_TYPE.TABLE]: [
    {
      column_key: PRIVATE_COLUMN_KEY.IS_DIR,
      filter_predicate: FILTER_PREDICATE_TYPE.IS,
      filter_term: 'file'
    }, {
      column_key: PRIVATE_COLUMN_KEY.FILE_TYPE,
      filter_predicate: FILTER_PREDICATE_TYPE.IS_ANY_OF,
      filter_term: []
    }, {
      column_key: PRIVATE_COLUMN_KEY.TAGS,
      filter_predicate: FILTER_PREDICATE_TYPE.HAS_ANY_OF,
      filter_term: []
    },
  ],
  [VIEW_TYPE.GALLERY]: [
    {
      column_key: PRIVATE_COLUMN_KEY.FILE_TYPE,
      filter_predicate: FILTER_PREDICATE_TYPE.IS,
      filter_term: 'picture'
    }, {
      column_key: PRIVATE_COLUMN_KEY.TAGS,
      filter_predicate: FILTER_PREDICATE_TYPE.HAS_ALL_OF,
      filter_term: []
    },
  ],
  [VIEW_TYPE.FACE_RECOGNITION]: [],
  [VIEW_TYPE.KANBAN]: [
    {
      column_key: PRIVATE_COLUMN_KEY.IS_DIR,
      filter_predicate: FILTER_PREDICATE_TYPE.IS,
      filter_term: 'file'
    }, {
      column_key: PRIVATE_COLUMN_KEY.FILE_TYPE,
      filter_predicate: FILTER_PREDICATE_TYPE.IS_ANY_OF,
      filter_term: []
    }, {
      column_key: PRIVATE_COLUMN_KEY.TAGS,
      filter_predicate: FILTER_PREDICATE_TYPE.HAS_ALL_OF,
      filter_term: []
    },
  ],
  [VIEW_TYPE.MAP]: [
    {
      column_key: PRIVATE_COLUMN_KEY.FILE_TYPE,
      filter_predicate: FILTER_PREDICATE_TYPE.IS,
      filter_term: 'picture'
    }, {
      column_key: PRIVATE_COLUMN_KEY.TAGS,
      filter_predicate: FILTER_PREDICATE_TYPE.HAS_ALL_OF,
      filter_term: []
    },
  ],
  [VIEW_TYPE.STATISTICS]: [
    {
      column_key: PRIVATE_COLUMN_KEY.IS_DIR,
      filter_predicate: FILTER_PREDICATE_TYPE.IS,
      filter_term: 'file'
    },
  ],
};

export const VIEW_TYPE_DEFAULT_SORTS = {
  [VIEW_TYPE.TABLE]: [],
  [VIEW_TYPE.GALLERY]: [{ column_key: PRIVATE_COLUMN_KEY.FILE_CTIME, sort_type: SORT_TYPE.DOWN }],
  [VIEW_TYPE.FACE_RECOGNITION]: [{ column_key: PRIVATE_COLUMN_KEY.FILE_CTIME, sort_type: SORT_TYPE.DOWN }],
  [VIEW_TYPE.KANBAN]: [],
  [VIEW_TYPE.MAP]: [{ column_key: PRIVATE_COLUMN_KEY.FILE_CTIME, sort_type: SORT_TYPE.DOWN }],
  [VIEW_TYPE.STATISTICS]: [],
};

export const VIEW_SORT_COLUMN_RULES = {
  [VIEW_TYPE.TABLE]: (column) => SORT_COLUMN_OPTIONS.includes(column.type),
  [VIEW_TYPE.GALLERY]: (column) => GALLERY_SORT_COLUMN_OPTIONS.includes(column.type) || GALLERY_SORT_PRIVATE_COLUMN_KEYS.includes(column.key),
  [VIEW_TYPE.FACE_RECOGNITION]: (column) => GALLERY_SORT_COLUMN_OPTIONS.includes(column.type) || GALLERY_SORT_PRIVATE_COLUMN_KEYS.includes(column.key),
  [VIEW_TYPE.KANBAN]: (column) => SORT_COLUMN_OPTIONS.includes(column.type),
  [VIEW_TYPE.MAP]: (column) => GALLERY_SORT_COLUMN_OPTIONS.includes(column.type) || GALLERY_SORT_PRIVATE_COLUMN_KEYS.includes(column.key),
};

export const VIEW_FIRST_SORT_COLUMN_RULES = {
  [VIEW_TYPE.TABLE]: (column) => SORT_COLUMN_OPTIONS.includes(column.type),
  [VIEW_TYPE.GALLERY]: (column) => GALLERY_FIRST_SORT_COLUMN_OPTIONS.includes(column.type) || GALLERY_FIRST_SORT_PRIVATE_COLUMN_KEYS.includes(column.key),
  [VIEW_TYPE.FACE_RECOGNITION]: (column) => GALLERY_FIRST_SORT_COLUMN_OPTIONS.includes(column.type) || GALLERY_FIRST_SORT_PRIVATE_COLUMN_KEYS.includes(column.key),
  [VIEW_TYPE.KANBAN]: (column) => SORT_COLUMN_OPTIONS.includes(column.type),
  [VIEW_TYPE.MAP]: (column) => GALLERY_FIRST_SORT_COLUMN_OPTIONS.includes(column.type) || GALLERY_FIRST_SORT_PRIVATE_COLUMN_KEYS.includes(column.key),
};

export const KANBAN_SETTINGS_KEYS = {
  GROUP_BY_COLUMN_KEY: 'group_by_column_key',
  TITLE_COLUMN_KEY: 'title_column_key',
  HIDE_EMPTY_VALUE: 'hide_empty_value',
  SHOW_COLUMN_NAME: 'show_column_name',
  TEXT_WRAP: 'text_wrap',
  COLUMNS: 'columns', // display and order
};

export const VIEW_DEFAULT_SETTINGS = {
  [VIEW_TYPE.TABLE]: {},
  [VIEW_TYPE.GALLERY]: {},
  [VIEW_TYPE.FACE_RECOGNITION]: {},
  [VIEW_TYPE.KANBAN]: {
    [KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY]: PRIVATE_COLUMN_KEY.FILE_STATUS,
    [KANBAN_SETTINGS_KEYS.TITLE_COLUMN_KEY]: PRIVATE_COLUMN_KEY.FILE_NAME,
    [KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUE]: false,
    [KANBAN_SETTINGS_KEYS.SHOW_COLUMN_NAME]: false,
    [KANBAN_SETTINGS_KEYS.TEXT_WRAP]: false,
    [KANBAN_SETTINGS_KEYS.COLUMNS]: [],
  }
};

export const VIEW_PROPERTY_KEYS = {
  ID: '_id',
  TABLE_ID: 'table_id',
  NAME: 'name',
  BASIC_FILTERS: 'basic_filters',
  FILTERS: 'filters',
  FILTER_CONJUNCTION: 'filter_conjunction',
  SORTS: 'sorts',
  GROUPBYS: 'groupbys',
  HIDDEN_COLUMNS: 'hidden_columns',
  TYPE: 'type',
  SETTINGS: 'settings',
};

export const VIEW_INCOMPATIBLE_PROPERTIES = [
  VIEW_PROPERTY_KEYS.GROUPBYS,
  VIEW_PROPERTY_KEYS.HIDDEN_COLUMNS,
  VIEW_PROPERTY_KEYS.SETTINGS,
];

export const VIEW_TYPES_SUPPORT_SHOW_DETAIL = [VIEW_TYPE.GALLERY, VIEW_TYPE.KANBAN, VIEW_TYPE.FACE_RECOGNITION];
