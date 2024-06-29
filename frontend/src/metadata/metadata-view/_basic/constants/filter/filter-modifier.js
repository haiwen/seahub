import { gettext } from '../../../../../utils/constants';

const FILTER_TERM_MODIFIER_TYPE = {
  TODAY: 'today',
  TOMORROW: 'tomorrow',
  YESTERDAY: 'yesterday',
  ONE_WEEK_AGO: 'one_week_ago',
  ONE_WEEK_FROM_NOW: 'one_week_from_now',
  ONE_MONTH_AGO: 'one_month_ago',
  ONE_MONTH_FROM_NOW: 'one_month_from_now',
  NUMBER_OF_DAYS_AGO: 'number_of_days_ago',
  NUMBER_OF_DAYS_FROM_NOW: 'number_of_days_from_now',
  EXACT_DATE: 'exact_date',
  THE_PAST_WEEK: 'the_past_week',
  THE_PAST_MONTH: 'the_past_month',
  THE_PAST_YEAR: 'the_past_year',
  THE_NEXT_WEEK: 'the_next_week',
  THE_NEXT_MONTH: 'the_next_month',
  THE_NEXT_YEAR: 'the_next_year',
  THE_NEXT_NUMBERS_OF_DAYS: 'the_next_numbers_of_days',
  THE_PAST_NUMBERS_OF_DAYS: 'the_past_numbers_of_days',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  THIS_YEAR: 'this_year',
};

const FILTER_TERM_MODIFIER_SHOW = {
  [FILTER_TERM_MODIFIER_TYPE.TODAY]: gettext('Today'),
  [FILTER_TERM_MODIFIER_TYPE.TOMORROW]: gettext('Tomorrow'),
  [FILTER_TERM_MODIFIER_TYPE.YESTERDAY]: gettext('Yesterday'),
  [FILTER_TERM_MODIFIER_TYPE.ONE_WEEK_AGO]: gettext('One_week_ago'),
  [FILTER_TERM_MODIFIER_TYPE.ONE_WEEK_FROM_NOW]: gettext('One_week_from_now'),
  [FILTER_TERM_MODIFIER_TYPE.ONE_MONTH_AGO]: gettext('One_month_ago'),
  [FILTER_TERM_MODIFIER_TYPE.ONE_MONTH_FROM_NOW]: gettext('One_month_from_now'),
  [FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_AGO]: gettext('Number_of_days_ago'),
  [FILTER_TERM_MODIFIER_TYPE.NUMBER_OF_DAYS_FROM_NOW]: gettext('Number_of_days_from_now'),
  [FILTER_TERM_MODIFIER_TYPE.EXACT_DATE]: gettext('Exact_date'),
  [FILTER_TERM_MODIFIER_TYPE.THE_PAST_WEEK]: gettext('The_past_week'),
  [FILTER_TERM_MODIFIER_TYPE.THE_PAST_MONTH]: gettext('The_past_month'),
  [FILTER_TERM_MODIFIER_TYPE.THE_PAST_YEAR]: gettext('The_past_year'),
  [FILTER_TERM_MODIFIER_TYPE.THE_NEXT_WEEK]: gettext('The_next_week'),
  [FILTER_TERM_MODIFIER_TYPE.THE_NEXT_MONTH]: gettext('The_next_month'),
  [FILTER_TERM_MODIFIER_TYPE.THE_NEXT_YEAR]: gettext('The_next_year'),
  [FILTER_TERM_MODIFIER_TYPE.THE_NEXT_NUMBERS_OF_DAYS]: gettext('The_next_numbers_of_days'),
  [FILTER_TERM_MODIFIER_TYPE.THE_PAST_NUMBERS_OF_DAYS]: gettext('The_past_numbers_of_days'),
  [FILTER_TERM_MODIFIER_TYPE.THIS_WEEK]: gettext('This_week'),
  [FILTER_TERM_MODIFIER_TYPE.THIS_MONTH]: gettext('This_month'),
  [FILTER_TERM_MODIFIER_TYPE.THIS_YEAR]: gettext('This_year'),
};

export {
  FILTER_TERM_MODIFIER_TYPE,
  FILTER_TERM_MODIFIER_SHOW,
};
