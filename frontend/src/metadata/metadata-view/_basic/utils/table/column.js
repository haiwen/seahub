/**
 * Get column by key from table
 * @param {object} table
 * @param {string} columnKey
 * @returns column, object
 */
const getTableColumnByKey = (table, columnKey) => {
  if (!table || !Array.isArray(table.columns) || !columnKey) return null;
  return table.columns.find((column) => column.key === columnKey);
};

/**
 * Get table column by name
 * @param {object} table
 * @param {string} columnName
 * @returns column, object
 */
const getTableColumnByName = (table, columnName) => {
  if (!table || !Array.isArray(table.columns) || !columnName) return null;
  return table.columns.find((column) => column.name === columnName);
};

export {
  getTableColumnByKey,
  getTableColumnByName,
};
