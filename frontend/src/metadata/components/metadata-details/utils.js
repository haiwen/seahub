import { getNormalizedColumnType } from '../../utils/column';
import { getCellValueByColumn } from '../../utils/cell';
import { NOT_DISPLAY_COLUMN_KEYS, CellType, PRIVATE_COLUMN_KEY } from './constants';

export const normalizeFields = (fields) => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  let validFields = fields.map((field) => {
    const { type, key, ...params } = field;
    return {
      ...params,
      key,
      type: getNormalizedColumnType(key, type),
      width: 200,
    };
  }).filter(field => !NOT_DISPLAY_COLUMN_KEYS.includes(field.key));
  validFields.push({ key: PRIVATE_COLUMN_KEY.LOCATION, type: CellType.GEOLOCATION, width: 200 });
  return validFields;
};

export {
  getCellValueByColumn,
};
