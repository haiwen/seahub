/**
 * Get table row by id
 * @param {object} table
 * @param {string} rowId the id of row
 * @returns row, object
 */
const getRowById = (table, rowId) => {
  if (!table || !table.id_row_map || !rowId) return null;
  return table.id_row_map[rowId];
};

/**
 * Get table rows by ids
 * @param {object} table { id_row_map, ... }
 * @param {array} rowsIds [ row._id, ... ]
 * @returns rows, array
 */
const getRowsByIds = (table, rowsIds) => {
  if (!table || !table.id_row_map || !Array.isArray(rowsIds)) return [];
  return rowsIds.map((rowId) => table.id_row_map[rowId]).filter(Boolean);
};

export {
  getRowById,
  getRowsByIds,
};
