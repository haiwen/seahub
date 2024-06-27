import { getRowsByIds } from '../table/row';
import { DateUtils } from '../date';
import {
  sortDate,
  sortText,
} from '../sort/sort-column';
import { MAX_GROUP_LEVEL } from '../../constants/group';
import {
  CellType,
  DATE_COLUMN_OPTIONS,
  MULTIPLE_CELL_VALUE_COLUMN_TYPE_MAP,
  SINGLE_CELL_VALUE_COLUMN_TYPE_MAP,
} from '../../constants/column';
import {
  SORT_COLUMN_OPTIONS,
  SORT_TYPE,
  TEXT_SORTER_COLUMN_TYPES,
} from '../../constants/sort';

const _getCellValue = (row, groupby) => {
  const { column_key } = groupby;
  let cellValue = row[column_key];
  return cellValue;
};

const _getFormattedCellValue = (cellValue, groupby) => {
  const { column, count_type: countType } = groupby;
  const { type: columnType } = column;
  switch (columnType) {
    case CellType.TEXT:
    case CellType.LAST_MODIFIER:
    case CellType.CREATOR: {
      return cellValue || null;
    }
    case CellType.CTIME:
    case CellType.MTIME: {
      return DateUtils.getDateByGranularity(cellValue, countType) || null;
    }
    default: {
      return null;
    }
  }
};

const _getStrCellValue = (cellValue, columnType) => {
  let sCellValue = null;
  if (SINGLE_CELL_VALUE_COLUMN_TYPE_MAP[columnType]) {
    sCellValue = typeof cellValue === 'string' ? cellValue : String(cellValue);
  } else if (MULTIPLE_CELL_VALUE_COLUMN_TYPE_MAP[columnType]) {
    sCellValue = [...cellValue].sort().toString();
  }
  return sCellValue;
};

const _findGroupIndexWithMultipleGroupbys = (sCellValue, cellValue2GroupIndexMap, groupsLength) => {
  const target = cellValue2GroupIndexMap[sCellValue];
  if (target && target.index > -1) {
    return target.index;
  }

  // eslint-disable-next-line
  cellValue2GroupIndexMap[sCellValue] = {};

  // eslint-disable-next-line
  cellValue2GroupIndexMap[sCellValue].subgroups = {};

  // eslint-disable-next-line
  cellValue2GroupIndexMap[sCellValue].index = groupsLength;
  return -1;
};

const _findGroupIndex = (sCellValue, cellValue2GroupIndexMap, groupsLength) => {
  const index = cellValue2GroupIndexMap[sCellValue];
  if (index > -1) {
    return index;
  }

  // eslint-disable-next-line
  cellValue2GroupIndexMap[sCellValue] = groupsLength;
  return -1;
};

const getSortedGroups = (groups, groupbys, level) => {
  const sortFlag = 0;
  const { column, sort_type } = groupbys[level];
  const { type: columnType } = column;
  const normalizedSortType = sort_type || SORT_TYPE.UP;
  groups.sort((currGroupRow, nextGroupRow) => {
    let { cell_value: currCellVal } = currGroupRow;
    let { cell_value: nextCellVal } = nextGroupRow;
    if (SORT_COLUMN_OPTIONS.includes(columnType)) {
      let sortResult;
      if (TEXT_SORTER_COLUMN_TYPES.includes(columnType)) {
        sortResult = sortText(currCellVal, nextCellVal, normalizedSortType);
      } else if (DATE_COLUMN_OPTIONS.includes(columnType)) {
        sortResult = sortDate(currCellVal, nextCellVal, normalizedSortType);
      }
      return sortFlag || sortResult;
    }
    if (currCellVal === '') return 1;
    if (nextCellVal === '') return -1;
    return 0;
  });

  // for nested group.
  const isNestedGroup = Array.isArray(groups[0].subgroups) && groups[0].subgroups.length > 0;
  if (isNestedGroup) {
    const nextLevel = level + 1;

    // eslint-disable-next-line
    groups = groups.map((group) => {
      const sortedSubgroups = getSortedGroups(group.subgroups, groupbys, nextLevel);
      return {
        ...group,
        subgroups: sortedSubgroups,
      };
    });
  }
  return groups;
};

