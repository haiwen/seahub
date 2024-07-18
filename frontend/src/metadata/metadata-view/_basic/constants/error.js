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
