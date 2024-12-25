import {
  CellType, COLLABORATOR_COLUMN_TYPES, FILTER_COLUMN_OPTIONS, FILTER_TERM_MODIFIER_TYPE, FILTER_PREDICATE_TYPE, FILTER_ERR_MSG,
  filterTermModifierIsWithin, filterTermModifierNotWithin,
} from '../../constants';
import { isDateColumn, getColumnOptions } from '../../utils/column';

const TERM_TYPE_MAP = {
  NUMBER: 'number',
  STRING: 'string',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
};

const PREDICATES_REQUIRE_ARRAY_TERM = [
  FILTER_PREDICATE_TYPE.IS_ANY_OF,
  FILTER_PREDICATE_TYPE.IS_NONE_OF,
];

const TEXT_COLUMN_TYPES = [CellType.TEXT, CellType.FILE_NAME];

const CHECK_EMPTY_PREDICATES = [FILTER_PREDICATE_TYPE.EMPTY, FILTER_PREDICATE_TYPE.NOT_EMPTY];

const DATE_MODIFIERS_REQUIRE_TERM = [
  FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_AGO,
  FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_FROM_NOW,
  FILTER_TERM_MODIFIER_TYPE.THE_NEXT_NUMBERS_OF_DAYS,
  FILTER_TERM_MODIFIER_TYPE.THE_PAST_NUMBERS_OF_DAYS,
  FILTER_TERM_MODIFIER_TYPE.EXACT_DATE,
];

const MODIFIERS_REQUIRE_NUMERIC_TERM = [
  FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_AGO,
  FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_FROM_NOW,
  FILTER_TERM_MODIFIER_TYPE.THE_NEXT_NUMBERS_OF_DAYS,
  FILTER_TERM_MODIFIER_TYPE.THE_PAST_NUMBERS_OF_DAYS,
];

class ValidateFilter {
  /**
   * Check filter is valid. The error_message from returns will be null if the filter is valid.
   * 1.incomplete filter which should be ignored
   *  - column_key: required
   *  - filter_predicate: required
   *  - filter_term_modifier: determined by the column to filter with
   *  - filter_term: determined by filter_predicate / the column to filter with
   * 2.illegal filter
   *  - column missing: cannot find the column to filter
   *  - column not support: the column to filter is not support
   *  - mismatch: filter_predicate, filter_term_modifier mismatch
   *  - wrong data type: filter_term with wrong data type
   *  @param {object} filter e.g. { column_key, filter_term, ... }
   *  @param {array} columns e.g. [{ key, name, ... }, ...]
   *  @param {bool} isValidTerm No longer to validate filter term if false. default as false
   *  @returns { error_message }, object
   */
  static validate(filter, columns, isValidTerm = true) {
    const {
      column_key, filter_predicate, filter_term_modifier, filter_term,
    } = filter;
    const { error_message: column_error_message } = this.validateColumn(column_key, columns);
    if (column_error_message) {
      return { error_message: column_error_message };
    }

    const filterColumn = columns.find((column) => column.key === column_key);
    const {
      error_message: predicate_error_message,
    } = this.validatePredicate(filter_predicate, filterColumn);
    if (predicate_error_message) {
      return { error_message: predicate_error_message };
    }

    if (this.isFilterOnlyWithPredicate(filter_predicate, filterColumn)) {
      return { error_message: null };
    }

    const {
      error_message: modifier_error_message,
    } = this.validateModifier(filter_term_modifier, filter_predicate, filterColumn);
    if (modifier_error_message) {
      return { error_message: modifier_error_message };
    }

    if (this.isFilterOnlyWithModifier(filter_term_modifier, filterColumn)) {
      return { error_message: null };
    }

    if (isValidTerm) {
      const {
        error_message: term_error_message,
      } = this.validateTerm(filter_term, filter_predicate, filter_term_modifier, filterColumn);
      if (term_error_message) {
        return { error_message: term_error_message };
      }
    }

    return { error_message: null };
  }

