import { ValidateFilter } from '../validate';
import { DateUtils } from '../date';
import { CellType, FILTER_ERR_MSG, FILTER_TERM_MODIFIER_TYPE } from '../../constants';

const EXACT_DATE_TERM_MODIFIER_TYPES = [
  FILTER_TERM_MODIFIER_TYPE.TODAY,
  FILTER_TERM_MODIFIER_TYPE.TOMORROW,
  FILTER_TERM_MODIFIER_TYPE.YESTERDAY,
  FILTER_TERM_MODIFIER_TYPE.ONE_WEEK_AGO,
  FILTER_TERM_MODIFIER_TYPE.ONE_WEEK_FROM_NOW,
  FILTER_TERM_MODIFIER_TYPE.ONE_MONTH_AGO,
  FILTER_TERM_MODIFIER_TYPE.ONE_MONTH_FROM_NOW,
  FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_AGO,
  FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_FROM_NOW,
  FILTER_TERM_MODIFIER_TYPE.EXACT_DATE,
];

/**
 * Get filters which excludes incomplete
 * @param {array} filters e.g. [{ column_key, filter_predicate, ... }]
 * @param {array} columns
 * @returns valid filters, array
 */
const getValidFilters = (filters, columns) => {
  if (!Array.isArray(filters) || !Array.isArray(columns)) {
    return [];
  }

  return filters.filter((filter) => {
    const { error_message } = ValidateFilter.validate(filter, columns);
    return !error_message || error_message !== FILTER_ERR_MSG.INCOMPLETE_FILTER;
  });
};

/**
 * Get filters without error messages
 * @param {array} filters e.g. [{ column_key, filter_predicate, ... }]
 * @param {array} columns
 * @returns valid filters, array
 */
const getValidFiltersWithoutError = (filters, columns) => {
  if (!Array.isArray(filters) || !Array.isArray(columns)) {
    return [];
  }

  return filters.filter((filter) => !ValidateFilter.validate(filter, columns).error_message);
};

/**
 * Generate date for filter
 * @param {string} filterTermModifier
 * @param {any} filterTerm
 * @returns date | date range, object
 */
const otherDate = (filterTermModifier, filterTerm) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // use js month representation: 0 - 11
  const day = today.getDate();

  //          0   1   2   3    4   5   6   7   8   9  10  11 days in every month
  let days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  days[1] = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28; // is leap year
  switch (filterTermModifier) {
    case FILTER_TERM_MODIFIER_TYPE.TODAY: {
      // today, should start at 0:00 and end at 24:00
      return new Date(year, month, day, 0, 0, 0);
    }
    case FILTER_TERM_MODIFIER_TYPE.TOMORROW: {
      return new Date(year, month, day + 1);
    }
    case FILTER_TERM_MODIFIER_TYPE.YESTERDAY: {
      return new Date(year, month, day - 1);
    }
    case FILTER_TERM_MODIFIER_TYPE.ONE_WEEK_AGO: {
      return new Date(year, month, day - 7);
    }
    case FILTER_TERM_MODIFIER_TYPE.ONE_WEEK_FROM_NOW: {
      return new Date(year, month, day + 7);
    }
    case FILTER_TERM_MODIFIER_TYPE.ONE_MONTH_AGO: {
      const pastMonth = month - 1;
      const monthDaysIndex = month === 0 ? 11 : pastMonth;
      const currentDay = day > days[monthDaysIndex] ? days[monthDaysIndex] : day;
      return new Date(year, pastMonth, currentDay);
    }
    case FILTER_TERM_MODIFIER_TYPE.ONE_MONTH_FROM_NOW: {
      const nextMonth = month + 1;
      const monthDaysIndex = month === 11 ? 0 : nextMonth;
      const currentDay = day > days[monthDaysIndex] ? days[monthDaysIndex] : day;
      return new Date(year, nextMonth, currentDay);
    }
    case FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_AGO: {
      return new Date(year, month, day - Number(filterTerm));
    }
    case FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_FROM_NOW: {
      return new Date(year, month, day + Number(filterTerm));
    }
    case FILTER_TERM_MODIFIER_TYPE.EXACT_DATE: {
      return new Date(filterTerm);
    }
    case FILTER_TERM_MODIFIER_TYPE.THE_PAST_WEEK: {
      const weekDay = today.getDay() !== 0 ? today.getDay() : 7;
      return {
        startDate: new Date(year, month, day - weekDay - 6),
        endDate: new Date(year, month, day - weekDay),
      };
    }
    case FILTER_TERM_MODIFIER_TYPE.THIS_WEEK: {
      const weekDay = today.getDay() !== 0 ? today.getDay() : 7;
      return {
        startDate: new Date(year, month, day - weekDay + 1),
        endDate: new Date(year, month, day - weekDay + 7),
      };
    }
    case FILTER_TERM_MODIFIER_TYPE.THE_NEXT_WEEK: {
      const weekDay = today.getDay() !== 0 ? today.getDay() : 7;
      return {
        startDate: new Date(year, month, day - weekDay + 8),
        endDate: new Date(year, month, day - weekDay + 14),
      };
    }
    case FILTER_TERM_MODIFIER_TYPE.THE_PAST_MONTH: {
      const pastMonth = month - 1;
      return {
        startDate: new Date(year, pastMonth, 1),
        endDate: new Date(year, pastMonth, days[month === 0 ? 11 : pastMonth]),
      };
    }
    case FILTER_TERM_MODIFIER_TYPE.THIS_MONTH: {
      return {
        startDate: new Date(year, month, 1),
        endDate: new Date(year, month, days[month]),
      };
    }
    case FILTER_TERM_MODIFIER_TYPE.THE_NEXT_MONTH: {
      const nextMonth = month + 1;
      return {
        startDate: new Date(year, nextMonth, 1),
        endDate: new Date(year, nextMonth, month === 11 ? days[0] : days[nextMonth]),
      };
    }
    case FILTER_TERM_MODIFIER_TYPE.THE_PAST_YEAR: {
      const pastYear = year - 1;
      return {
        startDate: new Date(pastYear, 0, 1), // The computer's month starts at 0.
        endDate: new Date(pastYear, 11, 31),
      };
    }
    case FILTER_TERM_MODIFIER_TYPE.THIS_YEAR: {
      return {
        startDate: new Date(year, 0, 1),
        endDate: new Date(year, 11, 31),
      };
    }
    case FILTER_TERM_MODIFIER_TYPE.THE_NEXT_YEAR: {
      const nextYear = year + 1;
      return {
        startDate: new Date(nextYear, 0, 1),
        endDate: new Date(nextYear, 11, 31),
      };
    }
    case FILTER_TERM_MODIFIER_TYPE.THE_NEXT_NUMBERS_OF_DAYS: {
      return {
        startDate: new Date(year, month, day, 0, 0, 0),
        endDate: new Date(year, month, day + Number(filterTerm)),
      };
    }
    case FILTER_TERM_MODIFIER_TYPE.THE_PAST_NUMBERS_OF_DAYS: {
      return {
        startDate: new Date(year, month, day - Number(filterTerm)),
        endDate: new Date(year, month, day, 0, 0, 0),
      };
    }
    default: {
      return {};
    }
  }
};

