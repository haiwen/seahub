import logging
import re
from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta

from seahub_io.repo_metadata.constants import FilterPredicateTypes, FilterTermModifier, PropertyTypes, \
    DurationFormatsType, PrivatePropertyKeys, ViewType, FormulaResultType, TAGS_TABLE

logger = logging.getLogger(__name__)

class SQLGeneratorOptionInvalidError(Exception):
    pass


class DateTimeQueryInvalidError(Exception):
    def __init__(self, column_name):
        self.column_name = column_name


class ColumnFilterInvalidError(Exception):
    def __init__(self, column_name, column_type, filter_predicate, support_filter_predicates, msg):
        self.column_name = column_name
        self.column_type = column_type
        self.filter_predicate = filter_predicate
        self.support_filter_predicates = support_filter_predicates
        self.msg = msg


class Operator(object):

    def __init__(self, column, filter_item):
        self.column = column
        self.filter_item = filter_item

        self.column_name = ''
        self.filter_term = ''

        self.filter_predicate = ''
        self.filter_term_modifier = ''
        self.column_type = ''
        self.column_data = {}

        self.init()

    def init(self):
        self.column_name = self.column.get('name', '')
        self.column_type = self.column.get('type', '')
        self.column_data = self.column.get('data', {})
        self.filter_predicate = self.filter_item.get('filter_predicate', '')
        self.filter_term = self.filter_item.get('filter_term', '')
        self.filter_term_modifier = self.filter_item.get('filter_term_modifier', '')
        self.case_sensitive = self.filter_item.get('case_sensitive', False)

    def op_is(self):
        if not self.filter_term:
            return ""
        return "`%s` %s '%s'" % (
            self.column_name,
            '=',
            self.filter_term
        )

    def op_is_not(self):
        if not self.filter_term:
            return ""
        return "`%s` %s '%s'" % (
            self.column_name,
            '<>',
            self.filter_term
        )

    def op_contains(self):
        if not self.filter_term:
            return ""
        return "`%s` %s '%%%s%%'" % (
            self.column_name,
            'like' if self.case_sensitive is True else 'ilike',
            self.filter_term.replace('\\', '\\\\') # special characters require translation
        )

    def op_does_not_contain(self):
        if not self.filter_term:
            return ''
        return "`%s` %s '%%%s%%'" % (
            self.column_name,
            'not like' if self.case_sensitive is True else 'not ilike',
            self.filter_term.replace('\\', '\\\\') # special characters require translation
        )

    def op_equal(self):
        if not self.filter_term and self.filter_term != 0:
            return ''
        return "`%(column_name)s` = %(value)s" % ({
            'column_name': self.column_name,
            'value': self.filter_term
        })

    def op_not_equal(self):
        if not self.filter_term and self.filter_term != 0:
            return ''
        return "`%(column_name)s` <> %(value)s" % ({
            'column_name': self.column_name,
            'value': self.filter_term
        })

    def op_less(self):
        if not self.filter_term and self.filter_term != 0:
            return ''
        return "`%(column_name)s` < %(value)s" % ({
            'column_name': self.column_name,
            'value': self.filter_term
        })

    def op_less_or_equal(self):
        if not self.filter_term and self.filter_term != 0:
            return ''
        return "`%(column_name)s` <= %(value)s" % ({
            'column_name': self.column_name,
            'value': self.filter_term
        })

    def op_greater(self):
        if not self.filter_term and self.filter_term != 0:
            return ''
        return "`%(column_name)s` > %(value)s" % ({
            'column_name': self.column_name,
            'value': self.filter_term
        })

    def op_greater_or_equal(self):
        if not self.filter_term and self.filter_term != 0:
            return ''
        return "`%(column_name)s` >= %(value)s" % ({
            'column_name': self.column_name,
            'value': self.filter_term
        })

    def op_is_empty(self):
        return "`%(column_name)s` is null" % ({
            'column_name': self.column_name
        })

    def op_is_not_empty(self):
        return "`%(column_name)s` is not null" % ({
            'column_name': self.column_name
        })

    def op_is_current_user_id(self):
        if not self.filter_term:
            return "(`%s`IS NULL AND `%s` IS NOT NULL)" % (
                self.column_name,
                self.column_name
            )
        return "`%s` %s '%s'" % (
            self.column_name,
            '=',
            self.filter_term
        )


class TextOperator(Operator):
    SUPPORT_FILTER_PREDICATE = [
        FilterPredicateTypes.CONTAINS,
        FilterPredicateTypes.NOT_CONTAIN,
        FilterPredicateTypes.IS,
        FilterPredicateTypes.IS_NOT,
        FilterPredicateTypes.EMPTY,
        FilterPredicateTypes.NOT_EMPTY,
        FilterPredicateTypes.IS_CURRENT_USER_ID,
    ]

    def __init__(self, column, filter_item):
        super(TextOperator, self).__init__(column, filter_item)

    def _escape(self, v):
        return str(v).replace("'", "''")

    def _is_parent_dir(self):
        return self.column_name == PrivatePropertyKeys.PARENT_DIR

    def op_is(self):
        if not self.filter_term:
            return ""

        if self._is_parent_dir() and isinstance(self.filter_term, list):
            conditions = []

            for t in self.filter_term:
                t = self._escape(t)

                conditions.append(
                    f"(`{self.column_name}` = '{t}' OR `{self.column_name}` LIKE '{t}/%')"
                )

            return "(%s)" % " OR ".join(conditions)

        return f"`{self.column_name}` = '{self._escape(self.filter_term)}'"

