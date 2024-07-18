import { SORT_TYPE } from '../../../constants';

/**
 * Sort checkbox
 * @param {bool} leftChecked
 * @param {bool} rightChecked
 * @param {string} sortType e.g. 'up' | 'down
 * @returns number
 */
const sortCheckbox = (leftChecked, rightChecked, sortType) => {
  const normalizedCurrChecked = leftChecked ? 1 : -1;
  const normalizedNextChecked = rightChecked ? 1 : -1;

  if (normalizedCurrChecked > normalizedNextChecked) {
    return sortType === SORT_TYPE.UP ? 1 : -1;
  }

  if (normalizedCurrChecked < normalizedNextChecked) {
    return sortType === SORT_TYPE.UP ? -1 : 1;
  }
  return 0;
};

export {
  sortCheckbox,
};
