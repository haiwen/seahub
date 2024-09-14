const FILTER_CONJUNCTION_TYPE = {
  AND: 'And',
  OR: 'Or',
};

const FILTER_ERR_MSG = {
  INVALID_FILTER: 'invalid filter',
  INCOMPLETE_FILTER: 'incomplete filter',
  COLUMN_MISSING: 'the column to filter does not exist',
  COLUMN_NOT_SUPPORTED: 'the column to filter is not supported',
  UNMATCHED_PREDICATE: 'unmatched filter predicate',
  UNMATCHED_MODIFIER: 'unmatched filter modifier',
  INVALID_TERM: 'invalid filter term',
};

export {
  FILTER_CONJUNCTION_TYPE,
  FILTER_ERR_MSG,
};

export { FILTER_COLUMN_OPTIONS } from './filter-column-options';

export {
  FILTER_TERM_MODIFIER_TYPE,
  FILTER_TERM_MODIFIER_SHOW,
} from './filter-modifier';

export {
  FILTER_PREDICATE_TYPE,
  FILTER_PREDICATE_SHOW,
} from './filter-predicate';

export {
  filterTermModifierIsWithin,
  filterTermModifierNotWithin,
} from './filter-is-within';
