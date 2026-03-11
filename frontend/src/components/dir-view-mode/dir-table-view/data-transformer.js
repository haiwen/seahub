import { formatUnixWithTimezone } from '@/utils/time';

export const transformDirentsToTableData = (dirents, repoID) => {
  if (!dirents || !Array.isArray(dirents)) {
    return;
  }

  const id_row_map = {};
  const rows = dirents.map((dirent) => {
    const transformedRow = {};
    Object.keys(dirent).forEach(key => {
      if (key === 'metadata') {
        const metadata = dirent[key];
        if (metadata) {
          Object.keys(metadata).forEach(metadataKey => {
            transformedRow[metadataKey] = metadata[metadataKey];
          });
        }
        return;
      }
      transformedRow[`_${key}`] = dirent[key]; // Adapt to the shape of table perameter of SFTable
    });

    transformedRow._is_dir = dirent.type !== 'file';
    transformedRow._size = transformedRow._size_original;
    transformedRow._mtime = formatUnixWithTimezone(transformedRow._mtime);
    transformedRow._id = `${transformedRow._id}_${transformedRow._name}`;

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
