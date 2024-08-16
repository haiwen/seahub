import { getMultipleIndexesOrderbyOptions } from '../core';
import { SORT_TYPE } from '../../../constants/sort';

/**
 * Sort multiple-select
 * @param {array} leftOptionIds the ids of options
 * @param {array} rightOptionIds
 * @param {string} sort_type e.g. 'up' | 'down'
 * @param {object} option_id_index_map e.g. { [option.id]: 0, ... }
 * @returns number
 */
const sortMultipleSelect = (leftOptionIds, rightOptionIds, { sort_type, option_id_index_map }) => {
  const emptyLeftOptionIds = !leftOptionIds || leftOptionIds.length === 0;
  const emptyRightOptionIds = !rightOptionIds || rightOptionIds.length === 0;
  if (emptyLeftOptionIds && emptyRightOptionIds) return 0;
  if (emptyLeftOptionIds) return 1;
  if (emptyRightOptionIds) return -1;

  const leftOptionIndexes = getMultipleIndexesOrderbyOptions(leftOptionIds, option_id_index_map);
  const rightOptionIndexes = getMultipleIndexesOrderbyOptions(rightOptionIds, option_id_index_map);
  const leftOptionsLen = leftOptionIndexes.length;
  const rightOptionsLen = rightOptionIndexes.length;

  // current multiple select equal to next multiple select.
  if (
    leftOptionsLen === rightOptionsLen
    && (leftOptionsLen === 0 || leftOptionIndexes.join('') === rightOptionIndexes.join(''))
  ) {
    return 0;
  }

  const len = Math.min(leftOptionsLen, rightOptionsLen);
  for (let i = 0; i < len; i++) {
    if (leftOptionIndexes[i] > rightOptionIndexes[i]) {
      return sort_type === SORT_TYPE.UP ? 1 : -1;
    }
    if (leftOptionIndexes[i] < rightOptionIndexes[i]) {
      return sort_type === SORT_TYPE.UP ? -1 : 1;
    }
  }
  if (leftOptionsLen > rightOptionsLen) {
    return sort_type === SORT_TYPE.UP ? 1 : -1;
  }

  return sort_type === SORT_TYPE.UP ? -1 : 1;
};

export {
  sortMultipleSelect,
};