/**
 * Generate formatted date for filter
 * @param {string} filterTermModifier
 * @param {any} filterTerm
 * @returns formatted date | date range, object
 */
const getFormattedFilterOtherDate = (filterTermModifier, filterTerm) => {
  const _otherDate = otherDate(filterTermModifier, filterTerm);
  if (EXACT_DATE_TERM_MODIFIER_TYPES.includes(filterTermModifier)) {
    return DateUtils.format(_otherDate);
  }

  const { startDate, endDate } = _otherDate;
  return {
    startDate: startDate ? DateUtils.format(startDate) : '',
    endDate: endDate ? DateUtils.format(endDate) : '',
  };
};

/**
 * Format filter with other_date, linked_column etc.
 * @param {object} filter e.g. { filter_term, filter_term_modifier, ... }
 * @param {object} column
 * @returns formatted filter
 */
const getFormattedFilter = (filter, column) => {
  const { filter_term, filter_term_modifier } = filter;
  let { type: columnType } = column;
  let formattedFilter = filter;
  switch (columnType) {
    case CellType.CTIME:
    case CellType.MTIME:
    case CellType.DATE: {
      formattedFilter.other_date = getFormattedFilterOtherDate(filter_term_modifier, filter_term);
      break;
    }
    default: {
      break;
    }
  }
  return formattedFilter;
};

/**
 * Get formatted filters with other_date, linked_column etc.
 * @param {array} filters [{ filter_term, filter_term_modifier, column, ... }]
 * @returns formatted filters, array
 */
const getFormattedFilters = (filters) => (
  filters.map((filter) => (
    getFormattedFilter(filter, filter.column)
  ))
);

/**
 * Get filters without error messages and formatted with filter column
 * @param {array} filters e.g. [{ column_key, filter_predicate, ... }]
 * @param {array} columns
 * @returns filters, array
 */
const deleteInvalidFilter = (filters, columns) => {
  if (!Array.isArray(filters) || filters.length === 0) {
    return [];
  }
  let cleanFilters = [];
  filters.forEach((filter) => {
    const { column_key } = filter;
    const { error_message } = ValidateFilter.validate(filter, columns);
    if (error_message) {
      if (error_message !== FILTER_ERR_MSG.INCOMPLETE_FILTER) {
        throw new Error(error_message);
      }
    } else {
      const filterColumn = columns.find((column) => column.key === column_key);
      const newFilter = { ...filter, column: filterColumn };
      cleanFilters.push(newFilter);
    }
  });
  return cleanFilters;
};

export {
  getValidFilters,
  getValidFiltersWithoutError,
  deleteInvalidFilter,
  otherDate,
  getFormattedFilterOtherDate,
  getFormattedFilter,
  getFormattedFilters,
};
