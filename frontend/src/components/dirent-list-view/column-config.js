export const COLUMN_CONFIG = {
  checkbox: {
    width: 32,
    className: 'dirent-checkbox-wrapper',
    headerClassName: 'pl10 pr-2 cursor-pointer',
  },
  star: {
    width: 32,
    className: 'dirent-operation dirent-operation-star',
  },
  icon: {
    width: 40,
    className: 'dirent-thumbnail',
  },
  name: {
    width: 120,
    className: 'dirent-property dirent-item-name',
  },
  size: {
    width: 100,
    className: 'dirent-property dirent-property-size',
  },
  modified: {
    width: 160,
    className: 'dirent-property dirent-property-modified',
  },
  creator: {
    width: 100,
    className: 'dirent-property dirent-property-creator',
  },
  last_modifier: {
    width: 120,
    className: 'dirent-property dirent-property-last-modifier',
  },
  status: {
    width: 100,
    className: 'dirent-property dirent-property-status',
  },
};

export const TABLE_COLUMN_MIN_WIDTHS = Object.fromEntries(
  Object.entries(COLUMN_CONFIG).map(([key, config]) => [key, config.width])
);
