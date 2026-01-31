// Mapping of standard dirent property names to PRIVATE_COLUMN_KEY pattern
const DIRENT_PROPERTY_MAPPING = {
  // Base properties
  name: '_name',
  type: '_type',
  size: '_size',
  is_dir: '_is_dir',

  mtime: '_mtime',
  ctime: '_ctime',
  parent_dir: '_parent_dir',
};

export function transformDirentsToTableData(dirents, repoID) {
  if (!dirents || !Array.isArray(dirents)) {
    return;
  }

  const id_row_map = {};
  const rows = dirents.map((dirent) => {
    const { id, ...otherProps } = dirent;

    const transformedRow = {
      _id: id,
    };

    Object.keys(otherProps).forEach(key => {
      const mappedKey = key.startsWith('_') ? key : `_${key}`;
      transformedRow[mappedKey] = otherProps[key];
    });

    transformedRow._is_dir = transformedRow._type !== 'file';

    id_row_map[transformedRow._record_id] = transformedRow;
    return transformedRow;
  });

  return {
    _id: `repo-dirent-table-data-${repoID}`,
    rows,
    row_ids: rows.map(r => r._record_id),
    id_row_map,
    columns: [],
  };
}