class NumberOperator(Operator):
    SUPPORT_FILTER_PREDICATE = [
        FilterPredicateTypes.EQUAL,
        FilterPredicateTypes.NOT_EQUAL,
        FilterPredicateTypes.GREATER,
        FilterPredicateTypes.GREATER_OR_EQUAL,
        FilterPredicateTypes.LESS,
        FilterPredicateTypes.LESS_OR_EQUAL,
        FilterPredicateTypes.EMPTY,
        FilterPredicateTypes.NOT_EMPTY,
    ]

    def __init__(self, column, filter_item):
        super(NumberOperator, self).__init__(column, filter_item)
        if self.column_type == PropertyTypes.DURATION:
            self.filter_term = self._duration2number()

    def _duration2number(self):
        filter_term = self.filter_term
        column_data = self.column.get('data', {})
        if filter_term == 0 or filter_term == '0':
            return 0
        if not filter_term:
            return ''

        duration_format = column_data.get('duration_format')
        if duration_format not in [
            DurationFormatsType.H_MM,
            DurationFormatsType.H_MM_SS,
            DurationFormatsType.H_MM_SS_S,
            DurationFormatsType.H_MM_SS_SS,
            DurationFormatsType.H_MM_SS_SSS
        ]:
            return ''
        try:
            return int(filter_term)
        except:
            duration_str = filter_term

        is_negtive = duration_str[0] == '-'
        duration_time = duration_str
        if is_negtive:
            duration_time = duration_str[1:]

        duration_time_split_list = re.split('[:：]', duration_time)
        hours, minutes, seconds = 0, 0, 0
        if duration_format == DurationFormatsType.H_MM:
            try:
                hours = int(duration_time_split_list[0])
            except:
                hours = 0
            try:
                minutes = int(duration_time_split_list[1])
            except:
                minutes = 0

        else:
            try:
                hours = int(duration_time_split_list[0])
            except:
                hours = 0
            try:
                minutes = int(duration_time_split_list[1])
            except:
                minutes = 0
            try:
                seconds = int(duration_time_split_list[2])
            except:
                seconds = 0

        if (not hours) and (not minutes) and (not seconds):
            return ''

        total_time = 3600 * hours + 60 * minutes + seconds
        return -total_time if is_negtive else total_time


class SingleSelectOperator(Operator):
    SUPPORT_FILTER_PREDICATE = [
        FilterPredicateTypes.IS_ANY_OF,
        FilterPredicateTypes.IS_NONE_OF,
        FilterPredicateTypes.IS,
        FilterPredicateTypes.IS_NOT,
        FilterPredicateTypes.EMPTY,
        FilterPredicateTypes.NOT_EMPTY,
    ]

    def __init__(self, column, filter_item):
        super(SingleSelectOperator, self).__init__(column, filter_item)

    def _get_option_name_by_id(self, option_id):
        options = self.column.get('data', {}).get('options', [])
        for op in options:
            if op.get('id') == option_id:
                return op.get('name')
        raise SQLGeneratorOptionInvalidError('option is invalid.')

    def op_is(self):
        if not self.filter_term:
            return ''
        filter_term = self._get_option_name_by_id(self.filter_term)
        if not filter_term:
            return ''
        return "`%s` %s '%s'" % (
            self.column_name,
            '=',
            filter_term
        )

    def op_is_not(self):
        if not self.filter_term:
            return ''
        filter_term = self._get_option_name_by_id(self.filter_term)
        if not filter_term:
            return ''
        return "`%s` %s '%s'" % (
            self.column_name,
            '<>',
            filter_term
        )

    def op_is_any_of(self):
        filter_term = self.filter_term
        if not filter_term:
            return ''
        if not isinstance(filter_term, list):
            filter_term = [filter_term, ]
        filter_term = [self._get_option_name_by_id(f) for f in filter_term]
        option_names = ["'%s'" % (op_name) for op_name in filter_term]
        if not option_names:
            return ""
        return "`%(column_name)s` in (%(option_names)s)" % ({
            "column_name": self.column_name,
            "option_names": ", ".join(option_names)
        })

    def op_is_none_of(self):
        filter_term = self.filter_term
        if not filter_term:
            return ''
        if not isinstance(filter_term, list):
            filter_term = [filter_term, ]
        filter_term = [self._get_option_name_by_id(f) for f in filter_term]
        option_names = ["'%s'" % (op_name) for op_name in filter_term]
        if not option_names:
            return ""
        return "`%(column_name)s` not in (%(option_names)s)" % ({
            "column_name": self.column_name,
            "option_names": ", ".join(option_names)
        })


