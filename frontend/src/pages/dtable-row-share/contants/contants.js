export const CELL_TYPE = {
  'TEXT': 'text',
  'LONG_TEXT': 'long-text',
  'CHECKBOX': 'checkbox',
  'NUMBER': 'number',
  'DATE': 'date',
  'SINGLE_SELECT': 'single-select',
  'MULTIPLE_SELECT': 'multiple-select',
  'COLLABORATOR': 'collaborator',
  'FILE': 'file',
  'IMAGE': 'image'
};

export const CELL_ICON = {
  [CELL_TYPE.TEXT]: 'dtable-font dtable-icon-single-line-text',
  [CELL_TYPE.LONG_TEXT]: 'dtable-font dtable-icon-long-text',
  [CELL_TYPE.CHECKBOX]: 'dtable-font dtable-icon-check-squre-solid',
  [CELL_TYPE.NUMBER]: 'dtable-font dtable-icon-number',
  [CELL_TYPE.DATE]: 'dtable-font dtable-icon-calendar-alt-solid',
  [CELL_TYPE.SINGLE_SELECT]: 'dtable-font dtable-icon-single-election',
  [CELL_TYPE.MULTIPLE_SELECT]: 'dtable-font dtable-icon-multiple-selection',
  [CELL_TYPE.COLLABORATOR]: 'dtable-font dtable-icon-collaborator',
  [CELL_TYPE.FILE]: 'dtable-font dtable-icon-file-alt-solid',
  [CELL_TYPE.IMAGE]: 'dtable-font dtable-icon-picture',
};
