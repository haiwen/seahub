import { SELECT_OPTION_COLORS } from '../_basic/constants/select-option';
import { generateOptionID } from '../_basic/utils/column/option';

const getNotDuplicateOption = (options) => {
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

export const generateNewOption = (options, name) => {
  const defaultOption = getNotDuplicateOption(options);
  const { COLOR: color, TEXT_COLOR: textColor, BORDER_COLOR: borderColor } = defaultOption;
  const newOption = { name, color, textColor, borderColor };
  newOption.id = generateOptionID(options);
  return newOption;
};