  static validateColumn(column_key, columns) {
    if (!column_key) {
      return { error_message: FILTER_ERR_MSG.INCOMPLETE_FILTER };
    }
    const filterColumn = columns.find((column) => column.key === column_key);

    if (!filterColumn) {
      return { error_message: FILTER_ERR_MSG.COLUMN_MISSING };
    }

    if (!this.isValidColumnType(filterColumn)) {
      return { error_message: FILTER_ERR_MSG.COLUMN_NOT_SUPPORTED };
    }
    return { error_message: null };
  }

  /**
   * the column to filter must be available
   */
  static validatePredicate(predicate, filterColumn) {
    if (!predicate) {
      return { error_message: FILTER_ERR_MSG.INCOMPLETE_FILTER };
    }
    const { type: columnType } = filterColumn;
    const filterConfigs = FILTER_COLUMN_OPTIONS[columnType];
    const { filterPredicateList: predicateList } = filterConfigs;
    if (!predicateList.includes(predicate)) {
      return { error_message: FILTER_ERR_MSG.UNMATCHED_PREDICATE };
    }
    return { error_message: null };
  }

  static validatePredicateWithArrayType(predicate, filterColumn) {
    const { data } = filterColumn;
    const { array_type } = data;

    // Only support: is
    if (array_type === CellType.CHECKBOX || array_type === CellType.BOOL) {
      return this.validatePredicate(predicate, { type: CellType.CHECKBOX });
    }

    // Filter predicate should support: is_empty/is_not_empty(excludes checkbox and bool)
    if (CHECK_EMPTY_PREDICATES.includes(predicate)) return true;

    if (array_type === CellType.SINGLE_SELECT || array_type === CellType.DEPARTMENT_SINGLE_SELECT) {
      return this.validatePredicate(predicate, { type: CellType.MULTIPLE_SELECT });
    }
    if (COLLABORATOR_COLUMN_TYPES.includes(array_type)) {
      return this.validatePredicate(predicate, { type: CellType.COLLABORATOR });
    }
    return this.validatePredicate(predicate, { type: array_type });
  }

  /**
   * filter predicate must be available.
   * filterColumn the column to filter must be available
   */
  static isFilterOnlyWithPredicate(predicate, filterColumn) {
    if (CHECK_EMPTY_PREDICATES.includes(predicate)) {
      return true;
    }

    const { type: columnType } = filterColumn;
    const { IS_CURRENT_USER_ID, INCLUDE_ME } = FILTER_PREDICATE_TYPE;
    if (predicate === IS_CURRENT_USER_ID && TEXT_COLUMN_TYPES.includes(columnType)) {
      return true;
    }
    if (predicate === INCLUDE_ME && COLLABORATOR_COLUMN_TYPES.includes(columnType)) {
      return true;
    }
    return false;
  }

  /**
   * filter predicate must be available.
   * the column to filter must be available
   */
  static validateModifier(modifier, predicate, filterColumn) {
    if (!isDateColumn(filterColumn)) {
      return { error_message: null };
    }
    if (!modifier) {
      return { error_message: FILTER_ERR_MSG.INCOMPLETE_FILTER };
    }
    if (predicate === FILTER_PREDICATE_TYPE.IS_WITHIN) {
      if (filterTermModifierIsWithin.includes(modifier)) {
        return { error_message: null };
      }
    } else if (filterTermModifierNotWithin.includes(modifier)) {
      return { error_message: null };
    }
    return { error_message: FILTER_ERR_MSG.UNMATCHED_MODIFIER };
  }

  /**
   * filter predicate must be available.
   * filter modifier must be available.
   * the column to filter must be available
   */
  static isFilterOnlyWithModifier(modifier, filterColumn) {
    if (isDateColumn(filterColumn)) {
      return !DATE_MODIFIERS_REQUIRE_TERM.includes(modifier);
    }
    return false;
  }

  static validateTerm(term, predicate, modifier, filterColumn) {
    if (this.isTermMissing(term)) {
      return { error_message: FILTER_ERR_MSG.INCOMPLETE_FILTER };
    }

    if (!this.isValidTerm(term, predicate, modifier, filterColumn)) {
      return { error_message: FILTER_ERR_MSG.INVALID_TERM };
    }
    return { error_message: null };
  }

