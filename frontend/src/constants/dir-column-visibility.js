// Column visibility configuration
export const DIR_COLUMN_KEYS = {
  SIZE: 'size',
  MODIFIED: 'modified',
  CREATOR: 'creator',
  LAST_MODIFIER: 'last_modifier',
  STATUS: 'status',
};

// Columns that can be hidden (essential columns like checkbox, star, icon, name are always visible)
export const CONFIGURABLE_COLUMNS = [
  DIR_COLUMN_KEYS.SIZE,
  DIR_COLUMN_KEYS.MODIFIED,
  DIR_COLUMN_KEYS.CREATOR,
  DIR_COLUMN_KEYS.LAST_MODIFIER,
  DIR_COLUMN_KEYS.STATUS,
];

// Default visible columns (what shows when no config exists)
export const DEFAULT_VISIBLE_COLUMNS = [
  DIR_COLUMN_KEYS.SIZE,
  DIR_COLUMN_KEYS.MODIFIED,
  DIR_COLUMN_KEYS.CREATOR,
];

// All available columns with metadata
export const DIR_ALL_COLUMNS = {
  [DIR_COLUMN_KEYS.SIZE]: { key: DIR_COLUMN_KEYS.SIZE, name: 'Size', minWidth: 100 },
  [DIR_COLUMN_KEYS.MODIFIED]: { key: DIR_COLUMN_KEYS.MODIFIED, name: 'Last Update', minWidth: 140 },
  [DIR_COLUMN_KEYS.CREATOR]: { key: DIR_COLUMN_KEYS.CREATOR, name: 'Creator', minWidth: 140 },
  [DIR_COLUMN_KEYS.LAST_MODIFIER]: { key: DIR_COLUMN_KEYS.LAST_MODIFIER, name: 'Last Modifier', minWidth: 140 },
  [DIR_COLUMN_KEYS.STATUS]: { key: DIR_COLUMN_KEYS.STATUS, name: 'Status', minWidth: 100 },
};

// Essential columns (always visible, cannot be hidden)
export const ESSENTIAL_COLUMNS = ['checkbox', 'star', 'icon', 'name'];

// Storage key for localStorage
export const DIR_COLUMN_VISIBILITY_STORAGE_KEY = 'dir_column_visibility';
