const CellType = {
  DEFAULT: 'default',
  TEXT: 'text',
  CREATOR: 'creator',
  CTIME: 'ctime',
  LAST_MODIFIER: 'last-modifier',
  MTIME: 'mtime',
  FILE_NAME: 'file-name',
  CHECKBOX: 'checkbox',
  COLLABORATOR: 'collaborator',
  DATE: 'date',
  LONG_TEXT: 'long-text',
  SINGLE_SELECT: 'single-select',
  MULTIPLE_SELECT: 'multiple-select',
  NUMBER: 'number',
  GEOLOCATION: 'geolocation',
  RATE: 'rate',
  LINK: 'link',
  SIZE: 'size',
  TAGS: 'tags'
};

export default CellType;

export const POPUP_EDITOR_COLUMN_TYPES = [
  CellType.DATE,
  CellType.COLLABORATOR,
  CellType.SINGLE_SELECT,
  CellType.MULTIPLE_SELECT,
  CellType.LONG_TEXT,
  CellType.LINK,
  CellType.TAGS,
  CellType.GEOLOCATION,
];
