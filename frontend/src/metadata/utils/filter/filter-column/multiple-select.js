import { FILTER_PREDICATE_TYPE } from '../../../constants';

/**
 * Filter multiple-select
 * @param {array} optionIds e.g. [ option.id, ... ]
 * @param {string} filter_predicate
 * @param {array} filter_term option ids
 * @returns bool
 */
const multipleSelectFilter = (optionIds, { filter_predicate, filter_term }) => {
  switch (filter_predicate) {
    case FILTER_PREDICATE_TYPE.HAS_ANY_OF: {
      return (
        filter_term.length === 0
        || (Array.isArray(optionIds) && optionIds.some((optionId) => filter_term.includes(optionId)))
      );
    }
    case FILTER_PREDICATE_TYPE.HAS_ALL_OF: {
      return (
        filter_term.length === 0
        || (Array.isArray(optionIds) && filter_term.every((optionId) => optionIds.includes(optionId)))
      );
    }
    case FILTER_PREDICATE_TYPE.HAS_NONE_OF: {
      if (filter_term.length === 0 || !Array.isArray(optionIds) || optionIds.length === 0) {
        return true;
      }
      return filter_term.every((optionId) => optionIds.indexOf(optionId) < 0);
    }
    case FILTER_PREDICATE_TYPE.IS_EXACTLY: {
      if (filter_term.length === 0) {
        return true;
      }
      if (!Array.isArray(optionIds)) {
        return false;
      }
      const uniqueArr = (arr) => [...new Set(arr)].sort();
      return uniqueArr(optionIds).toString() === uniqueArr(filter_term).toString();
    }
    case FILTER_PREDICATE_TYPE.EMPTY: {
      return !Array.isArray(optionIds) || optionIds.length === 0;
    }
    case FILTER_PREDICATE_TYPE.NOT_EMPTY: {
      return Array.isArray(optionIds) && optionIds.length > 0;
    }
    default: {
      return false;
    }
  }
};

export {
  multipleSelectFilter,
};
