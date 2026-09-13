import { REG_NUMBER_DIGIT, REG_STRING_NUMBER_PARTS, SORT_TYPE } from '../../../constants';

/**
 * Compare strings
 * @param {string} leftString
 * @param {string} rightString
 * @returns number
 */
const compareString = (leftString, rightString) => {
  if (!leftString && !rightString) return 0;
  if (!leftString) return -1;
  if (!rightString) return 1;
  if (typeof leftString !== 'string' || typeof rightString !== 'string') return 0;

  let leftStringParts = leftString.match(REG_STRING_NUMBER_PARTS);
  let rightStringParts = rightString.match(REG_STRING_NUMBER_PARTS);
  let len = Math.min(leftStringParts.length, rightStringParts.length);
  let isDigitPart;
  let leftStringPart;
  let rightStringPart;

  // Loop through each substring part to canCompare the overall strings.
  for (let i = 0; i < len; i++) {
    leftStringPart = leftStringParts[i];
    rightStringPart = rightStringParts[i];
    isDigitPart = REG_NUMBER_DIGIT.test(leftStringPart) && REG_NUMBER_DIGIT.test(rightStringPart);

    if (isDigitPart) {
      leftStringPart = parseInt(leftStringPart);
      rightStringPart = parseInt(rightStringPart);
      if (leftStringPart > rightStringPart) {
        return 1;
      }
      if (leftStringPart < rightStringPart) {
        return -1;
      }
    }
    if (leftStringPart !== rightStringPart) {
      return leftString.localeCompare(rightString);
    }
  }
  return leftString.localeCompare(rightString);
};

/**
 * Sort text
 * @param {string} leftText
 * @param {string} rightText
 * @param {string} sortType e.g. 'up' | 'down
 * @returns number
 */
const sortText = (leftText, rightText, sortType) => {
  const emptyLeftText = !leftText;
  const emptyRightText = !rightText;
  if (emptyLeftText && emptyRightText) {
    return 0;
  }
  if (emptyLeftText) {
    return 1;
  }
  if (emptyRightText) {
    return -1;
  }
  if (rightText === leftText) {
    return 0;
  }
  return sortType === SORT_TYPE.UP ? compareString(leftText, rightText) : -1 * compareString(leftText, rightText);
};

export {
  compareString,
  sortText,
};
