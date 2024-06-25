import { deleteInvalidSort } from './core';
import {
  sortDate,
  sortText,
} from './sort-column';
import { DATE_COLUMN_OPTIONS } from '../../constants/column';

/**
 * Sort rows with multiple sorts
 * @param {array} tableRows e.g. [{ _id, [column.key]: '', ...}, ...]
 * @param {array} sorts e.g. [{ column_key, sort_type, column, ... }, ...]
 * @param {object} value e.g. { collaborators, ... }
 */
const sortRowsWithMultiSorts = (tableRows, sorts) => {
  tableRows.sort((currentRow, nextRow) => {
    let initValue = 0;
    sorts.forEach((sort) => {
      const { column_key, sort_type, column } = sort;
      const { type: columnType } = column;
      let currCellVal = currentRow[column_key];
      let nextCellVal = nextRow[column_key];
      if (DATE_COLUMN_OPTIONS.includes(columnType)) {
        initValue = initValue || sortDate(currCellVal, nextCellVal, sort_type);
      } else {
        initValue = initValue || sortText(currCellVal, nextCellVal, sort_type);
      }
    });
    return initValue;
  });
};

/**
 * Get sorted rows ids from table rows with multiple sorts
 * @param {array} sorts e.g. [{ column_key, sort_type, column, ... }, ...]
 * @param {array} rows e.g. [{ _id, [column.key]: '', ...}, ...]
 * @param {array} columns e.g. [{ key, type, ... }, ...]
 * @param {object} value e.g. { collaborators, ... }
 * @returns sorted rows ids, array
 */
const sortTableRows = (sorts, rows, columns) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const sortRows = rows.slice(0);
  const validSorts = deleteInvalidSort(sorts, columns);
  sortRowsWithMultiSorts(sortRows, validSorts);
  return sortRows.map((row) => row._id);
};

export {
  sortRowsWithMultiSorts,
  sortTableRows,
};
