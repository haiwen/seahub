import { PRIVATE_COLUMN_KEYS } from '../_basic';

export const isValidCellValue = (value) => {
  if (value === undefined) return false;
  if (value === null) return false;
  if (value === '') return false;
  if (JSON.stringify(value) === '{}') return false;
  if (JSON.stringify(value) === '[]') return false;
  return true;
};

export const getCellValueByColumn = (record, column) => {
  if (!record || !column) return null;
  const { key, name } = column;
  if (PRIVATE_COLUMN_KEYS.includes(key)) return record[key];
  return record[name];
};
