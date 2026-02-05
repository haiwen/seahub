import { CellType, PRIVATE_COLUMN_KEY } from '@/metadata/constants';
import { gettext } from '@/utils/constants';

// Column visibility configuration
export const DIR_COLUMN_KEYS = {
  SIZE: 'size',
  MTIME: 'mtime',
};

export const DIR_BASE_COLUMNS = [
  { key: DIR_COLUMN_KEYS.SIZE, name: gettext('Size'), type: CellType.NUMBER },
  { key: DIR_COLUMN_KEYS.MTIME, name: gettext('Last modified'), type: CellType.MTIME }
];

// Columns that can be hidden (essential columns like checkbox, star, icon, name are always visible)
export const CONFIGURABLE_COLUMNS = [
  DIR_COLUMN_KEYS.SIZE,
  DIR_COLUMN_KEYS.MTIME,
  PRIVATE_COLUMN_KEY.FILE_CREATOR,
  PRIVATE_COLUMN_KEY.FILE_MODIFIER,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
];

// Columns that require metadata feature
export const DIR_METADATA_COLUMNS = [
  PRIVATE_COLUMN_KEY.FILE_CREATOR,
  PRIVATE_COLUMN_KEY.FILE_MODIFIER,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
];

export const ESSENTIAL_COLUMNS = ['checkbox', 'star', 'icon', 'name'];

// Storage key for localStorage
export const DIR_HIDDEN_COLUMN_KEYS = 'dir_hidden_column_keys';
