import { FILTER_PREDICATE_TYPE } from '../../../constants';

/**
 * Filter text
 * @param {string} text
 * @param {string} filter_predicate
 * @param {string} filter_term
 * @param {string} userId
 * @returns bool
 */
const textFilter = (text, { filter_predicate, filter_term }, userId) => {
  switch (filter_predicate) {
    case FILTER_PREDICATE_TYPE.CONTAINS: {
      if (!filter_term) {
        return true;
      }
      if (!text) {
        return false;
      }
      return text.toString().toLowerCase().indexOf(filter_term.toLowerCase()) > -1;
    }
    case FILTER_PREDICATE_TYPE.NOT_CONTAIN: {
      if (!filter_term || !text) {
        return true;
      }
      return text.toString().toLowerCase().indexOf(filter_term.toLowerCase()) < 0;
    }
    case FILTER_PREDICATE_TYPE.IS: {
      return !filter_term || text === filter_term;
    }
    case FILTER_PREDICATE_TYPE.IS_NOT: {
      return !filter_term || text !== filter_term;
    }
    case FILTER_PREDICATE_TYPE.EMPTY: {
      return !text;
    }
    case FILTER_PREDICATE_TYPE.NOT_EMPTY: {
      return !!text;
    }
    case FILTER_PREDICATE_TYPE.IS_CURRENT_USER_ID: {
      if (!userId) return false;
      return text === userId;
    }
    default: {
      return false;
    }
  }
};

export {
  textFilter,
};
