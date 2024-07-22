import {
  getFormattedFilters,
  deleteInvalidFilter,
} from './core';
import {
  creatorFilter,
  dateFilter,
  textFilter,
  checkboxFilter,
  singleSelectFilter,
  collaboratorFilter,
  numberFilter,
} from './filter-column';
import {
  FILTER_CONJUNCTION_TYPE,
} from '../../constants/filter';
import { DateUtils } from '../date';
import { CellType, DATE_FORMAT_MAP } from '../../constants/column';
import { getCellValueByColumn } from '../cell';

const getFilterResult = (row, filter, { username, userId }) => {
  const { column } = filter;
  let cellValue = getCellValueByColumn(row, column);
  switch (column.type) {
    case CellType.CTIME:
    case CellType.MTIME:
    case CellType.DATE: {
      cellValue = DateUtils.format(cellValue, DATE_FORMAT_MAP.YYYY_MM_DD);
      return dateFilter(cellValue, filter);
    }
    case CellType.FILE_NAME:
    case CellType.TEXT: {
      return textFilter(cellValue, filter, userId);
    }
    case CellType.LAST_MODIFIER:
    case CellType.CREATOR: {
      return creatorFilter(cellValue, filter, username);
    }
    case CellType.CHECKBOX: {
      return checkboxFilter(cellValue, filter);
    }
    case CellType.SINGLE_SELECT: {
      return singleSelectFilter(cellValue, filter);
    }
    case CellType.NUMBER: {
      return numberFilter(cellValue, filter);
    }
    case CellType.COLLABORATOR: {
      return collaboratorFilter(cellValue, filter, username);
    }
    default: {
      return false;
    }
  }
};

/**
 * Filter row
 * @param {object} row e.g. { _id, .... }
 * @param {string} filterConjunction e.g. 'And' | 'Or'
 * @param {array} filters e.g. [{ column_key, filter_predicate, ... }, ...]
 * @param {object} formulaRow
 * @param {string} username
 * @param {string} userId
 * @param {object} userDepartmentIdsMap e.g. { current_user_department_ids: [8, 10], current_user_department_and_sub_ids: [8, 10, 12, 34] }
 * @returns filter result, bool
 */
const filterRow = (row, filterConjunction, filters, { username = '', userId } = {}) => {
  if (filterConjunction === FILTER_CONJUNCTION_TYPE.AND) {
    return filters.every((filter) => (
      getFilterResult(row, filter, { username, userId })
    ));
  }
  if (filterConjunction === FILTER_CONJUNCTION_TYPE.OR) {
    return filters.some((filter) => (
      getFilterResult(row, filter, { username, userId })
    ));
  }
  return false;
};

/**
 * Filter rows
 * @param {string} filterConjunction e.g. 'And' | 'Or'
 * @param {array} filters e.g. [{ column_key, filter_predicate, ... }, ...]
 * @param {array} rows e.g. [{ _id, .... }, ...]
 * @param {string} username
 * @param {string} userId
 * @returns filtered rows ids, array
 */
const filterRows = (filterConjunction, filters, rows, { username, userId }) => {
  let filteredRows = [];
  const formattedFilters = getFormattedFilters(filters);
  rows.forEach((row) => {
    const rowId = row._id;
    if (filterRow(row, filterConjunction, formattedFilters, { username, userId })) {
      filteredRows.push(rowId);
    }
  });
  return filteredRows;
};

/**
 * Filter rows without formula calculation
 * The "formulaRows" need to be provided if you want to filter formula, link columns etc.
 * @param {object} table e.g. { columns, ... }
 * @param {array} rows e.g. [{ _id, .... }, ...]
 * @param {string} filterConjunction e.g. 'And' | 'Or'
 * @param {array} filters e.g. [{ column_key, filter_predicate, ... }, ...]
 * @param {string} username
 * @param {string} userId
 * @returns filtered rows: row_ids and error message: error_message, object
 */
const getFilteredRows = (table, rows, filterConjunction, filters, { username = null, userId = null } = {}) => {
  const { columns } = table;
  let validFilters = [];
  try {
    validFilters = deleteInvalidFilter(filters, columns);
  } catch (err) {
    return { row_ids: [], error_message: err.message };
  }

  let filteredRows = [];
  if (validFilters.length === 0) {
    filteredRows = rows.map((row) => row._id);
  } else {
    filteredRows = filterRows(filterConjunction, validFilters, rows, { username, userId });
  }

  return { row_ids: filteredRows, error_message: null };
};

export {
  filterRow,
  filterRows,
  getFilteredRows,
};
