export const addRowLinks = (row, key, other_rows_ids) => {
  let updatedRow = row;
  let updatedLinks = Array.isArray(updatedRow[key]) ? [...updatedRow[key]] : [];
  other_rows_ids.forEach((otherRowId) => {
    if (updatedLinks.findIndex((linked) => linked.row_id === otherRowId) < 0) {
      updatedLinks.push({ row_id: otherRowId, display_value: otherRowId });
    }
  });
  updatedRow[key] = updatedLinks;
  return updatedRow;
};

export const removeRowLinks = (row, key, other_rows_ids) => {
  if (!Array.isArray(row[key]) || row[key].length === 0) {
    return row;
  }
  let updatedRow = row;
  let updatedLinks = [...updatedRow[key]];
  other_rows_ids.forEach((otherRowId) => {
    const deleteIndex = updatedLinks.findIndex((linked) => linked.row_id === otherRowId);
    if (deleteIndex > -1) {
      updatedLinks.splice(deleteIndex, 1);
    }
  });
  updatedRow[key] = updatedLinks;
  return updatedRow;
};
