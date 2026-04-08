import { PRIVATE_COLUMN_KEYS, PREDEFINED_FILE_STATUS_OPTION_KEYS, PREDEFINED_FILE_TYPE_OPTION_KEYS, PRIVATE_COLUMN_KEY, CellType } from '@/metadata/constants';
import ObjectUtils from '../../../utils/object';

/*
 * @param {object} record eg: { [column_key]: value, [column_name]: value }
 * @param {object} column
 * @return {any} value
 */
export const getCellValueByColumn = (record, column) => {
  if (!record || !column) return null;
  const { key, name } = column;

  // Check if this is a metadata private column (key starts with '_')
  // For these columns, the value is stored at record[key]
  if (PRIVATE_COLUMN_KEYS.includes(key)) {
    return record[key];
  }

  // For regular columns, use the column.name
  return record[name];
};

/**
 * Get file name from record
 * @param {object} record
 * @returns {string} file name
 */
export const getFileNameFromRecord = (record) => {
  return record ? record['_name'] : '';
};

/**
 * Get parent directory from record
 * @param {object} record
 * @returns {string} parent directory
 */
export const getParentDirFromRecord = (record) => {
  return record ? record['_parent_dir'] : '';
};

/**
 * Get column options from column definition
 * @param {object} column e.g. { data: { options, ... }, ... }
 * @returns {array} options
 */
export const getColumnOptions = (column) => {
  if (!column) return [];
  return column?.data?.options || [];
};

/**
 * Check if option is a predefined option
 * @param {object} column
 * @param {string} optionId
 * @returns {boolean}
 */
const checkIsPredefinedOption = (column, optionId) => {
  const columnKey = column.key;
  if (!PRIVATE_COLUMN_KEYS.includes(columnKey)) return false;
  if (PRIVATE_COLUMN_KEY.FILE_STATUS === columnKey) return PREDEFINED_FILE_STATUS_OPTION_KEYS.includes(optionId);
  if (PRIVATE_COLUMN_KEY.FILE_TYPE === columnKey) return PREDEFINED_FILE_TYPE_OPTION_KEYS.includes(optionId);
  return false;
};

/**
 * Get option by id
 * @param {array} options e.g. [{ id, name, ... }]
 * @param {string} optionId
 * @returns option object
 */
const getOption = (options, optionId) => {
  if (!Array.isArray(options) || !optionId) return null;
  return options.find(o => o.id === optionId || o.name === optionId);
};

/**
 * Get option name
 * @param {array} options e.g. [{ id, color, name, ... }]
 * @param {string} targetOptionId
 * @returns option name string
 */
const getOptionName = (options, targetOptionId) => {
  if (!targetOptionId || !Array.isArray(options)) return '';
  const targetOption = getOption(options, targetOptionId);
  return targetOption ? targetOption.name : '';
};

/**
 * Get column option name by id
 * @param {object} column e.g. { data: { options, ... }, ... }
 * @param {string} optionId
 * @returns option name string
 */
export const getColumnOptionNameById = (column, optionId) => {
  // For predefined options, use id as name
  if (checkIsPredefinedOption(column, optionId)) return optionId;
  const options = getColumnOptions(column);
  return getOptionName(options, optionId);
};

/**
 * Get column option names by ids
 * @param {object} column e.g. { data: { options, ... }, ... }
 * @param {array} optionIds
 * @returns options name array
 */
export const getColumnOptionNamesByIds = (column, optionIds) => {
  if (PRIVATE_COLUMN_KEYS.includes(column.key)) return optionIds;
  if (!Array.isArray(optionIds) || optionIds.length === 0) return [];
  const options = getColumnOptions(column);
  if (!Array.isArray(options) || options.length === 0) return [];
  return optionIds.map(optionId => getOptionName(options, optionId)).filter(name => name);
};

/**
 * Check if cell value has changed
 * @param {*} oldVal - Old value
 * @param {*} newVal - New value
 * @param {string} columnType - Column type
 * @returns {boolean} - Whether the value has changed
 */
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
