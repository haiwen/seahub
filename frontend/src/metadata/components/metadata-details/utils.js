import { getNormalizedColumnType } from '../../utils/column';
import { getCellValueByColumn } from '../../utils/cell';

export const normalizeFields = (fields) => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  return fields.map((field) => {
    const { type, key, ...params } = field;
    return {
      ...params,
      key,
      type: getNormalizedColumnType(key, type),
      width: 200,
    };
  });
};

export {
  getCellValueByColumn,
};
