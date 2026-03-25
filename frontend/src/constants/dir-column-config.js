import { CellType, PRIVATE_COLUMN_KEY } from '@/metadata/constants';
import { gettext } from '@/utils/constants';

// List mode
export const DIR_COLUMN_KEYS = {
  FILE_NAME: '_name',
  SIZE: '_size',
  MTIME: '_mtime',
};

export const DIR_BASE_COLUMNS = [
  { key: PRIVATE_COLUMN_KEY.FILE_NAME, name: gettext('Name'), type: CellType.FILE_NAME },
  { key: DIR_COLUMN_KEYS.SIZE, name: gettext('Size'), type: CellType.NUMBER, data: { format: 'byte' } },
  { key: DIR_COLUMN_KEYS.MTIME, name: gettext('Last modified'), type: CellType.MTIME }
];

export const CONFIGURABLE_COLUMNS = [
  DIR_COLUMN_KEYS.SIZE,
  DIR_COLUMN_KEYS.MTIME,
  PRIVATE_COLUMN_KEY.FILE_CREATOR,
  PRIVATE_COLUMN_KEY.FILE_MODIFIER,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
  PRIVATE_COLUMN_KEY.TAGS,
];

export const DIR_METADATA_COLUMNS = [
  PRIVATE_COLUMN_KEY.FILE_CREATOR,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
  PRIVATE_COLUMN_KEY.TAGS,
];

export const ESSENTIAL_COLUMNS = ['checkbox', 'star', 'icon', 'name'];

// List mode hidden column keys - per repo
export const getDirHiddenColumnKeys = (repoID) => `dir_hidden_column_keys_${repoID}`;

// table mode
export const DIR_TABLE_DEFAULT_METADATA_COLUMNS = [
  PRIVATE_COLUMN_KEY.FILE_NAME,
  PRIVATE_COLUMN_KEY.SIZE,
  DIR_COLUMN_KEYS.MTIME,
  PRIVATE_COLUMN_KEY.FILE_CREATOR,
  PRIVATE_COLUMN_KEY.FILE_MODIFIER,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
];

export const DIR_TABLE_NOT_DISPLAY_COLUMN_KEYS = [
  PRIVATE_COLUMN_KEY.ID,
  PRIVATE_COLUMN_KEY.OBJ_ID,
  PRIVATE_COLUMN_KEY.IS_DIR,
  PRIVATE_COLUMN_KEY.DTIME,
  PRIVATE_COLUMN_KEY.PARENT_DIR,
  PRIVATE_COLUMN_KEY.FILE_DETAILS,
  PRIVATE_COLUMN_KEY.CREATOR,
  PRIVATE_COLUMN_KEY.LAST_MODIFIER,
  PRIVATE_COLUMN_KEY.CTIME,
  PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED,
  PRIVATE_COLUMN_KEY.SUFFIX,
];

// Table mode hidden column keys - per repo
export const getDirTableHiddenColumnKeys = (repoID) => `sf_dir_table_hidden_column_keys_${repoID}`;
