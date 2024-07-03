/**
 * Get column type.
 * @param {object} column { type, ... }
 * @returns column type
 */
const getColumnType = (column) => {
  const { type } = column;
  return type;
};

/**
 * Get columns by type.
 * @param {array} columns
 * @param {string} columnType
 * @returns the target type columns, array
 */
const getColumnsByType = (columns, columnType) => {
  if (!Array.isArray(columns) || !columnType) {
    return [];
  }
  return columns.filter((column) => column.type === columnType);
};

const getColumnByKey = (columns, columnKey) => {
  if (!Array.isArray(columns) || !columnKey) return null;
  return columns.find((column) => column.key === columnKey);
};

export {
  getColumnType,
  getColumnsByType,
  getColumnByKey,
};
