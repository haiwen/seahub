import { getColumnType } from './core';
import { CellType, NUMERIC_COLUMNS_TYPES } from '../../constants';

/**
 * Check whether is numeric column:
 *  - column type is number, duration or rate etc.
 *  - column type is formula and result_type is number
 *  - column type is link/link_formula and array_type is number, duration or rate etc.
 * @param {object} column e.g. { type, data }
 * @returns true/false, bool
 */
const isNumericColumn = (column) => {
  return NUMERIC_COLUMNS_TYPES.includes(getColumnType(column));
};

/**
 * Check whether is number column:
 *  - column type is number
 *  - column type is formula and result_type is number
 *  - column type is link/link_formula and array_type is number
 * @param {object} column e.g. { type, data }
 * @returns true/false, bool
 */
const isNumberColumn = (column) => {
  return getColumnType(column) === CellType.NUMBER;
};

export {
  isNumericColumn,
  isNumberColumn,
};
