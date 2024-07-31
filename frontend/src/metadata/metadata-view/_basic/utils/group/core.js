import { CellType } from '../../constants/column';
import {
  GROUP_DATE_GRANULARITY,
  SUPPORT_GROUP_COLUMN_TYPES,
  GROUP_GEOLOCATION_GRANULARITY,
} from '../../constants/group';

/**
 * Check is valid groupby
 * @param {object} groupby e.g. { column_key, count_type, sort_type, ... }
 * @param {array} columns
 * @returns bool
 */
const isValidGroupby = (groupby, columns) => {
  if (!groupby || !Array.isArray(columns)) return false;

  const { column_key } = groupby;
  const groupbyColumn = columns.find((column) => column.key === column_key);
  if (!groupbyColumn) return false;

  return SUPPORT_GROUP_COLUMN_TYPES.includes(groupbyColumn.type);
};

/**
 * Get valid groupbys
 * @param {array} groupbys e.g. [{ column_key, count_type, ... }, ...]
 * @param {array} columns
 * @returns valid groupbys, array
 */
const getValidGroupbys = (groupbys, columns) => {
  if (!Array.isArray(groupbys) || !Array.isArray(columns)) return [];
  return groupbys.filter((groupby) => isValidGroupby(groupby, columns));
};

/**
 * Get valid and formatted groupbys
 * @param {array} groupbys e.g. [{ column_key, count_type, ... }, ...]
 * @param {array} columns
 * @param {object} currentTable e.g. { _id, ... }
 * @param {object} value e.g. { tables, collaborators }
 * @returns valid and formatted groupbys
 */
const deleteInvalidGroupby = (groupbys, columns) => {
  const validGroupbys = getValidGroupbys(groupbys, columns);
  let cleanGroupbys = [];
  validGroupbys.forEach((groupby) => {
    const { column_key: groupbyColumnKey, count_type } = groupby;
    const groupbyColumn = columns.find((column) => groupbyColumnKey === column.key);
    const { type: columnType } = groupbyColumn;
    let newGroupby = { ...groupby, column: groupbyColumn };
    switch (columnType) {
      case CellType.DATE:
      case CellType.CTIME:
      case CellType.MTIME: {
        newGroupby.count_type = count_type || GROUP_DATE_GRANULARITY.MONTH;
        break;
      }
      case CellType.GEOLOCATION: {
        newGroupby.count_type = count_type || GROUP_GEOLOCATION_GRANULARITY.PROVINCE;
        break;
      }
      default: {
        break;
      }
    }
    cleanGroupbys.push(newGroupby);
  });
  return cleanGroupbys;
};

export {
  deleteInvalidGroupby,
  isValidGroupby,
  getValidGroupbys,
};