class MultipleSelectOperator(Operator):
    SUPPORT_FILTER_PREDICATE = [
        FilterPredicateTypes.HAS_ANY_OF,
        FilterPredicateTypes.HAS_NONE_OF,
        FilterPredicateTypes.HAS_ALL_OF,
        FilterPredicateTypes.IS_EXACTLY,
        FilterPredicateTypes.EMPTY,
        FilterPredicateTypes.NOT_EMPTY,
    ]

    def __init__(self, column, filter_item):
        super(MultipleSelectOperator, self).__init__(column, filter_item)

    def _get_option_name_by_id(self, option_id):
        options = self.column.get('data', {}).get('options', [])
        if not options:
            return option_id
        for op in options:
            if op.get('id') == option_id:
                return op.get('name')
        raise SQLGeneratorOptionInvalidError('option is invalid')

    def op_has_any_of(self):
        if not self.filter_term:
            return ""
        filter_term = [self._get_option_name_by_id(f) for f in self.filter_term]
        option_names = ["'%s'" % op_name for op_name in filter_term]
        option_names_str = ', '.join(option_names)
        return "`%(column_name)s` in (%(option_names_str)s)" % ({
            "column_name": self.column_name,
            "option_names_str": option_names_str
        })

    def op_has_none_of(self):
        if not self.filter_term:
            return ""
        filter_term = [self._get_option_name_by_id(f) for f in self.filter_term]
        option_names = ["'%s'" % op_name for op_name in filter_term]
        option_names_str = ', '.join(option_names)
        return "`%(column_name)s` has none of (%(option_names_str)s)" % ({
            "column_name": self.column_name,
            "option_names_str": option_names_str
        })

    def op_has_all_of(self):
        if not self.filter_term:
            return ""
        filter_term = [self._get_option_name_by_id(f) for f in self.filter_term]
        option_names = ["'%s'" % op_name for op_name in filter_term]
        option_names_str = ', '.join(option_names)
        return "`%(column_name)s` has all of (%(option_names_str)s)" % ({
            "column_name": self.column_name,
            "option_names_str": option_names_str
        })

    def op_is_exactly(self):
        if not self.filter_term:
            return ""
        filter_term = [self._get_option_name_by_id(f) for f in self.filter_term]
        option_names = ["'%s'" % op_name for op_name in filter_term]
        option_names_str = ', '.join(option_names)
        return "`%(column_name)s` is exactly (%(option_names_str)s)" % ({
            "column_name": self.column_name,
            "option_names_str": option_names_str
        })


