import { SORT_COLUMN_OPTIONS } from '../../constants/sort';
import { CellType } from '../../constants/column';
import { getColumnOptions } from '../column';

/**
 * Check is valid sort
 * @param {object} sort e.g. { column_key, sort_type, ... }
 * @param {array} columns
 * @returns bool
 */
const isValidSort = (sort, columns) => {
  const sortByColumn = sort && columns.find((column) => column.key === sort.column_key);
  if (!sortByColumn) return false;

  return SORT_COLUMN_OPTIONS.includes(sortByColumn.type);
};

/**
 * Get valid sorts
 *   1. sort column is exist or not
 *   2. valid sort type
 * @param {array} sorts e.g. [{ column_key, sort_type, ... }, ...]
 * @param {array} columns
 * @returns valid sorts, array
 */
const getValidSorts = (sorts, columns) => {
  if (!Array.isArray(sorts) || !Array.isArray(columns)) return [];

  return sorts.filter((sort) => isValidSort(sort, columns));
};

/**
 * Get sorted option index of the "optionIds"
 * @param {array} optionIds
 * @param {object} option_id_index_map e.g. {[option.id]: 0, ...}
 * @returns sorted options index, array
 */
const getMultipleIndexesOrderbyOptions = (optionIds, option_id_index_map) => {
  let indexArr = [];
  optionIds.forEach((optionId) => {
    const index = option_id_index_map[optionId];
    if (index > -1) {
      indexArr.push(index);
    }
  });
  return indexArr.sort();
};

/**
 * Get valid and formatted sorts
 * @param {array} sorts e.g. [{ column_key, sort_type, ... }, ...]
 * @param {array} columns
 * @returns valid and formatted sorts, array
 */
const deleteInvalidSort = (sorts, columns) => {
  const validSorts = getValidSorts(sorts, columns);
  let cleanSorts = [];
  validSorts.forEach((sort) => {
    const { column_key } = sort;
    const sortColumn = columns.find((column) => column.key === column_key);
    let newSort = { ...sort, column: sortColumn };
    const { type: columnType } = sortColumn;
    switch (columnType) {
      case CellType.SINGLE_SELECT: {
        const options = getColumnOptions(sortColumn);
        let option_id_index_map = {};
        options.forEach((option, index) => {
          option_id_index_map[option.id] = index;
        });
        newSort.option_id_index_map = option_id_index_map;
        break;
      }
      default: {
        break;
      }
    }
    cleanSorts.push(newSort);
  });
  return cleanSorts;
};

export {
  isValidSort,
  getValidSorts,
  deleteInvalidSort,
  getMultipleIndexesOrderbyOptions,
};
