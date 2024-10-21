import { PRIVATE_COLUMN_KEY } from './column';
import { FILTER_PREDICATE_TYPE } from './filter';
import { SORT_COLUMN_OPTIONS, GALLERY_SORT_COLUMN_OPTIONS, GALLERY_FIRST_SORT_COLUMN_OPTIONS, SORT_TYPE,
  GALLERY_SORT_PRIVATE_COLUMN_KEYS, GALLERY_FIRST_SORT_PRIVATE_COLUMN_KEYS,
} from './sort';

export const VIEW_TYPE = {
  TABLE: 'table',
  GALLERY: 'gallery',
};

export const FACE_RECOGNITION_VIEW_ID = '_face_recognition';

export const VIEW_TYPE_ICON = {
  [VIEW_TYPE.TABLE]: 'table',
  [VIEW_TYPE.GALLERY]: 'image',
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
};

export const VIEW_TYPE_DEFAULT_SORTS = {
  [VIEW_TYPE.TABLE]: [],
  [VIEW_TYPE.GALLERY]: [{ column_key: PRIVATE_COLUMN_KEY.FILE_CTIME, sort_type: SORT_TYPE.DOWN }],
};

export const VIEW_SORT_COLUMN_RULES = {
  [VIEW_TYPE.TABLE]: (column) => SORT_COLUMN_OPTIONS.includes(column.type),
  [VIEW_TYPE.GALLERY]: (column) => GALLERY_SORT_COLUMN_OPTIONS.includes(column.type) || GALLERY_SORT_PRIVATE_COLUMN_KEYS.includes(column.key),
};

export const VIEW_FIRST_SORT_COLUMN_RULES = {
  [VIEW_TYPE.TABLE]: (column) => SORT_COLUMN_OPTIONS.includes(column.type),
  [VIEW_TYPE.GALLERY]: (column) => GALLERY_FIRST_SORT_COLUMN_OPTIONS.includes(column.type) || GALLERY_FIRST_SORT_PRIVATE_COLUMN_KEYS.includes(column.key),
};
