export const getFrozenColumns = (columns) => {
  return columns.filter(column => column.frozen);
};

export const getFrozenColumnsWidth = (columns) => {
  let width = 0;
  columns.forEach(column => {
    if (column.frozen) {
      width += column.width;
    }
  });
  return width;
};
