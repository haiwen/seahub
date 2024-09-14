import { getNormalizedColumnType } from '../../utils/column';
import { getCellValueByColumn } from '../../utils/cell';
import { NOT_DISPLAY_COLUMN_KEYS } from './constants';

export const normalizeFields = (fields) => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const validFields = fields.map((field) => {
    const { type, key, ...params } = field;
    return {
      ...params,
      key,
      type: getNormalizedColumnType(key, type),
      width: 200,
    };
  }).filter(field => !NOT_DISPLAY_COLUMN_KEYS.includes(field.key));
  let displayFields = [];
  validFields.forEach(field => {
    displayFields.push(field);
  });
  return displayFields;
};

export {
  getCellValueByColumn,
};
