import {
  CellType,
  FILTER_PREDICATE_TYPE,
  FILTER_COLUMN_OPTIONS,
  FILTER_TERM_MODIFIER_TYPE,
  filterTermModifierNotWithin,
  filterTermModifierIsWithin,
  isDateColumn,
  FILTER_ERR_MSG,
} from '../_basic';

export const SPECIAL_TERM_TYPE = {
  CREATOR: 'creator',
  SINGLE_SELECT: 'single_select',
  MULTIPLE_SELECT: 'multiple_select',
  COLLABORATOR: 'collaborator',
  RATE: 'rate'
};

export const SIMPLE_TEXT_INPUT_COLUMNS_MAP = {
  [CellType.TEXT]: true,
  [CellType.URL]: true,
};

export const DATE_LABEL_MAP = {
  [FILTER_TERM_MODIFIER_TYPE.EXACT_DATE]: true,
  [FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_AGO]: true,
  [FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_FROM_NOW]: true,
  [FILTER_TERM_MODIFIER_TYPE.THE_NEXT_NUMBERS_OF_DAYS]: true,
  [FILTER_TERM_MODIFIER_TYPE.THE_PAST_NUMBERS_OF_DAYS]: true,
};

export const ARRAY_PREDICATE = {
  [FILTER_PREDICATE_TYPE.IS_ANY_OF]: true,
  [FILTER_PREDICATE_TYPE.IS_NONE_OF]: true,
  [FILTER_PREDICATE_TYPE.HAS_ANY_OF]: true,
  [FILTER_PREDICATE_TYPE.HAS_ALL_OF]: true,
  [FILTER_PREDICATE_TYPE.HAS_NONE_OF]: true,
  [FILTER_PREDICATE_TYPE.IS_EXACTLY]: true,
};

const STRING_PREDICATE = {
  [FILTER_PREDICATE_TYPE.IS]: true,
  [FILTER_PREDICATE_TYPE.IS_NOT]: true
};

export const DATA_EMPTY_LABEL_MAP = {
  [FILTER_PREDICATE_TYPE.EMPTY]: true,
  [FILTER_PREDICATE_TYPE.NOT_EMPTY]: true,
};

export const FILTER_ERR_MSG_LIST = [
  FILTER_ERR_MSG.INVALID_FILTER,
  FILTER_ERR_MSG.INCOMPLETE_FILTER,
  FILTER_ERR_MSG.COLUMN_MISSING,
  FILTER_ERR_MSG.COLUMN_NOT_SUPPORTED,
  FILTER_ERR_MSG.UNMATCHED_PREDICATE,
  FILTER_ERR_MSG.UNMATCHED_MODIFIER,
  FILTER_ERR_MSG.INVALID_TERM,
];

const MULTIPLE_SELECTOR_COLUMNS = [CellType.CREATOR, CellType.LAST_MODIFIER];

export const isFilterTermArray = (column, filterPredicate) => {
  const { type } = column;
  if (MULTIPLE_SELECTOR_COLUMNS.includes(type)) {
    return true;
  }
  if (type === CellType.SINGLE_SELECT && [FILTER_PREDICATE_TYPE.IS_ANY_OF, FILTER_PREDICATE_TYPE.IS_NONE_OF].includes(filterPredicate)) {
    return true;
  }
  return false;
};

export const getUpdatedFilterByCreator = (filter, collaborator) => {
  const multipleSelectType = [FILTER_PREDICATE_TYPE.CONTAINS, FILTER_PREDICATE_TYPE.NOT_CONTAIN];
  let { filter_predicate, filter_term: filterTerm } = filter;
  if (multipleSelectType.includes(filter_predicate)) {
    filterTerm = filterTerm ? filter.filter_term.slice(0) : [];
    let selectedEmail = collaborator.email;
    let collaborator_index = filterTerm.indexOf(selectedEmail);
    if (collaborator_index > -1) {
      filterTerm.splice(collaborator_index, 1);
    } else {
      filterTerm.push(selectedEmail);
    }
  } else {
    if (filterTerm[0] === collaborator.email) {
      return;
    }
    filterTerm = [collaborator.email];
  }
  return Object.assign({}, filter, { filter_term: filterTerm });
};

export const getUpdatedFilterBySelectSingle = (filter, columnOption) => {
  let new_filter_term;
  // if predicate is any of / is none of, filter_term is array; else filter_term is string
  if (ARRAY_PREDICATE[filter.filter_predicate]) {
    new_filter_term = Array.isArray(filter.filter_term) ? [...filter.filter_term] : [];
    const index = new_filter_term.indexOf(columnOption.id);
    if (index === -1) {
      new_filter_term.push(columnOption.id);
    } else {
      new_filter_term.splice(index, 1);
    }
  } else {
    new_filter_term = columnOption.id;
  }
  return Object.assign({}, filter, { filter_term: new_filter_term });
};

export const getUpdatedFilterBySelectMultiple = (filter, columnOption) => {
  let filterTerm = filter.filter_term ? filter.filter_term : [];
  let index = filterTerm.indexOf(columnOption.id);
  if (index > -1) {
    filterTerm.splice(index, 1);
  } else {
    filterTerm.push(columnOption.id);
  }
  return Object.assign({}, filter, { filter_term: filterTerm });
};

