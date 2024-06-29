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

export {
  getColumnType,
  getColumnsByType,
};
