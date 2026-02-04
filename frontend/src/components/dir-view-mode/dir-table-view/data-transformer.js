export const transformDirentsToTableData = (dirents, repoID) => {
  if (!dirents || !Array.isArray(dirents)) {
    return;
  }

  const id_row_map = {};
  const rows = dirents.map((dirent) => {
    const { ...props } = dirent;

    const transformedRow = {};

    Object.keys(props).forEach(key => {
      const mappedKey = key.startsWith('_') ? key : `_${key}`;
      transformedRow[mappedKey] = props[key];
    });

    transformedRow._is_dir = transformedRow._type !== 'file';
    id_row_map[transformedRow._id] = transformedRow;

    return transformedRow;
  });

  return {
    _id: `repo-dirent-table-data-${repoID}`,
    rows,
    row_ids: rows.map(r => r._id),
    id_row_map,
    columns: [],
  };
};
