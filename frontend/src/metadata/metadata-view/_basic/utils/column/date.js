import dayjs from 'dayjs';
import { getColumnType } from './core';
import { DATE_COLUMN_OPTIONS, DATE_FORMAT_MAP, DEFAULT_DATE_FORMAT } from '../../constants/column';

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

/**
 * Get formatted date
 * @param {string} date e.g. "2023-07-06 11:30"
 * @param {string} format e.g. "YYYY-MM-DD"
 * @returns formatted date, string
 */
const getDateDisplayString = (date, format) => {
  if (!date || typeof date !== 'string') {
    return '';
  }

  const dateObj = dayjs(date);
  if (!dateObj.isValid()) return date;
  switch (format) {
    case 'D/M/YYYY':
    case 'DD/MM/YYYY': {
      const formatValue = dateObj.format('YYYY-MM-DD');
      const formatValueList = formatValue.split('-');
      return `${formatValueList[2]}/${formatValueList[1]}/${formatValueList[0]}`;
    }
    case 'D/M/YYYY HH:mm':
    case 'DD/MM/YYYY HH:mm': {
      const formatValues = dateObj.format('YYYY-MM-DD HH:mm');
      const formatValuesList = formatValues.split(' ');
      const formatDateList = formatValuesList[0].split('-');
      return `${formatDateList[2]}/${formatDateList[1]}/${formatDateList[0]} ${formatValuesList[1]}`;
    }
    case 'M/D/YYYY':
      return dateObj.format('M/D/YYYY');
    case 'M/D/YYYY HH:mm':
      return dateObj.format('M/D/YYYY HH:mm');
    case 'YYYY-MM-DD':
      return dateObj.format('YYYY-MM-DD');
    case 'YYYY-MM-DD HH:mm':
      return dateObj.format('YYYY-MM-DD HH:mm');
    case 'YYYY-MM-DD HH:mm:ss': {
      return dateObj.format('YYYY-MM-DD HH:mm:ss');
    }
    case 'DD.MM.YYYY':
      return dateObj.format('DD.MM.YYYY');
    case 'DD.MM.YYYY HH:mm':
      return dateObj.format('DD.MM.YYYY HH:mm');
    default:
      // Compatible with older versions: if format is null, use defaultFormat
      return dateObj.format('YYYY-MM-DD');
  }
};

const getDateColumnFormat = (column) => {
  let format = (column && column.data && column.data.format) ? column.data.format : DEFAULT_DATE_FORMAT;
  // Old Europe format is D/M/YYYY new format is DD/MM/YYYY
  format = format.replace(/D\/M\/YYYY/, 'DD/MM/YYYY');
  return format;
};

export { isDateColumn, isSupportDateColumnFormat, getDateColumnFormat, getDateDisplayString };
