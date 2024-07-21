import { FILTER_PREDICATE_TYPE } from '../../../constants';

/**
 * Filter single-select
 * @param {string} optionId
 * @param {string} filter_predicate
 * @param {string|array} filter_term option id or option ids
 * @returns bool
 */
const singleSelectFilter = (optionId, { filter_predicate, filter_term }) => {
  switch (filter_predicate) {
    case FILTER_PREDICATE_TYPE.IS: {
      return !filter_term || optionId === filter_term;
    }
    case FILTER_PREDICATE_TYPE.IS_NOT: {
      return !filter_term || optionId !== filter_term;
    }
    case FILTER_PREDICATE_TYPE.IS_ANY_OF: {
      return filter_term.length === 0 || filter_term.includes(optionId);
    }
    case FILTER_PREDICATE_TYPE.IS_NONE_OF: {
      return filter_term.length === 0 || filter_term.indexOf(optionId) < 0;
    }
    case FILTER_PREDICATE_TYPE.EMPTY: {
      return !optionId;
    }
    case FILTER_PREDICATE_TYPE.NOT_EMPTY: {
      return !!optionId;
    }
    default: {
      return false;
    }
  }
};

export {
  singleSelectFilter,
};
