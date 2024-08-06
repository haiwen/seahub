import { getColumnType } from '../metadata-view/utils/column-utils';
import { getCellValueByColumn } from '../metadata-view/_basic';
import { NOT_DISPLAY_COLUMN_KEYS } from './constants';

export const normalizeFields = (fields) => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const validFields = fields.map((field) => {
    const { type, key, ...params } = field;
    return {
      ...params,
      key,
      type: getColumnType(key, type),
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