export const getUpdatedFilterByCollaborator = (filter, collaborator) => {
  let filterTerm = filter.filter_term ? filter.filter_term.slice(0) : [];
  let selectedEmail = collaborator.email;
  let collaborator_index = filterTerm.indexOf(selectedEmail);
  if (collaborator_index > -1) {
    filterTerm.splice(collaborator_index, 1);
  } else {
    filterTerm.push(selectedEmail);
  }
  return Object.assign({}, filter, { filter_term: filterTerm });
};

export const getUpdatedFilterByRate = (filter, value) => {
  if (filter.filter_term === value) {
    return Object.assign({}, filter, { filter_term: 0 });
  }
  return Object.assign({}, filter, { filter_term: value });
};

export const getColumnOptions = (column) => {
  const { type } = column;
  return FILTER_COLUMN_OPTIONS[type] || {};
};

export const getFilterByColumn = (column, filter = {}) => {
  let { filterPredicateList } = getColumnOptions(column);
  if (!filterPredicateList) return;
  let filterPredicate = filterPredicateList[0];

  let updatedFilter = Object.assign({}, filter, { column_key: column.key, filter_predicate: filterPredicate });

  // text | number | long-text | url | email
  // auto-number | geolocation | duration
  updatedFilter.filter_term = '';

  // single-select | multiple-select | collaborators | creator | last-modifier
  if (isFilterTermArray(column, filterPredicate)) {
    updatedFilter.filter_term = [];
    return updatedFilter;
  }
  // date | ctime | mtime
  if (isDateColumn(column)) {
    let filterTermModifier = filterPredicate === FILTER_PREDICATE_TYPE.IS_WITHIN ? filterTermModifierIsWithin[0] : filterTermModifierNotWithin[0];
    updatedFilter.filter_term_modifier = filterTermModifier;
    updatedFilter.filter_term = '';
    return updatedFilter;
  }

  return updatedFilter;
};

// file, image : not support
// text, long-text, number, single-select, date, ctime, mtime, formula, link, geolocation : string
// checkbox : boolean
// multiple-select, collaborator, creator, last modifier : array

export const getUpdatedFilterByColumn = (filters, filterIndex, column) => {
  const filter = filters[filterIndex];
  if (filter.column_key === column.key) {
    return;
  }
  return getFilterByColumn(column, filter);
};

export const getUpdatedFilterByPredicate = (filter, column, filterPredicate) => {
  let updatedFilter = Object.assign({}, filter, { filter_predicate: filterPredicate });
  let { type: columnType } = column;
  if ([CellType.CREATOR, CellType.LAST_MODIFIER].includes(columnType)) {
    if (STRING_PREDICATE[filter.filter_predicate] !== STRING_PREDICATE[filterPredicate]
      || filterPredicate === FILTER_PREDICATE_TYPE.INCLUDE_ME
    ) {
      updatedFilter.filter_term = [];
    }
  }
  if (isFilterTermArray(column, filterPredicate)) {
    if (DATA_EMPTY_LABEL_MAP[filterPredicate] || filterPredicate === FILTER_PREDICATE_TYPE.INCLUDE_ME) {
      updatedFilter.filter_term = [];
    }
    return updatedFilter;
  }
  if (isDateColumn(column)) {
    let filterTermModifier = filterPredicate === FILTER_PREDICATE_TYPE.IS_WITHIN ? filterTermModifierIsWithin[0] : filterTermModifierNotWithin[0];
    updatedFilter.filter_term_modifier = filterTermModifier;
    return updatedFilter;
  }

  return updatedFilter;
};

export const getUpdatedFilterByTermModifier = (filter, filterTermModifier) => {
  if (filter.filter_term_modifier === filterTermModifier) {
    return;
  }
  return Object.assign({}, filter, { filter_term_modifier: filterTermModifier });
};

export const getUpdatedFilterByNormalTerm = (filter, column, filterIndex, event) => {
  let filterTerm;
  if (column.type === CellType.CHECKBOX) {
    filterTerm = event.target.checked;
  } else {
    filterTerm = event.target.value;
  }
  if (filter.filter_term === filterTerm) {
    return filter;
  }
  return Object.assign({}, filter, { filter_term: filterTerm });
};

export const getUpdatedFilterBySpecialTerm = (filter, type, value) => {
  switch (type) {
    case SPECIAL_TERM_TYPE.CREATOR: {
      return getUpdatedFilterByCreator(filter, value);
    }
    case SPECIAL_TERM_TYPE.SINGLE_SELECT: {
      return getUpdatedFilterBySelectSingle(filter, value);
    }
    case SPECIAL_TERM_TYPE.MULTIPLE_SELECT: {
      return getUpdatedFilterBySelectMultiple(filter, value);
    }
    case SPECIAL_TERM_TYPE.COLLABORATOR: {
      return getUpdatedFilterByCollaborator(filter, value);
    }
    case SPECIAL_TERM_TYPE.RATE: {
      return getUpdatedFilterByRate(filter, value);
    }
    default: {
      return filter;
    }
  }
};
