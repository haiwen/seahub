import { Utils } from '../../../../utils/utils';

export const checkDuplicatedName = (rows, parentDir, fileName) => {
  if (!Array.isArray(rows) || rows.length === 0 || !parentDir || !fileName) return false;
  const newPath = Utils.joinPath(parentDir, fileName);
  return rows.some((row) => newPath === Utils.joinPath(row._parent_dir, row._name));
};

export const getUniqueFileName = (rows, parentDir, fileName) => {
  const dotIndex = fileName.lastIndexOf('.');
  const fileType = dotIndex === -1 ? '' : fileName.slice(dotIndex + 1);
  let newName = dotIndex === -1 ? fileName : fileName.slice(0, dotIndex);
  while (checkDuplicatedName(rows, parentDir, dotIndex === -1 ? newName : `${newName}.${fileType}`)) {
    newName = newName + ' (1)';
  }
  return dotIndex === -1 ? newName : `${newName}.${fileType}`;
};
