import { PRIVATE_COLUMN_KEY, PRIVATE_COLUMN_KEYS } from '../../constants';
import { siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

/**
 * @param {any} value
 */
export const isValidCellValue = (value) => {
  if (value === undefined) return false;
  if (value === null) return false;
  if (value === '') return false;
  if (JSON.stringify(value) === '{}') return false;
  if (JSON.stringify(value) === '[]') return false;
  return true;
};

/**
 * @param {object} record eg: { [column_key]: value, [column_name]: value }
 * @param {object} column
 * @return {any} value
 */
export const getCellValueByColumn = (record, column) => {
  if (!record || !column) return null;
  const { key, name } = column;
  if (PRIVATE_COLUMN_KEYS.includes(key)) return record[key];
  return record[name];
};

export const getParentDirFromRecord = (record) => {
  return record ? record[PRIVATE_COLUMN_KEY.PARENT_DIR] : '';
};

export const getFileNameFromRecord = (record) => {
  return record ? record[PRIVATE_COLUMN_KEY.FILE_NAME] : '';
};

export const getRecordIdFromRecord = record => {
  return record ? record[PRIVATE_COLUMN_KEY.ID] : '';
};

export const getFileObjIdFromRecord = record => {
  return record ? record[PRIVATE_COLUMN_KEY.OBJ_ID] : '';
};

export const getImageLocationFromRecord = (record) => {
  return record ? record[PRIVATE_COLUMN_KEY.LOCATION] : null;
};

export const getTranslateLocationFromRecord = (record) => {
  return record ? record[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED] : null;
};

export const getFileTypeFromRecord = (record) => {
  return record ? record[PRIVATE_COLUMN_KEY.FILE_TYPE] : null;
};

export const getFileSizedFromRecord = record => {
  return record ? record[PRIVATE_COLUMN_KEY.SIZE] : '';
};

export const getFileMTimeFromRecord = record => {
  return record ? record[PRIVATE_COLUMN_KEY.FILE_MTIME] : '';
};

export const getTagsFromRecord = record => {
  return record ? record[PRIVATE_COLUMN_KEY.TAGS] : '';
};

const _getParentDir = (record) => {
  const parentDir = getParentDirFromRecord(record);
  if (parentDir === '/') {
    return '';
  }
  return parentDir;
};

export const getFilePathByRecord = (repoID, record) => {
  const parentDir = _getParentDir(record);
  const fileName = getFileNameFromRecord(record);
  const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
  return siteRoot + 'lib/' + repoID + '/file' + path;
};
