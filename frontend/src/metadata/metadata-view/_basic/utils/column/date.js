import { getColumnType } from './core';
import { DATE_COLUMN_OPTIONS, DATE_FORMAT_MAP } from '../../constants/column';

/**
 * Check whether is date column:
 *  - column type is date, ctime or mtime etc.
 *  - column type is formula and result_type is date
 *  - column type is link/link_fromula and array_type is date, ctime or mtime etc.
 * @param {object} column e.g. { type, data }
 * @returns true/false, bool
 */
const isDateColumn = (column) => DATE_COLUMN_OPTIONS.includes(getColumnType(column));

/**
 * Check whether the format is supported in date column
 * @param {string} format
 * @returns bool
 */
const isSupportDateColumnFormat = (format) => {
  if (!format) {
    return false;
  }
  return (
    format === DATE_FORMAT_MAP.YYYY_MM_DD
    || format === DATE_FORMAT_MAP.YYYY_MM_DD_HH_MM
    || format === DATE_FORMAT_MAP.YYYY_MM_DD_HH_MM_SS
  );
};

export { isDateColumn, isSupportDateColumnFormat };
