import { PRIVATE_COLUMN_KEY } from '@/metadata/constants';

// Column visibility configuration
export const DIR_COLUMN_KEYS = {
  SIZE: 'size',
  MTIME: 'mtime',
};

// Columns that can be hidden (essential columns like checkbox, star, icon, name are always visible)
export const CONFIGURABLE_COLUMNS = [
  DIR_COLUMN_KEYS.SIZE,
  DIR_COLUMN_KEYS.MTIME,
  PRIVATE_COLUMN_KEY.FILE_CREATOR,
  PRIVATE_COLUMN_KEY.LAST_MODIFIER,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
];

// Columns that require metadata feature
export const METADATA_COLUMNS = [
  PRIVATE_COLUMN_KEY.FILE_CREATOR,
  PRIVATE_COLUMN_KEY.LAST_MODIFIER,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
];

export const DEFAULT_VISIBLE_COLUMNS = [
  DIR_COLUMN_KEYS.SIZE,
  DIR_COLUMN_KEYS.MTIME,
];

export const ESSENTIAL_COLUMNS = ['checkbox', 'star', 'icon', 'name'];

// Storage key for localStorage
export const DIR_COLUMN_VISIBILITY_STORAGE_KEY = 'dir_column_visibility';
