export const getSelectColumnOptions = (column) => {
  if (!column || !column.data || !Array.isArray(column.data.options)) {
    return [];
  }
  return column.data.options;
};
