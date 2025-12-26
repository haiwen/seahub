import CellType from './type';

const COLUMNS_ICON_CONFIG = {
  [CellType.CREATOR]: 'user',
  [CellType.LAST_MODIFIER]: 'user',
  [CellType.CTIME]: 'creation-time',
  [CellType.MTIME]: 'creation-time',
  [CellType.DEFAULT]: 'text',
  [CellType.TEXT]: 'text',
  [CellType.FILE_NAME]: 'text',
  [CellType.CHECKBOX]: 'checkbox',
  [CellType.COLLABORATOR]: 'group',
  [CellType.DATE]: 'date',
  [CellType.LONG_TEXT]: 'long-text',
  [CellType.SINGLE_SELECT]: 'single-select',
  [CellType.MULTIPLE_SELECT]: 'multiple-select',
  [CellType.NUMBER]: 'number',
  [CellType.GEOLOCATION]: 'location',
  [CellType.RATE]: 'rate',
  [CellType.LINK]: 'link',
  [CellType.TAGS]: 'tag-filled',
};

const COLUMNS_ICON_NAME = {
  [CellType.CREATOR]: 'Creator',
  [CellType.LAST_MODIFIER]: 'Last modifier',
  [CellType.CTIME]: 'CTime',
  [CellType.MTIME]: 'Last modified time',
  [CellType.DEFAULT]: 'Text',
  [CellType.TEXT]: 'Text',
  [CellType.FILE_NAME]: 'File name',
  [CellType.CHECKBOX]: 'Checkbox',
  [CellType.COLLABORATOR]: 'Collaborator',
  [CellType.DATE]: 'Date',
  [CellType.LONG_TEXT]: 'Long text',
  [CellType.SINGLE_SELECT]: 'Single select',
  [CellType.MULTIPLE_SELECT]: 'Multiple select',
  [CellType.NUMBER]: 'Number',
  [CellType.GEOLOCATION]: 'Geolocation',
  [CellType.RATE]: 'Rate',
  [CellType.LINK]: 'Link',
  [CellType.TAGS]: 'Tag',
};

export {
  COLUMNS_ICON_CONFIG,
  COLUMNS_ICON_NAME,
};