class DateOperator(Operator):
    SUPPORT_FILTER_PREDICATE = [
        FilterPredicateTypes.IS,
        FilterPredicateTypes.IS_NOT,
        FilterPredicateTypes.IS_AFTER,
        FilterPredicateTypes.IS_BEFORE,
        FilterPredicateTypes.IS_ON_OR_BEFORE,
        FilterPredicateTypes.IS_ON_OR_AFTER,
        FilterPredicateTypes.EMPTY,
        FilterPredicateTypes.NOT_EMPTY,
        FilterPredicateTypes.IS_WITHIN,
    ]


    def __init__(self, column, filter_item):
        super(DateOperator, self).__init__(column, filter_item)

    def _get_end_day_of_month(self, year, month):
        days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0):
            days[1] = 29

        return days[month - 1]

    def _format_date(self, dt):
        if dt:
            return dt.strftime("%Y-%m-%d")

    def _other_date(self):
        filter_term_modifier = self.filter_term_modifier
        filter_term = self.filter_term
        today = datetime.today()
        year = today.year

        if filter_term_modifier == FilterTermModifier.TODAY:
            return today, None

        if filter_term_modifier == FilterTermModifier.TOMORROW:
            tomorrow = today + timedelta(days=1)
            return tomorrow, None

        if filter_term_modifier == FilterTermModifier.YESTERDAY:
            yesterday = today - timedelta(days=1)
            return yesterday, None

        if filter_term_modifier == FilterTermModifier.ONE_WEEK_AGO:
            one_week_ago = today - timedelta(days=7)
            return one_week_ago, None

        if filter_term_modifier == FilterTermModifier.ONE_WEEK_FROM_NOW:
            one_week_from_now = today + timedelta(days=7)
            return one_week_from_now, None

        if filter_term_modifier == FilterTermModifier.ONE_MONTH_AGO:
            one_month_ago = today - relativedelta(months=1)
            return one_month_ago, None

        if filter_term_modifier == FilterTermModifier.ONE_MONTH_FROM_NOW:
            one_month_from_now = today + relativedelta(months=1)
            return one_month_from_now, None

        if filter_term_modifier == FilterTermModifier.NUMBER_OF_DAYS_AGO:
            try:
                filter_term = int(filter_term)
            except:
                logger.debug("filter_term is invalid, please assign an integer value of days to filter_term")
                return None, None
            try:
                days_ago = today - timedelta(days=filter_term)
            except OverflowError:
                raise DateTimeQueryInvalidError(self.column_name)
            return days_ago, None

        if filter_term_modifier == FilterTermModifier.NUMBER_OF_DAYS_FROM_NOW:
            try:
                filter_term = int(filter_term)
            except:
                logger.debug("filter_term is invalid, please assign an integer value of days to filter_term")
                return None, None
            try:
                days_after = today + timedelta(days=filter_term)
            except OverflowError:
                raise DateTimeQueryInvalidError(self.column_name)
            return days_after, None

        if filter_term_modifier == FilterTermModifier.EXACT_DATE:
            try:
                return datetime.strptime(filter_term, "%Y-%m-%d").date(), None
            except ValueError:
                raise DateTimeQueryInvalidError(self.column_name)
            except:
                logger.debug("filter_term is invalid, please assign an date value to filter_term, such as YYYY-MM-DD")
                return None, None

        if filter_term_modifier == FilterTermModifier.THE_PAST_WEEK:
            week_day = today.isoweekday()  # 1-7
            start_date = today - timedelta(days=(week_day + 6))
            end_date = today - timedelta(days=week_day)
            return start_date, end_date

        if filter_term_modifier == FilterTermModifier.THIS_WEEK:
            week_day = today.isoweekday()
            start_date = today - timedelta(days=week_day - 1)
            end_date = today + timedelta(days=7 - week_day)
            return start_date, end_date

        if filter_term_modifier == FilterTermModifier.THE_NEXT_WEEK:
            week_day = today.isoweekday()
            start_date = today + timedelta(days=8 - week_day)
            end_date = today + timedelta(days=14 - week_day)
            return start_date, end_date

        if filter_term_modifier == FilterTermModifier.THE_PAST_MONTH:
            one_month_ago = today - relativedelta(months=1)
            one_month_ago_year = one_month_ago.year
            one_month_ago_month = one_month_ago.month
            one_month_age_end_day = self._get_end_day_of_month(one_month_ago_year, one_month_ago_month)
            start_date = datetime(one_month_ago_year, one_month_ago_month, 1)
            end_date = datetime(one_month_ago_year, one_month_ago_month, one_month_age_end_day)
            return start_date, end_date

        if filter_term_modifier == FilterTermModifier.THIS_MONTH:
            current_month = today.month
            current_year = today.year
            current_month_end_day = self._get_end_day_of_month(current_year, current_month)
            start_date = datetime(current_year, current_month, 1)
            end_date = datetime(current_year, current_month, current_month_end_day)
            return start_date, end_date

        if filter_term_modifier == FilterTermModifier.THE_NEXT_MONTH:
            next_month = today + relativedelta(months=1)
            next_month_year = next_month.year
            next_month_month = next_month.month
            next_month_end_day = self._get_end_day_of_month(next_month_year, next_month_month)
            start_date = datetime(next_month_year, next_month_month, 1)
            end_date = datetime(next_month_year, next_month_month, next_month_end_day)
            return start_date, end_date

        if filter_term_modifier == FilterTermModifier.THE_PAST_YEAR:
            last_year = year - 1
            start_date = datetime(last_year, 1, 1)
            end_date = datetime(last_year, 12, 31)
            return start_date, end_date

        if filter_term_modifier == FilterTermModifier.THIS_YEAR:
            start_date = datetime(year, 1, 1)
            end_date = datetime(year, 12, 31)
            return start_date, end_date

        if filter_term_modifier == FilterTermModifier.THE_NEXT_YEAR:
            next_year = year + 1
            start_date = datetime(next_year, 1, 1)
            end_date = datetime(next_year, 12, 31)
            return start_date, end_date

        if filter_term_modifier == FilterTermModifier.THE_NEXT_NUMBERS_OF_DAYS:
            try:
                filter_term = int(filter_term)
            except:
                logger.debug("filter_term is invalid, please assign an integer value of days to filter_term")
                return None, None
            try:
                end_date = today + timedelta(days=filter_term)
            except OverflowError:
                raise DateTimeQueryInvalidError(self.column_name)
            return today, end_date

        if filter_term_modifier == FilterTermModifier.THE_PAST_NUMBERS_OF_DAYS:
            try:
                filter_term = int(filter_term)
            except:
                logger.debug("filter_term is invalid, please assign an integer value of days to filter_term")
                return None, None
            try:
                start_date = today - timedelta(days=filter_term)
            except OverflowError:
                raise DateTimeQueryInvalidError(self.column_name)
            return start_date, today

        return None, None

    def is_need_filter_term(self):
        filter_term_modifier = self.filter_term_modifier
        if filter_term_modifier in [
            FilterTermModifier.NUMBER_OF_DAYS_AGO,
            FilterTermModifier.NUMBER_OF_DAYS_FROM_NOW,
            FilterTermModifier.THE_NEXT_NUMBERS_OF_DAYS,
            FilterTermModifier.THE_PAST_NUMBERS_OF_DAYS,
            FilterTermModifier.EXACT_DATE
        ]:
            return True
        return False

    def op_is(self):
        if self.is_need_filter_term() and not self.filter_term and self.filter_term != 0:
            return ''
        date, _ = self._other_date()
        if not date:
            return ""
        next_date = self._format_date(date + timedelta(days=1))
        target_date = self._format_date(date)
        return "`%(column_name)s` >= '%(target_date)s' and `%(column_name)s` < '%(next_date)s'" % ({
            "column_name": self.column_name,
            "target_date": target_date,
            "next_date": next_date
        })

    def op_is_within(self):
        if self.is_need_filter_term() and not self.filter_term and self.filter_term != 0:
            return ''
        start_date, end_date = self._other_date()
        if not (start_date, end_date ):
            return ""
        return "`%(column_name)s` >= '%(start_date)s' and `%(column_name)s` <= '%(end_date)s'" % ({
            "column_name": self.column_name,
            "start_date": self._format_date(start_date),
            "end_date": self._format_date(end_date)
        })

    def op_is_before(self):
        if self.is_need_filter_term() and not self.filter_term and self.filter_term != 0:
            return ''
        target_date, _ = self._other_date()
        if not target_date:
            return ""
        return "`%(column_name)s` < '%(target_date)s' and `%(column_name)s` is not null" % ({
            "column_name": self.column_name,
            "target_date": self._format_date(target_date)
        })

    def op_is_after(self):
        if self.is_need_filter_term() and not self.filter_term and self.filter_term != 0:
            return ''
        target_date, _ = self._other_date()
        if not target_date:
            return ""
        next_date = self._format_date(target_date + timedelta(days=1))
        return "`%(column_name)s` >= '%(target_date)s' and `%(column_name)s` is not null" % ({
            "column_name": self.column_name,
            "target_date": next_date,
        })

    def op_is_on_or_before(self):
        if self.is_need_filter_term() and not self.filter_term and self.filter_term != 0:
            return ''
        target_date, _ = self._other_date()
        if not target_date:
            return ""
        return "`%(column_name)s` <= '%(target_date)s' and `%(column_name)s` is not null" % ({
            "column_name": self.column_name,
            "target_date": self._format_date(target_date)
        })

    def op_is_on_or_after(self):
        if self.is_need_filter_term() and not self.filter_term and self.filter_term != 0:
            return ''
        target_date, _ = self._other_date()
        if not target_date:
            return ""
        return "`%(column_name)s` >= '%(target_date)s' and `%(column_name)s` is not null" % ({
            "column_name": self.column_name,
            "target_date": self._format_date(target_date)
        })

    def op_is_not(self):
        if self.is_need_filter_term() and not self.filter_term and self.filter_term != 0:
            return ''
        target_date, _ = self._other_date()
        if not target_date:
            return ""
        start_date = target_date - timedelta(days=1)
        end_date = target_date + timedelta(days=1)
        return "(`%(column_name)s` >= '%(end_date)s' or `%(column_name)s` <= '%(start_date)s' or `%(column_name)s` is null)" % (
        {
            "column_name": self.column_name,
            "start_date": self._format_date(start_date),
            "end_date": self._format_date(end_date)
        })


