export const COLUMN_CONFIG = {
  checkbox: {
    width: 32,
    flex: '0 0 32px',
    className: 'dirent-checkbox-wrapper',
    headerClassName: 'pl10 pr-2 cursor-pointer',
  },
  star: {
    width: 32,
    flex: '0 0 32px',
    className: 'dirent-operation dirent-operation-star',
  },
  icon: {
    width: 40,
    flex: '0 0 40px',
    className: 'dirent-thumbnail',
  },
  name: {
    width: 120,
    flex: '1 1 120px',
    className: 'dirent-property dirent-item-name',
  },
  size: {
    width: 100,
    flex: '0 1 120px',
    className: 'dirent-property dirent-property-size',
  },
  modified: {
    width: 160,
    flex: '0 1 160px',
    className: 'dirent-property dirent-property-modified',
  },
  creator: {
    width: 100,
    flex: '0 0 120px',
    className: 'dirent-property dirent-property-creator',
  },
  last_modifier: {
    width: 120,
    flex: '0 0 120px',
    className: 'dirent-property dirent-property-last-modifier',
  },
  status: {
    width: 100,
    flex: '0 0 120px',
    className: 'dirent-property dirent-property-status',
  },
};

export const TABLE_COLUMN_MIN_WIDTHS = Object.fromEntries(
  Object.entries(COLUMN_CONFIG).map(([key, config]) => [key, config.width])
);
