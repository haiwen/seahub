import { FILTER_PREDICATE_TYPE, FILTER_TERM_MODIFIER_TYPE } from '../../../constants';
import { DateUtils } from '../../date';

/**
 * Filter date
 * @param {string} date
 * @param {string} filter_predicate
 * @param {string} filter_term_modifier
 * @param {any} filter_term date string or number etc.
 * @param {string|object} other_date date string or { startDate, endDate }
 * @returns bool
 */
const dateFilter = (date, {
  filter_predicate, filter_term_modifier, filter_term, other_date,
}) => {
  switch (filter_predicate) {
    case FILTER_PREDICATE_TYPE.IS: {
      return (
        (filter_term_modifier === FILTER_TERM_MODIFIER_TYPE.EXACT_DATE && !filter_term)
        || DateUtils.format(date) === other_date
      );
    }
    case FILTER_PREDICATE_TYPE.IS_WITHIN: {
      if (filter_term_modifier === FILTER_TERM_MODIFIER_TYPE.EXACT_DATE && !filter_term) {
        return true;
      }
      if (!date) {
        return false;
      }
      const { startDate, endDate } = other_date;
      const currentDate = DateUtils.format(date);
      return currentDate >= startDate && currentDate <= endDate;
    }
    case FILTER_PREDICATE_TYPE.IS_BEFORE: {
      if (filter_term_modifier === FILTER_TERM_MODIFIER_TYPE.EXACT_DATE && !filter_term) {
        return true;
      }
      if (!date || !DateUtils.getValidDate(date)) {
        return false;
      }

      return DateUtils.format(date) < other_date;
    }
    case FILTER_PREDICATE_TYPE.IS_AFTER: {
      if (filter_term_modifier === FILTER_TERM_MODIFIER_TYPE.EXACT_DATE && !filter_term) {
        return true;
      }
      if (!date || !DateUtils.getValidDate(date)) {
        return false;
      }
      return DateUtils.format(date) > other_date;
    }
    case FILTER_PREDICATE_TYPE.IS_ON_OR_BEFORE: {
      if (filter_term_modifier === FILTER_TERM_MODIFIER_TYPE.EXACT_DATE && !filter_term) {
        return true;
      }
      if (!date || !DateUtils.getValidDate(date)) {
        return false;
      }
      return DateUtils.format(date) <= other_date;
    }
    case FILTER_PREDICATE_TYPE.IS_ON_OR_AFTER: {
      if (filter_term_modifier === FILTER_TERM_MODIFIER_TYPE.EXACT_DATE && !filter_term) {
        return true;
      }
      if (!date || !DateUtils.getValidDate(date)) {
        return false;
      }
      return DateUtils.format(date) >= other_date;
    }
    case FILTER_PREDICATE_TYPE.IS_NOT: {
      if (filter_term_modifier === FILTER_TERM_MODIFIER_TYPE.EXACT_DATE && !filter_term) {
        return true;
      }
      if (!date || !DateUtils.getValidDate(date)) {
        return false;
      }
      return DateUtils.format(date) !== other_date;
    }
    case FILTER_PREDICATE_TYPE.EMPTY: {
      return !(date && DateUtils.getValidDate(date));
    }
    case FILTER_PREDICATE_TYPE.NOT_EMPTY: {
      return !!(date && DateUtils.getValidDate(date));
    }
    default: {
      return false;
    }
  }
};

export {
  dateFilter,
};