class CheckBoxOperator(Operator):
    SUPPORT_FILTER_PREDICATE = [
        FilterPredicateTypes.IS,
    ]

    def op_is(self):
        if not self.filter_term:
            return "(`%(column_name)s` = %(value)s or `%(column_name)s` is null)" % ({
                "column_name": self.column_name,
                "value": self.filter_term
            })

        return "`%(column_name)s` = %(value)s" % ({
            "column_name": self.column_name,
            "value": self.filter_term
        })


class CollaboratorOperator(Operator):
    SUPPORT_FILTER_PREDICATE = [
        FilterPredicateTypes.HAS_ALL_OF,
        FilterPredicateTypes.IS_EXACTLY,
        FilterPredicateTypes.EMPTY,
        FilterPredicateTypes.NOT_EMPTY,
        FilterPredicateTypes.HAS_ANY_OF,
        FilterPredicateTypes.HAS_NONE_OF,
        FilterPredicateTypes.INCLUDE_ME,
    ]

    def op_has_any_of(self):
        select_collaborators = self.filter_term
        if not select_collaborators:
            return ""
        if not isinstance(select_collaborators, list):
            select_collaborators = [select_collaborators, ]
        collaborator_list = ["'%s'" % collaborator for collaborator in select_collaborators]
        filter_term_str = ", ".join(collaborator_list)
        return "`%(column_name)s` in (%(filter_term_str)s)" % ({
            "column_name": self.column_name,
            "filter_term_str": filter_term_str
        })

    def op_has_all_of(self):
        select_collaborators = self.filter_term
        if not select_collaborators:
            return ""
        if not isinstance(select_collaborators, list):
            select_collaborators = [select_collaborators, ]
        collaborator_list = ["'%s'" % collaborator for collaborator in select_collaborators]
        filter_term_str = ", ".join(collaborator_list)
        return "`%(column_name)s` has all of (%(filter_term_str)s)" % ({
            "column_name": self.column_name,
            "filter_term_str": filter_term_str
        })

    def op_has_none_of(self):
        select_collaborators = self.filter_term
        if not select_collaborators:
            return ""
        if not isinstance(select_collaborators, list):
            select_collaborators = [select_collaborators, ]
        collaborator_list = ["'%s'" % collaborator for collaborator in select_collaborators]
        filter_term_str = ", ".join(collaborator_list)
        return "`%(column_name)s` has none of (%(filter_term_str)s)" % ({
            "column_name": self.column_name,
            "filter_term_str": filter_term_str
        })

    def op_is_exactly(self):
        select_collaborators = self.filter_term
        if not select_collaborators:
            return ""
        if not isinstance(select_collaborators, list):
            select_collaborators = [select_collaborators, ]
        collaborator_list = ["'%s'" % collaborator for collaborator in select_collaborators]
        filter_term_str = ", ".join(collaborator_list)
        return "`%(column_name)s` is exactly (%(filter_term_str)s)" % ({
            "column_name": self.column_name,
            "filter_term_str": filter_term_str
        })

    def op_include_me(self):
        return self.op_has_any_of()


class CreatorOperator(Operator):
    SUPPORT_FILTER_PREDICATE = [
        FilterPredicateTypes.CONTAINS,
        FilterPredicateTypes.NOT_CONTAIN,
        FilterPredicateTypes.IS,
        FilterPredicateTypes.IS_NOT,
        FilterPredicateTypes.INCLUDE_ME,
    ]

    def op_is(self):
        term = self.filter_term
        if not term:
            return ""
        if isinstance(self.filter_term, list):
            term = term[0]
        return "`%s` %s '%s'" % (
            self.column_name,
            '=',
            term,
        )

    def op_is_not(self):
        term = self.filter_term
        if not term:
            return ""
        if isinstance(self.filter_term, list):
            term = term[0]
        return "`%s` %s '%s'" % (
            self.column_name,
            '<>',
            term
        )

    def op_contains(self):
        select_collaborators = self.filter_term
        if not select_collaborators:
            return ''
        if not isinstance(select_collaborators, list):
            select_collaborators = [select_collaborators, ]
        creator_list = ["'%s'" % collaborator for collaborator in select_collaborators]
        filter_term_str = ", ".join(creator_list)
        return "`%(column_name)s` in (%(filter_term_str)s)" % ({
            "column_name": self.column_name,
            "filter_term_str": filter_term_str
        })

    def op_does_not_contain(self):
        select_collaborators = self.filter_term
        if not select_collaborators:
            return ''
        if not isinstance(select_collaborators, list):
            select_collaborators = [select_collaborators, ]
        creator_list = ["'%s'" % collaborator for collaborator in select_collaborators]
        return "`%(column_name)s` not in (%(filter_term_str)s)" % ({
            "column_name": self.column_name,
            "filter_term_str": ', '.join(creator_list)
        })

    def op_include_me(self):
        select_collaborators = self.filter_term
        if not select_collaborators:
            return ''
        if not isinstance(select_collaborators, list):
            select_collaborators = [select_collaborators, ]
        creator = select_collaborators[0] if select_collaborators else ''
        return "%s %s '%s'" % (
            self.column_name,
            '=',
            creator
        )


