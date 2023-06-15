import * as zIndexes from './zIndexes';
import KeyCodes from './keyCodes';

export const DIALOG_MAX_HEIGHT = window.innerHeight - 56; // Dialog margin is 3.5rem (56px)

export const LEDGER_COLUMN_TYPE = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  FORMULA: 'formula',
  SINGLE_SELECT: 'single-select',
};

export const LEDGER_CAN_EDIT_COLUMN_NAMES = [
  '文件大分类',
  '文件中分类',
  '文件小分类',
  '密级',
  '保密期限'
];

export const FORMULA_RESULT_TYPE = {
  NUMBER: 'number',
  STRING: 'string',
  DATE: 'date',
  BOOL: 'bool',
  ARRAY: 'array',
};

export const DELETED_OPTION_BACKGROUND_COLOR = '#eaeaea';

export const DELETED_OPTION_TIPS = 'Deleted option';

export const DEFAULT_NUMBER_FORMAT = 'number';

export const ERROR = 'ERROR';
export const ERROR_DIV_ZERO = 'DIV/0';
export const ERROR_NAME = 'NAME';
export const ERROR_NOT_AVAILABLE = 'N/A';
export const ERROR_NULL = 'NULL';
export const ERROR_NUM = 'NUM';
export const ERROR_REF = 'REF';
export const ERROR_VALUE = 'VALUE';
export const GETTING_DATA = 'GETTING_DATA';

const errors = {
  [ERROR]: '#ERROR!',
  [ERROR_DIV_ZERO]: '#DIV/0!',
  [ERROR_NAME]: '#NAME?',
  [ERROR_NOT_AVAILABLE]: '#N/A',
  [ERROR_NULL]: '#NULL!',
  [ERROR_NUM]: '#NUM!',
  [ERROR_REF]: '#REF!',
  [ERROR_VALUE]: '#VALUE!',
  [GETTING_DATA]: '#GETTING_DATA',
};

export const DISPLAY_INTERNAL_ERRORS = [
  errors[ERROR],
  errors[ERROR_DIV_ZERO],
  errors[ERROR_NAME],
  errors[ERROR_NOT_AVAILABLE],
  errors[ERROR_NULL],
  errors[ERROR_NUM],
  errors[ERROR_REF],
  errors[ERROR_VALUE],
  errors[GETTING_DATA],
];

export const DURATION_FORMATS_MAP = {
  H_MM: 'h:mm',
  H_MM_SS: 'h:mm:ss',
  H_MM_SS_S: 'h:mm:ss.s',
  H_MM_SS_SS: 'h:mm:ss.ss',
  H_MM_SS_SSS: 'h:mm:ss.sss'
};

export const DURATION_FORMATS = [
  { name: DURATION_FORMATS_MAP.H_MM, type: DURATION_FORMATS_MAP.H_MM },
  { name: DURATION_FORMATS_MAP.H_MM_SS, type: DURATION_FORMATS_MAP.H_MM_SS }
];

export const DURATION_ZERO_DISPLAY = {
  [DURATION_FORMATS_MAP.H_MM]: '0:00',
  [DURATION_FORMATS_MAP.H_MM_SS]: '0:00',
  [DURATION_FORMATS_MAP.H_MM_SS_S]: '0:00.0',
  [DURATION_FORMATS_MAP.H_MM_SS_SS]: '0:00.00',
  [DURATION_FORMATS_MAP.H_MM_SS_SSS]: '0:00.000',
};

export const DURATION_DECIMAL_DIGITS = {
  [DURATION_FORMATS_MAP.H_MM]: 0,
  [DURATION_FORMATS_MAP.H_MM_SS]: 0,
  [DURATION_FORMATS_MAP.H_MM_SS_S]: 1,
  [DURATION_FORMATS_MAP.H_MM_SS_SS]: 2,
  [DURATION_FORMATS_MAP.H_MM_SS_SSS]: 3,
};

export {
  KeyCodes,
  zIndexes,
};
