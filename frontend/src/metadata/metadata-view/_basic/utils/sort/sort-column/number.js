import { SORT_TYPE } from '../../../constants/sort';

/**
 * Sort number
 * @param {number} leftNumber
 * @param {number} rightNumber
 * @param {string} sortType e.g. 'up' | 'down'
 * @returns number
 */
const sortNumber = (leftNumber, rightNumber, sortType) => {
  const emptyLeftNumber = !leftNumber && leftNumber !== 0;
  const emptyRightNumber = !rightNumber && rightNumber !== 0;
  if (emptyLeftNumber && emptyRightNumber) {
    return 0;
  }
  if (emptyLeftNumber) {
    return 1;
  }
  if (emptyRightNumber) {
    return -1;
  }

  if (leftNumber > rightNumber) {
    return sortType === SORT_TYPE.UP ? 1 : -1;
  }

  if (leftNumber < rightNumber) {
    return sortType === SORT_TYPE.UP ? -1 : 1;
  }

  return 0;
};

export {
  sortNumber,
};