class FileOperator(Operator):
    SUPPORT_FILTER_PREDICATE = [
        FilterPredicateTypes.EMPTY,
        FilterPredicateTypes.NOT_EMPTY,
    ]
    def __init__(self, column, filter_item):
        super(FileOperator, self).__init__(column, filter_item)


class TagsOperator(Operator):
    SUPPORT_FILTER_PREDICATE = [
        FilterPredicateTypes.HAS_ANY_OF,
        FilterPredicateTypes.HAS_NONE_OF,
        FilterPredicateTypes.HAS_ALL_OF,
        FilterPredicateTypes.IS_EXACTLY,
    ]

    def __init__(self, column, filter_item, tags_data):
        super(TagsOperator, self).__init__(column, filter_item)
        self.tags_data = tags_data.get('results', [])

    def _get_tag_name_by_id(self, tag_id):
        if not self.tags_data:
            return ''
        for tag in self.tags_data:
            if tag.get(TAGS_TABLE.columns.id.name) == tag_id:
                return tag.get(TAGS_TABLE.columns.name.name)
        return ''

    def get_tags_names_str(self):
        if not self.filter_term:
            return ''
        if not isinstance(self.filter_term, list):
            return ''
        filter_term = [self._get_tag_name_by_id(tag_id) for tag_id in self.filter_term]
        filter_term = [tag_name for tag_name in filter_term if tag_name]
        if not filter_term:
            return ''
        return ', '.join([f'"{tag_name}"' for tag_name in filter_term])

    def op_has_any_of(self):
        tags_names_str = self.get_tags_names_str()
        if not tags_names_str:
            return ''
        return f'`{self.column_name}` in ({tags_names_str})'

    def op_has_none_of(self):
        tags_names_str = self.get_tags_names_str()
        if not tags_names_str:
            return ''
        return f'`{self.column_name}` has none of ({tags_names_str})'

    def op_has_all_of(self):
        tags_names_str = self.get_tags_names_str()
        if not tags_names_str:
            return ''
        return f'`{self.column_name}` has all of ({tags_names_str})'

    def op_is_exactly(self):
        tags_names_str = self.get_tags_names_str()
        if not tags_names_str:
            return ''
        return f'`{self.column_name}` is exactly ({tags_names_str})'


class ArrayOperator(object):

    def __new__(cls, column, filter_item):
        column_data = column.get('data', {})
        column_name = column.get('name', '')

        array_type, array_data = column_data.get('array_type', ''), column_data.get('array_data')
        linked_column = {
            'name': column_name,
            'type': array_type,
            'data': array_data
        }

        if array_type == FormulaResultType.STRING:
            new_column = {
                'name': column_name,
                'type': PropertyTypes.TEXT,
            }
            return TextOperator(new_column, filter_item)

        if array_type == FormulaResultType.BOOL:
            new_column = {
                'name': column_name,
                'type': PropertyTypes.CHECKBOX,
            }
            return CheckBoxOperator(new_column, filter_item)

        if array_type == PropertyTypes.SINGLE_SELECT:
            return MultipleSelectOperator(linked_column, filter_item)

        if array_type in [PropertyTypes.CREATOR, PropertyTypes.LAST_MODIFIER]:
            return CollaboratorOperator(linked_column, filter_item)

        operator = _get_operator_by_type(array_type)
        return operator(linked_column, filter_item)


def _filter2sql(operator):
    support_filter_predicates = operator.SUPPORT_FILTER_PREDICATE
    filter_predicate = operator.filter_predicate
    # no predicate, ignore
    if not filter_predicate:
        return ''
    # only operator need modifier, date and no filter_term_modifier, ignore
    if isinstance(operator, DateOperator) and not operator.filter_term_modifier:
        return ''
    if operator.filter_predicate not in support_filter_predicates:
        raise ColumnFilterInvalidError(
            operator.column_name,
            operator.column_type,
            operator.filter_predicate,
            support_filter_predicates,
            "Filter on %(column_name)s invalid: %(column_type)s type column '%(column_name)s' does not support '%(value)s', available predicates are %(available_predicates)s" % {
                'column_type': operator.column_type,
                'column_name': operator.column_name,
                'value': operator.filter_predicate,
                'available_predicates': support_filter_predicates,
            }
        )

    if filter_predicate == FilterPredicateTypes.IS:
        return operator.op_is()
    if filter_predicate == FilterPredicateTypes.IS_NOT:
        return operator.op_is_not()
    if filter_predicate == FilterPredicateTypes.CONTAINS:
        return operator.op_contains()
    if filter_predicate == FilterPredicateTypes.NOT_CONTAIN:
        return operator.op_does_not_contain()
    if filter_predicate == FilterPredicateTypes.EMPTY:
        return operator.op_is_empty()
    if filter_predicate == FilterPredicateTypes.NOT_EMPTY:
        return operator.op_is_not_empty()
    if filter_predicate == FilterPredicateTypes.EQUAL:
        return operator.op_equal()
    if filter_predicate == FilterPredicateTypes.NOT_EQUAL:
        return operator.op_not_equal()
    if filter_predicate == FilterPredicateTypes.GREATER:
        return operator.op_greater()
    if filter_predicate == FilterPredicateTypes.GREATER_OR_EQUAL:
        return operator.op_greater_or_equal()
    if filter_predicate == FilterPredicateTypes.LESS:
        return operator.op_less()
    if filter_predicate == FilterPredicateTypes.LESS_OR_EQUAL:
        return operator.op_less_or_equal()
    if filter_predicate == FilterPredicateTypes.IS_EXACTLY:
        return operator.op_is_exactly()
    if filter_predicate == FilterPredicateTypes.IS_ANY_OF:
        return operator.op_is_any_of()
    if filter_predicate == FilterPredicateTypes.IS_NONE_OF:
        return operator.op_is_none_of()
    if filter_predicate == FilterPredicateTypes.IS_ON_OR_AFTER:
        return operator.op_is_on_or_after()
    if filter_predicate == FilterPredicateTypes.IS_AFTER:
        return operator.op_is_after()
    if filter_predicate == FilterPredicateTypes.IS_ON_OR_BEFORE:
        return operator.op_is_on_or_before()
    if filter_predicate == FilterPredicateTypes.IS_BEFORE:
        return operator.op_is_before()
    if filter_predicate == FilterPredicateTypes.IS_WITHIN:
        return operator.op_is_within()
    if filter_predicate == FilterPredicateTypes.HAS_ALL_OF:
        return operator.op_has_all_of()
    if filter_predicate == FilterPredicateTypes.HAS_ANY_OF:
        return operator.op_has_any_of()
    if filter_predicate == FilterPredicateTypes.HAS_NONE_OF:
        return operator.op_has_none_of()
    if filter_predicate == FilterPredicateTypes.INCLUDE_ME:
        return operator.op_include_me()
    if filter_predicate == FilterPredicateTypes.IS_CURRENT_USER_ID:
        return operator.op_is_current_user_id()
    return ''


