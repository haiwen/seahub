import { PRIVATE_COLUMN_KEY } from './column';
import { FILTER_PREDICATE_TYPE } from './filter';
import { SORT_COLUMN_OPTIONS, GALLERY_SORT_COLUMN_OPTIONS, GALLERY_FIRST_SORT_COLUMN_OPTIONS, SORT_TYPE,
  GALLERY_SORT_PRIVATE_COLUMN_KEYS, GALLERY_FIRST_SORT_PRIVATE_COLUMN_KEYS,
} from './sort';

export const VIEW_TYPE = {
  TABLE: 'table',
  GALLERY: 'gallery',
  FACE_RECOGNITION: 'face_recognition',
  KANBAN: 'kanban',
};

export const FACE_RECOGNITION_VIEW_ID = '_face_recognition';

export const VIEW_TYPE_ICON = {
  [VIEW_TYPE.TABLE]: 'table',
  [VIEW_TYPE.GALLERY]: 'image',
  [VIEW_TYPE.FACE_RECOGNITION]: 'face-recognition-view',
  [VIEW_TYPE.KANBAN]: 'kanban',
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
    },
  ],
  [VIEW_TYPE.GALLERY]: [
    {
      column_key: PRIVATE_COLUMN_KEY.FILE_TYPE,
      filter_predicate: FILTER_PREDICATE_TYPE.IS,
      filter_term: 'picture'
    }
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
    },
  ],
};

export const VIEW_TYPE_DEFAULT_SORTS = {
  [VIEW_TYPE.TABLE]: [],
  [VIEW_TYPE.GALLERY]: [{ column_key: PRIVATE_COLUMN_KEY.FILE_CTIME, sort_type: SORT_TYPE.DOWN }],
  [VIEW_TYPE.KANBAN]: [],
};

export const VIEW_SORT_COLUMN_RULES = {
  [VIEW_TYPE.TABLE]: (column) => SORT_COLUMN_OPTIONS.includes(column.type),
  [VIEW_TYPE.GALLERY]: (column) => GALLERY_SORT_COLUMN_OPTIONS.includes(column.type) || GALLERY_SORT_PRIVATE_COLUMN_KEYS.includes(column.key),
  [VIEW_TYPE.KANBAN]: (column) => SORT_COLUMN_OPTIONS.includes(column.type),
};

export const VIEW_FIRST_SORT_COLUMN_RULES = {
  [VIEW_TYPE.TABLE]: (column) => SORT_COLUMN_OPTIONS.includes(column.type),
  [VIEW_TYPE.GALLERY]: (column) => GALLERY_FIRST_SORT_COLUMN_OPTIONS.includes(column.type) || GALLERY_FIRST_SORT_PRIVATE_COLUMN_KEYS.includes(column.key),
  [VIEW_TYPE.KANBAN]: (column) => SORT_COLUMN_OPTIONS.includes(column.type),
};

export const KANBAN_SETTINGS_KEYS = {
  GROUP_BY_COLUMN_KEY: 'group_by_column_key',
  TITLE_FIELD_KEY: 'title_field_key',
  HIDE_EMPTY_VALUES: 'hide_empty_values',
  SHOW_FIELD_NAMES: 'show_field_names',
  TEXT_WRAP: 'text_wrap',
  COLUMNS_KEYS: 'columns_keys', // used to store the order of properties
  SHOWN_COLUMNS_KEYS: 'shown_columns_keys',
};

export const VIEW_DEFAULT_SETTINGS = {
  [VIEW_TYPE.TABLE]: {},
  [VIEW_TYPE.GALLERY]: {},
  [VIEW_TYPE.KANBAN]: {
    [KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY]: '',
    [KANBAN_SETTINGS_KEYS.TITLE_FIELD_KEY]: PRIVATE_COLUMN_KEY.FILE_NAME,
    [KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUES]: false,
    [KANBAN_SETTINGS_KEYS.SHOW_FIELD_NAMES]: false,
    [KANBAN_SETTINGS_KEYS.TEXT_WRAP]: false,
    [KANBAN_SETTINGS_KEYS.COLUMNS_KEYS]: [],
    [KANBAN_SETTINGS_KEYS.SHOWN_COLUMNS_KEYS]: [],
  }
};
