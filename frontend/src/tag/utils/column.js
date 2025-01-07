import { PRIVATE_COLUMN_KEYS, PRIVATE_COLUMN_KEY } from '../constants';

const DEFAULT_COLUMN_WIDTH = 200;
const DEFAULT_NAME_COLUMN_WIDTH = 300;

export const getColumnOriginName = (column) => {
  const { key, name } = column;
  if (PRIVATE_COLUMN_KEYS.includes(key)) return key;
  return name;
};

export const normalizeColumns = (columns) => {
  if (!Array.isArray(columns) || columns.length === 0) return [];
  const keyColumnWidth = window.sfTagsDataContext.localStorage.getItem('columns_width') || {};
  return columns.map((column) => {
    const { key } = column;
    let width = keyColumnWidth[column.key];
    if (!width) {
      width = key === PRIVATE_COLUMN_KEY.TAG_NAME ? DEFAULT_NAME_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH;
    }
    return {
      ...column,
      width,
    };
  });
};