def _get_operator_by_type(column_type):

    if column_type in [
        PropertyTypes.TEXT,
        PropertyTypes.URL,
        PropertyTypes.AUTO_NUMBER,
        PropertyTypes.EMAIL,
        PropertyTypes.GEOLOCATION,
        PropertyTypes.FILE_NAME
    ]:
        return TextOperator

    if column_type in [
        PropertyTypes.DURATION,
        PropertyTypes.NUMBER,
        PropertyTypes.RATE
    ]:
        return NumberOperator

    if column_type == PropertyTypes.CHECKBOX:
        return CheckBoxOperator

    if column_type in [
        PropertyTypes.DATE,
        PropertyTypes.CTIME,
        PropertyTypes.MTIME
    ]:
        return DateOperator

    if column_type == PropertyTypes.SINGLE_SELECT:
        return SingleSelectOperator

    if column_type == PropertyTypes.MULTIPLE_SELECT:
        return MultipleSelectOperator

    if column_type == PropertyTypes.COLLABORATOR:
        return CollaboratorOperator

    if column_type in [
        PropertyTypes.CREATOR,
        PropertyTypes.LAST_MODIFIER,
    ]:
        return CreatorOperator

    if column_type in [
        PropertyTypes.FILE,
        PropertyTypes.IMAGE,
        PropertyTypes.LONG_TEXT,
    ]:
        return FileOperator

    if column_type == PropertyTypes.TAGS:
        return TagsOperator

    if column_type == PropertyTypes.LINK:
        return ArrayOperator

    return None


