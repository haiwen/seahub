import { SELECT_OPTION_COLORS } from '../../constants/select-option';

export const getSelectColumnOptions = (column) => {
  if (!column || !column.data || !Array.isArray(column.data.options)) {
    return [];
  }
  return column.data.options;
};

export const getNotDuplicateOption = (options) => {
  const defaultOptions = SELECT_OPTION_COLORS.slice(12, 24);
  let defaultOption = defaultOptions[Math.floor(Math.random() * defaultOptions.length)];
  const adjacentOptions = options.slice(-11);
  const _isDuplicate = (option) => option.color === defaultOption.COLOR;
  let duplicateOption = adjacentOptions.find(_isDuplicate);
  while (duplicateOption) {
    defaultOption = defaultOptions[Math.floor(Math.random() * defaultOptions.length)];
    duplicateOption = adjacentOptions.find(_isDuplicate);
  }
  return defaultOption;
};