const groupRowsWithMultipleGroupbys = (groupbys, rows, value) => {
  const validGroupbys = groupbys.length > MAX_GROUP_LEVEL
    ? groupbys.slice(0, MAX_GROUP_LEVEL)
    : [...groupbys];
  let groups = [];
  let cellValue2GroupIndexMap = {};
  rows.forEach((row) => {
    const rowId = row._id;
    let updatedGroup;
    let updateCellValue2GroupIndexMap;
    for (let level = 0; level < validGroupbys.length; level++) {
      const currentGroupby = validGroupbys[level];
      const { column, column_key } = currentGroupby;
      const { type: columnType } = column;
      const cellValue = _getCellValue(row, currentGroupby);
      const formattedValue = _getFormattedCellValue(cellValue, currentGroupby);
      const sCellValue = _getStrCellValue(formattedValue, columnType);
      const group = {
        cell_value: formattedValue,
        original_cell_value: cellValue,
        row_ids: null,
        column_key,
        subgroups: [],
        summaries: {},
      };
      if (level === 0) {
        let groupedRowIndex = _findGroupIndexWithMultipleGroupbys(sCellValue, cellValue2GroupIndexMap, groups.length);
        updateCellValue2GroupIndexMap = cellValue2GroupIndexMap[sCellValue].subgroups;
        if (groupedRowIndex < 0) {
          groups.push(group);
          updatedGroup = groups[groups.length - 1];
        } else {
          updatedGroup = groups[groupedRowIndex];
        }
      } else {
        let groupedRowIndex = _findGroupIndexWithMultipleGroupbys(sCellValue, updateCellValue2GroupIndexMap, updatedGroup.subgroups.length);
        updateCellValue2GroupIndexMap = updateCellValue2GroupIndexMap[sCellValue].subgroups;
        if (groupedRowIndex < 0) {
          updatedGroup.subgroups.push(group);
          updatedGroup = updatedGroup.subgroups[updatedGroup.subgroups.length - 1];
        } else {
          updatedGroup = updatedGroup.subgroups[groupedRowIndex];
        }

        // update row_ids in the deepest group.
        if (level === validGroupbys.length - 1) {
          if (!updatedGroup.row_ids) {
            updatedGroup.row_ids = [rowId];
          } else {
            updatedGroup.row_ids.push(rowId);
          }
        }
      }
    }
  });

  groups = getSortedGroups(groups, validGroupbys, value, 0);

  return groups;
};

/**
 * Group table rows
 * @param {array} groupbys e.g. [{ column_key, count_type, column, ... }, ...]
 * @param {array} rows e.g. [{ _id, ... }, ...]
 * @param {object} value e.g. { collaborators, ... }
 * @returns groups: [{
 *    cell_value, original_cell_value, column_key,
      row_ids, subgroups, summaries, ...}, ...], array
 */
const groupTableRows = (groupbys, rows) => {
  if (groupbys.length === 0) {
    return [];
  }
  if (groupbys.length > 1) {
    return groupRowsWithMultipleGroupbys(groupbys, rows);
  }
  const groupby = groupbys[0];
  const { column_key, column } = groupby;
  const { type: columnType } = column;
  let groups = [];
  let cellValue2GroupIndexMap = {};
  rows.forEach((r) => {
    const cellValue = _getCellValue(r, groupby);
    const formattedValue = _getFormattedCellValue(cellValue, groupby);
    const sCellValue = _getStrCellValue(formattedValue, columnType);
    let groupedRowIndex = _findGroupIndex(sCellValue, cellValue2GroupIndexMap, groups.length);
    if (groupedRowIndex > -1) {
      groups[groupedRowIndex].row_ids.push(r._id);
    } else {
      groups.push({
        cell_value: formattedValue,
        original_cell_value: cellValue,
        column_key,
        row_ids: [r._id],
        subgroups: null,
        summaries: {},
      });
    }
  });

  // sort groups
  groups = getSortedGroups(groups, groupbys, 0);

  return groups;
};

/**
 * Group view rows
 * @param {array} groupbys e.g. [{ column_key, count_type, column, ... }, ...]
 * @param {object} table e.g. { id_row_map, ... }
 * @param {array} rowsIds e.g. [ row._id, ...]
 * @param {object} value e.g. { collaborators, ... }
 * @returns groups: [{
 *    cell_value, original_cell_value, column_key,
      row_ids, subgroups, summaries, ...}, ...], array
 */
const groupViewRows = (groupbys, table, rowsIds) => {
  if (rowsIds.length === 0) {
    return [];
  }
  let rowsData = getRowsByIds(table, rowsIds);
  return groupTableRows(groupbys, rowsData);
};

export {
  groupTableRows,
  groupViewRows,
};
