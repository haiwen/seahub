import { compareString } from '../../metadata/utils/sort';
import { TAG_FILE_KEY } from '../constants/file';
import { TAG_FILES_SORT_KEY } from '../constants/sort';
import { getSortBy, getSortOrder } from './sort';
import TextTranslation from '../../utils/text-translation';

export const getFileById = (tagFiles, fileId) => {
  return fileId ? tagFiles.rows.find(file => file._id === fileId) : '';
};

export const getFileName = (file) => {
  return file ? file[TAG_FILE_KEY.NAME] : '';
};

export const getFileParentDir = (file) => {
  return file ? file[TAG_FILE_KEY.PARENT_DIR] : '';
};

export const getFileMTime = (file) => {
  return file ? file[TAG_FILE_KEY.FILE_MTIME] : '';
};

export const getFileSize = (file) => {
  return file ? file[TAG_FILE_KEY.SIZE] : '';
};

export const sortTagFiles = (files, sort) => {
  const sortBy = getSortBy(sort);
  const order = getSortOrder(sort);

  const compare = (a, b) => {
    let valueA = '';
    let valueB = '';
    switch (sortBy) {
      case TAG_FILES_SORT_KEY.NAME:
        valueA = getFileName(a);
        valueB = getFileName(b);
        break;
      case TAG_FILES_SORT_KEY.SIZE:
        valueA = getFileSize(a);
        valueB = getFileSize(b);
        break;
      case TAG_FILES_SORT_KEY.TIME:
        valueA = getFileMTime(a);
        valueB = getFileMTime(b);
        break;
      default:
        break;
    }

    const result =
      sortBy === TAG_FILES_SORT_KEY.SIZE
        ? valueA - valueB
        : compareString(valueA, valueB);

    return order === 'asc' ? result : -result;
  };

  return files.sort(compare);
};

export const getFileObj = (file, isAdmin) => {
  return Object.assign(file, {
    name: getFileName(file),
    // Files in this TAG VIEW can be from different parent folders,
    // and there is performance problem for python API to get 'permission' for each file,
    // so, 'permission' is not returned
    permission: isAdmin ? 'rw' : '', // isAdmin: repoInfo.is_admin
    type: 'file' // for 'chat with AI'
  });
};

export const filterTagFileOperations = (operations) => {
  // Files in this TAG VIEW can be from different parent folders,
  // and there is performance problem for python API to get 'locked' related fields for each file,
  // 'starred' is not returned either,
  // so, the following operations are not offered
  const EXCLUDED_SINGLE_FILE_OPS = [
    TextTranslation.DELETE,
    TextTranslation.MOVE,
    TextTranslation.RENAME,
    TextTranslation.LOCK,
    TextTranslation.UNLOCK,
    TextTranslation.FREEZE_DOCUMENT,
    TextTranslation.UNFREEZE_DOCUMENT,
    TextTranslation.STAR,
    TextTranslation.UNSTAR,
  ];
  return operations.filter(item => !EXCLUDED_SINGLE_FILE_OPS.includes(item));
};
