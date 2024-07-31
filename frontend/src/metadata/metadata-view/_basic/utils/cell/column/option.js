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
  const options = getColumnOptions(column);
  return getOptionName(options, optionId);
};

/**
 * Get concatenated options names of given ids.
 * @param {array} options e.g. [ { id, color, name, ... }, ... ]
 * @param {array} targetOptionsIds e.g. [ option.id, ... ]
 * @returns concatenated options names, string. e.g. 'name1, name2'
 */
const getMultipleOptionName = (options, targetOptionsIds) => {
  if (!Array.isArray(targetOptionsIds) || !Array.isArray(options)) return '';
  const selectedOptions = options.filter((option) => targetOptionsIds.includes(option.id));
  if (selectedOptions.length === 0) return '';
  return selectedOptions.map((option) => option.name).join(', ');
};

export {
  getOption,
  getOptionName,
  getColumnOptionNameById,
  getMultipleOptionName,
};
