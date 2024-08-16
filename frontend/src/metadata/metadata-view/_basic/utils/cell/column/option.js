import { PRIVATE_COLUMN_KEYS } from '../../../constants';
import { getColumnOptions } from '../../column';

/**
 * Get option by id
 * @param {array} options e.g. [{ id, name, ... }]
 * @param {string} optionId
 * @returns option, object
 */
const getOption = (options, optionId) => {
  if (!Array.isArray(options) || !optionId) return null;
  return options.find(o => o.id === optionId || o.name === optionId);
};

/**
 * Get option name of the given id
 * @param {array} options e.g. [ { id, color, name, ... } ]
 * @param {string} targetOptionId option id
 * @returns option name, string
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
 * @returns option name, string
 */
const getColumnOptionNameById = (column, optionId) => {
  if (PRIVATE_COLUMN_KEYS.includes(column.key)) return optionId;
  const options = getColumnOptions(column);
  return getOptionName(options, optionId);
};

/**
 * Get column option name by id
 * @param {object} column e.g. { data: { options, ... }, ... }
 * @param {array} optionIds
 * @returns options name, array
 */
const getColumnOptionNamesByIds = (column, optionIds) => {
  if (PRIVATE_COLUMN_KEYS.includes(column.key)) return optionIds;
  if (!Array.isArray(optionIds) || optionIds.length === 0) return [];
  const options = getColumnOptions(column);
  if (!Array.isArray(options) || options.length === 0) return [];
  return optionIds.map(optionId => getOptionName(options, optionId)).filter(name => name);
};

/**
 * Get column option name by id
 * @param {object} column e.g. { data: { options, ... }, ... }
 * @param {array} option names
 * @returns options id, array
 */
const getColumnOptionIdsByNames = (column, names) => {
  if (PRIVATE_COLUMN_KEYS.includes(column.key)) return names;
  if (!Array.isArray(names) || names.length === 0) return [];
  const options = getColumnOptions(column);
  if (!Array.isArray(options) || options.length === 0) return [];
  return names.map(name => {
    const option = getOption(options, name);
    if (option) return option.id;
    return null;
  }).filter(name => name);
};

/**
 * Get concatenated options names of given ids.
 * @param {array} options e.g. [ { id, color, name, ... }, ... ]
 * @param {array} targetOptionsIds e.g. [ option.id, ... ]
 * @returns concatenated options names, string. e.g. 'name1, name2'
 */
const getMultipleOptionName = (column, targetOptionsIds) => {
  const options = getColumnOptions(column);
  if (!Array.isArray(targetOptionsIds) || !Array.isArray(options)) return '';
  const selectedOptions = options.filter((option) => targetOptionsIds.includes(option.id));
  if (selectedOptions.length === 0) return '';
  return selectedOptions.map((option) => option.name).join(', ');
};

export {
  getOption,
  getOptionName,
  getColumnOptionNameById,
  getColumnOptionNamesByIds,
  getColumnOptionIdsByNames,
  getMultipleOptionName,
};
