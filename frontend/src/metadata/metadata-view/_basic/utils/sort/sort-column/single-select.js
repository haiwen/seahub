import { SORT_TYPE } from '../../../constants/sort';

/**
 * Sort single-select
 * @param {string} leftOptionId the id of option
 * @param {string} rightOptionId
 * @param {string} sort_type e.g. 'up' | 'down'
 * @param {object} option_id_index_map e.g. { [option.id]: 0, ... }
 * @returns number
 */
const sortSingleSelect = (leftOptionId, rightOptionId, { sort_type, option_id_index_map }) => {
  const currentOptionIdIndex = option_id_index_map[leftOptionId];
  const nextOptionIdIndex = option_id_index_map[rightOptionId];
  const emptyLeftOptionId = !currentOptionIdIndex && currentOptionIdIndex !== 0;
  const emptyRightOptionId = !nextOptionIdIndex && nextOptionIdIndex !== 0;
  if (emptyLeftOptionId && emptyRightOptionId) {
    return 0;
  }
  if (emptyLeftOptionId) {
    return 1;
  }
  if (emptyRightOptionId) {
    return -1;
  }

  if (currentOptionIdIndex > nextOptionIdIndex) {
    return sort_type === SORT_TYPE.UP ? 1 : -1;
  }
  if (currentOptionIdIndex < nextOptionIdIndex) {
    return sort_type === SORT_TYPE.UP ? -1 : 1;
  }

  return 0;
};

export {
  sortSingleSelect,
};
