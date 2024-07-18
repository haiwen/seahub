import { SELECT_OPTION_COLORS } from '../../constants/select-option';

/**
 * Get options from single-select/multiple-select column.
 * @param {object} column e.g. { type, data: { options: [] } }
 * @returns options, array
 */
const getColumnOptions = (column) => {
  if (!column || !column.data || !Array.isArray(column.data.options)) {
    return [];
  }
  return column.data.options;
};

/**
 * generate unique option id
 * @param {array} options e.g. [{ id, ... }, ...]
 * @returns generated option id, string
 */
const generateOptionID = (options) => {
  if (options.length === 1) return String(Math.floor(Math.random() * (10 ** 6)));
  let optionID;
  let isIDUnique = false;
  while (!isIDUnique) {
    optionID = String(Math.floor(Math.random() * (10 ** 6)));

    // eslint-disable-next-line
    isIDUnique = options.every((option) => {
      return option.id !== optionID;
    });
    if (isIDUnique) {
      break;
    }
  }
  return optionID;
};

const getRandomOptionColor = (options) => {
  const defaultOptions = SELECT_OPTION_COLORS.slice(12, 24);
  let colorIdx = Math.floor(Math.random() * defaultOptions.length);
  if (!Array.isArray(options) || options.length === 0) {
    return defaultOptions[colorIdx];
  }

  // Avoid using the same color for adjacent labels
  const adjacentOptions = options.slice(-(defaultOptions.length - 1));
  let adjacentOptionsColorIdxArr = [];
  let selectOptionColorObj = {};
  defaultOptions.forEach((colorItem, index) => {
    selectOptionColorObj[colorItem.COLOR] = index;
  });
  adjacentOptions.forEach((option) => {
    let optionColorIdx = selectOptionColorObj[option.color];
    adjacentOptionsColorIdxArr.push(optionColorIdx);
  });

  // eslint-disable-next-line
  while (adjacentOptionsColorIdxArr.indexOf(colorIdx) != -1) {
    colorIdx = Math.floor(Math.random() * defaultOptions.length);
  }
  return defaultOptions[colorIdx] || defaultOptions[0];
};

/**
 * generate option
 * @param {array} options e.g. [{ id, ... }, ...]
 * @param {string} optionName
 * @param {string} optionColor used to find system support color options. The new color option will be generated if not found by "optionColor" or not supported
 * @returns generated option, object
 */
const createOption = (options, optionName, optionColor = '') => {
  const id = generateOptionID(options);
  let colors = optionColor && SELECT_OPTION_COLORS.find((systemColor) => systemColor.COLOR === optionColor);
  if (!colors) {
    colors = getRandomOptionColor(options);
  }
  return {
    id,
    name: optionName,
    color: colors.COLOR,
    textColor: colors.TEXT_COLOR,
  };
};

/**
 * Generate cell option by name.
 * @param {array} options e.g. [{ id, ... }, ...]
 * @param {string} optionName used as the option name
 * @returns return the option id if exist, otherwise generate a new option, object
 */
const generatorCellOption = (options, optionName) => {
  const existOption = options.find((option) => option.name === optionName);
  if (existOption) {
    return { selectedOptionId: existOption.id };
  }

  const newOption = createOption(options, optionName) || {};
  return { cellOption: newOption, selectedOptionId: newOption.id };
};

/**
 * Generate cell options by names.
 * @param {array} options e.g. [{ id, ... }, ...]
 * @param {array} optionNames used as the options names
 * @returns Return the options ids if exist, otherwise generate new options, object
 */
const generatorCellOptions = (options, optionNames) => {
  let cellOptions = [];
  let selectedOptionIds = [];
  optionNames.forEach((optionName) => {
    let existingOption = options.find((option) => option.name === optionName);
    if (existingOption) {
      selectedOptionIds.push(existingOption.id);
    } else {
      let cellOption = createOption(options, optionName);
      if (cellOption) {
        cellOptions.push(cellOption);
        selectedOptionIds.push(cellOption.id);
      }
    }
  });
  if (cellOptions.length === 0) {
    return { selectedOptionIds };
  }
  return { cellOptions, selectedOptionIds };
};

export {
  getColumnOptions,
  generateOptionID,
  createOption,
  generatorCellOption,
  generatorCellOptions,
};
