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

// Columns that require metadata feature
export const METADATA_COLUMNS = [
  DIR_COLUMN_KEYS.CREATOR,
  DIR_COLUMN_KEYS.LAST_MODIFIER,
  DIR_COLUMN_KEYS.STATUS,
];

// Default visible columns WITHOUT metadata (for when metadata is disabled)
export const DEFAULT_VISIBLE_COLUMNS = [
  DIR_COLUMN_KEYS.SIZE,
  DIR_COLUMN_KEYS.MODIFIED,
];

// Default visible columns WITH metadata (for when metadata is enabled)
export const DEFAULT_VISIBLE_COLUMNS_WITH_METADATA = [
  DIR_COLUMN_KEYS.SIZE,
  DIR_COLUMN_KEYS.MODIFIED,
  DIR_COLUMN_KEYS.CREATOR,
  DIR_COLUMN_KEYS.LAST_MODIFIER,
  DIR_COLUMN_KEYS.STATUS,
];

// Essential columns (always visible, cannot be hidden)
export const ESSENTIAL_COLUMNS = ['checkbox', 'star', 'icon', 'name'];

// Storage key for localStorage
export const DIR_COLUMN_VISIBILITY_STORAGE_KEY = 'dir_column_visibility';
