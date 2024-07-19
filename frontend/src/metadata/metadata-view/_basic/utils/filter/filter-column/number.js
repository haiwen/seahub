import { isNumberEqual } from '../../number';
import { FILTER_PREDICATE_TYPE } from '../../../constants';

/**
 * Filter number
 * @param {number} number
 * @param {string} filter_predicate
 * @param {number} filter_term
 * @returns bool
 */
const numberFilter = (number, { filter_predicate, filter_term }) => {
  switch (filter_predicate) {
    case FILTER_PREDICATE_TYPE.EQUAL: {
      if (!filter_term && filter_term !== 0) {
        return true;
      }
      if (!number && number !== 0) {
        return false;
      }
      return isNumberEqual(filter_term, number);
    }
    case FILTER_PREDICATE_TYPE.NOT_EQUAL: {
      if (
        (!filter_term && filter_term !== 0)
        || (!number && number !== 0)
      ) {
        return true;
      }
      return !isNumberEqual(filter_term, number);
    }
    case FILTER_PREDICATE_TYPE.LESS: {
      if (!filter_term && filter_term !== 0) {
        return true;
      }
      if ((!number && number !== 0) || isNumberEqual(number, filter_term)) {
        return false;
      }
      return number < filter_term;
    }
    case FILTER_PREDICATE_TYPE.GREATER: {
      if (!filter_term && filter_term !== 0) {
        return true;
      }
      if ((!number && number !== 0) || isNumberEqual(number, filter_term)) {
        return false;
      }
      return number > filter_term;
    }
    case FILTER_PREDICATE_TYPE.LESS_OR_EQUAL: {
      if (!filter_term && filter_term !== 0) {
        return true;
      }
      if (!number && number !== 0) {
        return false;
      }
      if (isNumberEqual(number, filter_term)) {
        return true;
      }
      return number < filter_term;
    }
    case FILTER_PREDICATE_TYPE.GREATER_OR_EQUAL: {
      if (!filter_term && filter_term !== 0) {
        return true;
      }
      if (!number && number !== 0) {
        return false;
      }
      return isNumberEqual(number, filter_term) || number > filter_term;
    }
    case FILTER_PREDICATE_TYPE.EMPTY: {
      if (number === 0) {
        return false;
      }
      return !number || typeof number !== 'number';
    }
    case FILTER_PREDICATE_TYPE.NOT_EMPTY: {
      // must be a number
      if (number === 0) {
        return true;
      }
      return !!(number && typeof number === 'number');
    }
    default: {
      return false;
    }
  }
};

export {
  numberFilter,
};
