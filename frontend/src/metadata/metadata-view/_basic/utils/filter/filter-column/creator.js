import { FILTER_PREDICATE_TYPE } from '../../../constants/filter/filter-predicate';

/**
 * Filter creator
 * @param {string} email
 * @param {string} filter_predicate
 * @param {array} filter_term e.g. [ collaborator.email, ... ]
 * @param {string} username
 * @returns bool
 */
const creatorFilter = (email, { filter_predicate, filter_term }, username) => {
  switch (filter_predicate) {
    case FILTER_PREDICATE_TYPE.CONTAINS: {
      if (!Array.isArray(filter_term)) {
        return true;
      }
      if (!email) {
        return false;
      }
      return filter_term.findIndex((filterEmail) => filterEmail === email) > -1;
    }
    case FILTER_PREDICATE_TYPE.NOT_CONTAIN: {
      if (!Array.isArray(filter_term) || !email) {
        return true;
      }
      return filter_term.findIndex((filterEmail) => filterEmail === email) < 0;
    }
    case FILTER_PREDICATE_TYPE.INCLUDE_ME: {
      return email === username;
    }
    case FILTER_PREDICATE_TYPE.IS: {
      if (!filter_term) return true;
      if (!Array.isArray(filter_term)) return email === filter_term;
      return email === filter_term[0];
    }
    case FILTER_PREDICATE_TYPE.IS_NOT: {
      if (!filter_term) return true;
      if (!Array.isArray(filter_term)) return email !== filter_term;
      return email !== filter_term[0];
    }
    default: {
      return false;
    }
  }
};

export {
  creatorFilter,
};