class SQLGenerator(object):

    def __init__(self, table, columns, view, start=0, limit=0, other_params={'username': '', 'id_in_org': '', 'tags_data': {}}):
        self.table = table
        self.table_name = table.name
        self.view = view
        self.columns = columns
        self.start = start
        self.limit = limit
        self.username = other_params.get('username', '')
        self.id_in_org = other_params.get('id_in_org', '')
        self.tags_data = other_params.get('tags_data', {})

    def _get_column_by_key(self, col_key):
        for col in self.columns:
            if col.get('key') == col_key:
                return col
        return None

    def _get_column_by_name(self, col_name):
        for col in self.columns:
            if col.get('name') == col_name:
                return col
        return None

    def sort_2_sql(self):
        condition_sorts = self.view.get('sorts', [])
        order_header = 'ORDER BY '
        clauses = []
        if condition_sorts:
            for sort in condition_sorts:
                column_key = sort.get('column_key', '')
                column_name = sort.get('column_name', '')
                sort_type = 'ASC' if sort.get('sort_type', 'DESC') == 'up' else 'DESC'
                column = self._get_column_by_key(column_key)
                if not column:
                    column = self._get_column_by_name(column_name)
                    if not column:
                        if column_key in ['_ctime', '_mtime']:
                            order_condition = '%s %s' % (column_key, sort_type)
                            clauses.append(order_condition)
                            continue
                        else:
                            continue

                order_condition = '`%s` %s' % (column.get('name'), sort_type)
                clauses.append(order_condition)
        if not clauses:
            return f' ORDER BY `{self.table.columns.file_ctime.name}`'

        return "%s%s" % (
            order_header,
            ', '.join(clauses)
        )

    def _get_column_type(self, column):
        key = column.get('key', '')
        column_type = column.get('type', '')

        if key == PrivatePropertyKeys.FILE_CTIME:
            return PropertyTypes.CTIME
        if key == PrivatePropertyKeys.MTIME or key == PrivatePropertyKeys.FILE_MTIME:
            return PropertyTypes.MTIME
        if key == PrivatePropertyKeys.CREATOR or key == PrivatePropertyKeys.FILE_CREATOR:
            return PropertyTypes.CREATOR
        if key == PrivatePropertyKeys.LAST_MODIFIER or key == PrivatePropertyKeys.FILE_MODIFIER:
            return PropertyTypes.LAST_MODIFIER
        if key == PrivatePropertyKeys.FILE_NAME:
            return PropertyTypes.FILE_NAME
        if key == PrivatePropertyKeys.IS_DIR:
            return PropertyTypes.CHECKBOX
        if key == PrivatePropertyKeys.FILE_COLLABORATORS:
            return PropertyTypes.COLLABORATOR
        if key == PrivatePropertyKeys.FILE_EXPIRE_TIME:
            return PropertyTypes.DATE
        if key == PrivatePropertyKeys.FILE_KEYWORDS:
            return PropertyTypes.TEXT
        if key == PrivatePropertyKeys.FILE_DESCRIPTION:
            return PropertyTypes.LONG_TEXT
        if key == PrivatePropertyKeys.FILE_EXPIRED:
            return PropertyTypes.CHECKBOX
        if key == PrivatePropertyKeys.FILE_STATUS:
            return PropertyTypes.SINGLE_SELECT
        if key == PrivatePropertyKeys.LOCATION:
            return PropertyTypes.GEOLOCATION
        if key == PrivatePropertyKeys.OWNER:
            return PropertyTypes.COLLABORATOR
        if key == PrivatePropertyKeys.TAGS:
            return PropertyTypes.TAGS
        return column_type

    def _generator_filters_sql(self, filters, filter_conjunction = 'And'):
        if not filters:
            return ''

        filter_string_list = []
        filter_conjunction_split = " %s " % filter_conjunction
        for filter_item in filters:
            column_key = filter_item.get('column_key')
            column_name = filter_item.get('column_name')
            # skip when the column key or name is missing
            if not (column_key or column_name):
                continue
            column = column_key and self._get_column_by_key(column_key)
            if not column:
                column = column_name and self._get_column_by_name(column_name)
            # skip when the column is deleted
            if not column:
                logger.warning('Column not found column_key: %s column_name: %s' % (column_key, column_name))
                continue

            if filter_item.get('filter_predicate') == 'include_me':
                filter_item['filter_term'] = [self.username]
            if filter_item.get('filter_predicate') == 'is_current_user_ID':
                filter_item['filter_term'] = self.id_in_org

            column_type = self._get_column_type(column)
            column['type'] = column_type
            operator_cls = _get_operator_by_type(column_type)
            if not operator_cls:
                raise ValueError('filter: %s not support to sql' % filter_item)
            if column_type == PropertyTypes.TAGS:
                operator = operator_cls(column, filter_item, self.tags_data)
            else:
                operator = operator_cls(column, filter_item)
            sql_condition = _filter2sql(operator)
            if not sql_condition:
                continue
            filter_string_list.append(sql_condition)

        if filter_string_list:
            return "%s" % (
                filter_conjunction_split.join(filter_string_list)
            )
        return ''

    def _basic_filters_sql(self):
        basic_filters = self.view.get('basic_filters', [])
        view_type = self.view.get('type', 'table')
        filter_conjunction = 'AND'
        if not basic_filters:
            return ''

        filters = []
        for filter_item in basic_filters:
            column_key = filter_item.get('column_key')
            if column_key == PrivatePropertyKeys.IS_DIR:
                filter_term = filter_item.get('filter_term', 'all')
                if filter_term == 'file':
                    filter_item['filter_term'] = False
                elif filter_term == 'folder':
                    filter_item['filter_term'] = True
                else:
                    continue
                filters.append(filter_item)
            elif column_key == PrivatePropertyKeys.FILE_TYPE:
                if view_type == ViewType.GALLERY or view_type == ViewType.MAP:
                    filter_term = filter_item.get('filter_term', 'picture')
                    if filter_term == 'picture':
                        filter_item['filter_term'] = '_picture'
                    elif filter_term == 'video':
                        filter_item['filter_term'] = '_video'
                    else:
                        filter_item['filter_predicate'] = 'is_any_of'
                        filter_item['filter_term'] = ['_picture', '_video']
                filters.append(filter_item)
            elif column_key == PrivatePropertyKeys.PARENT_DIR:
                filter_term = filter_item.get('filter_term')

                if isinstance(filter_term, list):
                    if '/' in filter_term:
                        continue
                    if len(filter_term) == 0:
                        continue
                filter_item['filter_term'] = filter_term
                filters.append(filter_item)
            else:
                filters.append(filter_item)

        return self._generator_filters_sql(filters, filter_conjunction)

    def _filters_sql(self):
        filters = self.view.get('filters', [])
        filter_conjunction = self.view.get('filter_conjunction', 'And')
        return self._generator_filters_sql(filters, filter_conjunction)

    def _filter_2_sql(self):
        filter_header = 'WHERE'
        basic_filters_sql = self._basic_filters_sql()
        filters_sql = self._filters_sql()

        if not basic_filters_sql and not filters_sql:
            return ''

        if basic_filters_sql and filters_sql:
            return "%s (%s) AND (%s)" % (
                filter_header,
                basic_filters_sql,
                filters_sql,
            )

        if basic_filters_sql and not filters_sql:
            return "%s %s" % (
                filter_header,
                basic_filters_sql,
            )

        return "%s %s" % (
                filter_header,
                filters_sql,
            )

    def _limit_2_sql(self):
        return '%s %s, %s' % (
            "LIMIT",
            self.start or 0,
            self.limit or 100
        )

    def to_sql(self):
        sql = "%s `%s`" % ("SELECT * FROM", self.table_name)
        filter_clause = self._filter_2_sql()
        sort_clause = self.sort_2_sql()
        limit_clause = self._limit_2_sql()

        if filter_clause:
            sql = "%s %s" % (sql, filter_clause)
        if sort_clause:
            sql = "%s %s" % (sql, sort_clause)
        if limit_clause:
            sql = "%s %s" % (sql, limit_clause)
        return sql


def view_data_2_sql(table, columns, view, start, limit, params):
    """ view to sql """
    sql_generator = SQLGenerator(table, columns, view, start, limit, params)
    return sql_generator.to_sql()

def sort_data_2_sql(table, columns, sorts):
    """ sorts to sql """
    sql_generator = SQLGenerator(table, columns, {'sorts': sorts})
    return sql_generator.sort_2_sql()
