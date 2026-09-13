import { SORT_TYPE } from '../../../constants';

/**
 * Sort date
 * @param {string} leftDate e.g. '2023-07-31'
 * @param {string} nextDate
 * @param {string} sortType e.g. 'up' | 'down'
 * @returns number
 */
const sortDate = (leftDate, rightDate, sortType) => {
  const emptyLeftDate = !leftDate;
  const emptyRightDate = !rightDate;
  if (emptyLeftDate && emptyRightDate) return 0;
  if (emptyLeftDate) return 1;
  if (emptyRightDate) return -1;

  if (leftDate > rightDate) {
    return sortType === SORT_TYPE.UP ? 1 : -1;
  }

  if (leftDate < rightDate) {
    return sortType === SORT_TYPE.UP ? -1 : 1;
  }

  return 0;
};

export {
  sortDate,
};
