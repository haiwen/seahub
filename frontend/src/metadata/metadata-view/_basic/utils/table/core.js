/**
 * Get table by id
 * @param {array} tables
 * @param {string} tableId
 * @returns table, object
 */
const getTableById = (tables, tableId) => {
  if (!Array.isArray(tables) || !tableId) return null;
  return tables.find((table) => table._id === tableId);
};

/**
 * Get table by name
 * @param {array} tables
 * @param {string} tableName
 * @returns table, object
 */
const getTableByName = (tables, tableName) => {
  if (!Array.isArray(tables) || !tableName) return null;
  return tables.find((table) => table.name === tableName);
};

const getTableByIndex = (tables, tableIndex) => {
  if (!Array.isArray(tables) || tableIndex < 0) return null;
  return tables[tableIndex];
};

export {
  getTableById,
  getTableByName,
  getTableByIndex,
};