  static isTermMissing(term) {
    return (!term && term !== 0 && term !== false)
      || (Array.isArray(term) && term.length === 0);
  }

  static isValidTerm(term, predicate, modifier, filterColumn) {
    switch (filterColumn.type) {
      case CellType.TEXT:
      case CellType.GEOLOCATION:
      case CellType.FILE_NAME:
      case CellType.TAGS: {
        return this.isValidTermType(term, TERM_TYPE_MAP.STRING);
      }
      case CellType.NUMBER:
      case CellType.RATE: {
        return this.isValidTermType(term, TERM_TYPE_MAP.NUMBER);
      }

      case CellType.CHECKBOX:
      case CellType.BOOL: {
        return this.isValidTermType(term, TERM_TYPE_MAP.BOOLEAN);
      }
      case CellType.COLLABORATOR:
      case CellType.CREATOR:
      case CellType.LAST_MODIFIER: {
        return this.isValidTermType(term, TERM_TYPE_MAP.ARRAY);
      }
      case CellType.DATE:
      case CellType.CTIME:
      case CellType.MTIME: {
        if (MODIFIERS_REQUIRE_NUMERIC_TERM.includes(modifier)) {
          return this.isValidTermType(term, TERM_TYPE_MAP.NUMBER);
        }
        return this.isValidTermType(term, TERM_TYPE_MAP.STRING);
      }
      case CellType.SINGLE_SELECT: {
        const options = getColumnOptions(filterColumn);
        if (PREDICATES_REQUIRE_ARRAY_TERM.includes(predicate)) {
          if (!this.isValidTermType(term, TERM_TYPE_MAP.ARRAY)) {
            return false;
          }

          // contains deleted option(s)
          return this.isValidSelectedOptions(term, options);
        }

        if (!this.isValidTermType(term, TERM_TYPE_MAP.STRING)) {
          return false;
        }

        // invalid filter_term if selected option is deleted
        return !!options.find((option) => term === option.id);
      }
      case CellType.MULTIPLE_SELECT: {
        if (!this.isValidTermType(term, TERM_TYPE_MAP.ARRAY)) {
          return false;
        }

        // contains deleted option(s)
        const options = getColumnOptions(filterColumn);
        return this.isValidSelectedOptions(term, options);
      }
      default: {
        return false;
      }
    }
  }

  static isValidTermType(term, type) {
    if (type === TERM_TYPE_MAP.ARRAY) {
      return Array.isArray(term) && term.length > 0;
    }
    if (type === CellType.NUMBER) {
      // is a number or a number string
      // eslint-disable-next-line
      return typeof term === type || !isNaN(Number(term));
    }
    // eslint-disable-next-line
    return typeof term === type;
  }

  static isValidTermWithArrayType(term, predicate, modifier, filterColumn) {
    const { data } = filterColumn;
    const { array_type, array_data } = data;
    if (array_type === CellType.SINGLE_SELECT) {
      return this.isValidTerm(term, predicate, modifier, {
        type: CellType.MULTIPLE_SELECT, data: array_data,
      });
    }
    if (COLLABORATOR_COLUMN_TYPES.includes(array_type)) {
      return this.isValidTerm(term, predicate, modifier, { type: CellType.COLLABORATOR });
    }
    return this.isValidTerm(term, predicate, modifier, { type: array_type, data: array_data });
  }

  static isValidColumnType(filterColumn) {
    const { type: columnType } = filterColumn;
    // eslint-disable-next-line
    return FILTER_COLUMN_OPTIONS.hasOwnProperty(columnType);
  }

  static isValidSelectedOptions(selectedOptionIds, options) {
    const validSelectedOptions = options.filter((option) => selectedOptionIds.includes(option.id));
    return selectedOptionIds.length === validSelectedOptions.length;
  }
}

export {
  ValidateFilter,
  DATE_MODIFIERS_REQUIRE_TERM,
};
