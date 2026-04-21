import { PRIVATE_COLUMN_KEYS as METADATA_PRIVATE_COLUMN_KEYS, PREDEFINED_FILE_STATUS_OPTION_KEYS, PREDEFINED_FILE_TYPE_OPTION_KEYS, PRIVATE_COLUMN_KEY, CellType } from '@/metadata/constants';
import { PRIVATE_COLUMN_KEYS as TRASH_PRIVATE_COLUMN_KEYS } from '@/components/dir-view-mode/dir-trash-view/utils';
import ObjectUtils from '../../../utils/object';

export const getCellValueByColumn = (record, column) => {
  if (!record || !column) return null;
  const { key, name } = column;

  if (METADATA_PRIVATE_COLUMN_KEYS.includes(key) || TRASH_PRIVATE_COLUMN_KEYS.includes(key)) {
    return record[key];
  }

  return record[name];
};

export const getFileNameFromRecord = (record) => {
  return record ? record['_name'] : '';
};

export const getParentDirFromRecord = (record) => {
  return record ? record['_parent_dir'] : '';
};

export const getColumnOptions = (column) => {
  if (!column) return [];
  return column?.data?.options || [];
};

const checkIsPredefinedOption = (column, optionId) => {
  const columnKey = column.key;
  if (!METADATA_PRIVATE_COLUMN_KEYS.includes(columnKey)) return false;
  if (PRIVATE_COLUMN_KEY.FILE_STATUS === columnKey) return PREDEFINED_FILE_STATUS_OPTION_KEYS.includes(optionId);
  if (PRIVATE_COLUMN_KEY.FILE_TYPE === columnKey) return PREDEFINED_FILE_TYPE_OPTION_KEYS.includes(optionId);
  return false;
};

const getOption = (options, optionId) => {
  if (!Array.isArray(options) || !optionId) return null;
  return options.find(o => o.id === optionId || o.name === optionId);
};

const getOptionName = (options, targetOptionId) => {
  if (!targetOptionId || !Array.isArray(options)) return '';
  const targetOption = getOption(options, targetOptionId);
  return targetOption ? targetOption.name : '';
};

export const getColumnOptionNameById = (column, optionId) => {
  if (checkIsPredefinedOption(column, optionId)) return optionId;
  const options = getColumnOptions(column);
  return getOptionName(options, optionId);
};

export const getColumnOptionNamesByIds = (column, optionIds) => {
  if (METADATA_PRIVATE_COLUMN_KEYS.includes(column.key)) return optionIds;
  if (!Array.isArray(optionIds) || optionIds.length === 0) return [];
  const options = getColumnOptions(column);
  if (!Array.isArray(options) || options.length === 0) return [];
  return optionIds.map(optionId => getOptionName(options, optionId)).filter(name => name);
};

export const isCellValueChanged = (oldVal, newVal, columnType) => {
  if (oldVal === newVal) return false;
  if (oldVal === undefined || oldVal === null) {
    if (columnType === CellType.GEOLOCATION && ObjectUtils.isEmptyObject(newVal)) return false;
    if ((columnType === CellType.DATE || columnType === CellType.NUMBER) && newVal === null) return false;
    if (Array.isArray(newVal)) return newVal.length !== 0;
    return newVal !== false && newVal !== '';
  }
  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    // [{}].toString(): [object Object]
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  }
  if (typeof oldVal === 'object' && typeof newVal === 'object' && newVal !== null) {
    return !ObjectUtils.isSameObject(oldVal, newVal);
  }
  return oldVal !== newVal;
};
