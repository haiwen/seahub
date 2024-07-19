import { FILTER_PREDICATE_TYPE } from '../../../constants';

/**
 * Filter collaborator
 * @param {array} emails e.g. [ collaborator.email, ... ]
 * @param {string} filter_predicate
 * @param {array} filter_term e.g. [ collaborator.email, ... ]
 * @param {string} username
 * @returns bool
 */
const collaboratorFilter = (emails, { filter_predicate, filter_term }, username) => {
  switch (filter_predicate) {
    case FILTER_PREDICATE_TYPE.HAS_ANY_OF: {
      return (
        (!Array.isArray(filter_term) || filter_term.length === 0)
        || (Array.isArray(emails) && filter_term.some((email) => emails.includes(email)))
      );
    }
    case FILTER_PREDICATE_TYPE.HAS_ALL_OF: {
      return (
        (!Array.isArray(filter_term) || filter_term.length === 0)
        || (Array.isArray(emails) && filter_term.every((email) => emails.includes(email)))
      );
    }
    case FILTER_PREDICATE_TYPE.HAS_NONE_OF: {
      if (
        !Array.isArray(filter_term) || filter_term.length === 0
        || !Array.isArray(emails) || emails.length === 0
      ) {
        return true;
      }
      return filter_term.every((email) => emails.indexOf(email) < 0);
    }
    case FILTER_PREDICATE_TYPE.IS_EXACTLY: {
      if (!Array.isArray(filter_term) || filter_term.length === 0) {
        return true;
      }
      if (!Array.isArray(emails) || emails.length === 0) {
        return false;
      }
      const nonReptCellValue = [...new Set(emails)];
      if (nonReptCellValue.length !== filter_term.length) {
        return false;
      }
      return filter_term.every((email) => nonReptCellValue.includes(email));
    }
    case FILTER_PREDICATE_TYPE.EMPTY: {
      return !Array.isArray(emails) || emails.length === 0;
    }
    case FILTER_PREDICATE_TYPE.NOT_EMPTY: {
      return Array.isArray(emails) && emails.length > 0;
    }
    case FILTER_PREDICATE_TYPE.INCLUDE_ME: {
      return Array.isArray(emails) && emails.indexOf(username) > -1;
    }
    default: {
      return false;
    }
  }
};

export {
  collaboratorFilter,
};
