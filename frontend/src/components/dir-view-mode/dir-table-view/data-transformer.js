// Mapping of standard dirent property names to PRIVATE_COLUMN_KEY pattern
const DIRENT_PROPERTY_MAPPING = {
  // Base properties
  name: '_name',
  type: '_file_type',
  size: '_size',
  size_original: '_size_original',
  mtime: '_mtime',
  ctime: '_ctime',
  permission: '_permission',

  // Extended properties
  is_dir: '_is_dir',
  parent_dir: '_parent_dir',
  obj_id: '_obj_id',

  // File-specific properties
  file_id: '_file_id',
  file_name: '_file_name',
  file_type: '_file_type',
  file_size: '_file_size',
  file_mtime: '_file_mtime',
  file_ctime: '_file_ctime',

  // Metadata properties
  tags: '_tags',
  status: '_status',
  owner: '_owner',
  creator: '_creator',
  last_modifier: '_last_modifier',
  keywords: '_keywords',
  description: '_description',
  collaborators: '_collaborators',
  reviewer: '_reviewer',
  rate: '_rate',
  expired: '_expired',
  expire_time: '_expire_time',
  suffix: '_suffix',
  details: '_file_details',
  location: '_location',
  capture_time: '_capture_time',
};

export function transformDirentsToTableData(dirents, repoID) {
  if (!dirents || !Array.isArray(dirents)) {
    return {
      _id: `repo_dirent_table_${repoID}`,
      rows: [],
      row_ids: [],
      id_row_map: {},
      columns: [],
    };
  }

  const id_row_map = {};
  const rows = dirents
    .filter(dirent => dirent && typeof dirent === 'object')
    .map((dirent) => {
      // Extract id and rename to _id to avoid duplicate keys
      const { id, ...otherProps } = dirent;

      // Generate a unique ID - use id if available, otherwise generate one
      let uniqueId = id || `${dirent.name || 'unknown'}_${Math.random().toString(36).substr(2, 9)}`;

      // Handle duplicates by appending a counter
      let counter = 1;
      const baseId = uniqueId;
      while (id_row_map[uniqueId]) {
        uniqueId = `${baseId}_${counter++}`;
      }

      const transformedRow = {
        _id: uniqueId,
      };

      // Map each property to use the '_' prefix pattern
      Object.keys(otherProps).forEach(key => {
        // If the key has a mapping, use it; otherwise, prefix with '_'
        const mappedKey = DIRENT_PROPERTY_MAPPING[key] || (key.startsWith('_') ? key : `_${key}`);
        transformedRow[mappedKey] = otherProps[key];
      });

      // Ensure _is_dir is properly set based on _file_type
      // The is_dir property is computed from type in the original Dirent model
      if (transformedRow._file_type !== undefined) {
        transformedRow._is_dir = transformedRow._file_type === 'dir';
      }

      id_row_map[transformedRow._id] = transformedRow;
      return transformedRow;
    });

  return {
    _id: `repo_dirent_table_${repoID}`,
    rows,
    row_ids: rows.map(r => r._id),
    id_row_map,
    columns: [],
  };
}
