import { deleteInvalidSort } from './core';
import {
  sortDate,
  sortText,
  sortSingleSelect,
  sortNumber,
  sortCollaborator,
  sortCheckbox,
  sortMultipleSelect,
} from './sort-column';
import { CellType, DATE_COLUMN_OPTIONS, NUMBER_SORTER_COLUMN_TYPES } from '../../constants';
import { getCellValueByColumn, getCollaboratorsNames } from '../cell';

/**
 * Sort rows with multiple sorts
 * @param {array} tableRows e.g. [{ _id, [column.key]: '', ...}, ...]
 * @param {array} sorts e.g. [{ column_key, sort_type, column, ... }, ...]
 * @param {object} value e.g. { collaborators, ... }
 */
const sortRowsWithMultiSorts = (tableRows, sorts, { collaborators }) => {
  tableRows.sort((currentRow, nextRow) => {
    let initValue = 0;
    sorts.forEach((sort) => {
      const { sort_type, column } = sort;
      const { type: columnType } = column;
      let currCellVal = getCellValueByColumn(currentRow, column);
      let nextCellVal = getCellValueByColumn(nextRow, column);
      if (DATE_COLUMN_OPTIONS.includes(columnType)) {
        initValue = initValue || sortDate(currCellVal, nextCellVal, sort_type);
      } else if (columnType === CellType.SINGLE_SELECT) {
        initValue = initValue || sortSingleSelect(currCellVal, nextCellVal, sort);
      } else if (NUMBER_SORTER_COLUMN_TYPES.includes(columnType)) {
        initValue = initValue || sortNumber(currCellVal, nextCellVal, sort_type);
      } else if (columnType === CellType.MULTIPLE_SELECT) {
        initValue = initValue || sortMultipleSelect(currCellVal, nextCellVal, sort);
      } else if (columnType === CellType.COLLABORATOR) {
        let currValidCollaborators = currCellVal;
        let nextValidCollaborators = nextCellVal;
        if (collaborators) {
          currValidCollaborators = getCollaboratorsNames(currCellVal, collaborators);
          nextValidCollaborators = getCollaboratorsNames(nextCellVal, collaborators);
        }
        initValue = initValue || sortCollaborator(currValidCollaborators, nextValidCollaborators, sort_type);
      } else if (columnType === CellType.CHECKBOX) {
        initValue = initValue || sortCheckbox(currCellVal, nextCellVal, sort_type);
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
const sortTableRows = (table, rows, sorts, { collaborators, isReturnID = true } = {}) => {
  const { columns } = table;
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const sortRows = rows.slice(0);
  const validSorts = deleteInvalidSort(sorts, columns);
  sortRowsWithMultiSorts(sortRows, validSorts, { collaborators });
  return isReturnID ? sortRows.map((row) => row._id) : sortRows;
};

export {
  sortRowsWithMultiSorts,
  sortTableRows,
};
