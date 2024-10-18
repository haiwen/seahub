import { PRIVATE_COLUMN_KEY, PRIVATE_COLUMN_KEYS } from '../../constants';

/**
 * @param {any} value
 */
export const isValidCellValue = (value) => {
  if (value === undefined) return false;
  if (value === null) return false;
  if (value === '') return false;
  if (JSON.stringify(value) === '{}') return false;
  if (JSON.stringify(value) === '[]') return false;
  return true;
};

/**
 * @param {object} record eg: { [column_key]: value, [column_name]: value }
 * @param {object} column
 * @return {any} value
 */
export const getCellValueByColumn = (record, column) => {
  if (!record || !column) return null;
  const { key, name } = column;
  if (PRIVATE_COLUMN_KEYS.includes(key)) return record[key];
  return record[name];
};

export const getParentDirFromRecord = (record) => {
  return record ? record[PRIVATE_COLUMN_KEY.PARENT_DIR] : '';
};

export const getFileNameFromRecord = (record) => {
  return record ? record[PRIVATE_COLUMN_KEY.FILE_NAME] : '';
};

export const geRecordIdFromRecord = record => {
  return record ? record[PRIVATE_COLUMN_KEY.ID] : '';
};

export const getFileObjIdFromRecord = record => {
  return record ? record[PRIVATE_COLUMN_KEY.OBJ_ID] : '';
};
