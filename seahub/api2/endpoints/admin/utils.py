import re
import datetime
import time

from seahub.utils import get_log_events_by_time

def check_time_period_valid(start, end):
    if not start or not end:
        return False

    # check the date format, should be like '2015-10-10'
    date_re = re.compile(r'^(\d{4})\-([1-9]|0[1-9]|1[012])\-([1-9]|0[1-9]|[12]\d|3[01])$')
    if not date_re.match(start) or not date_re.match(end):
        return False

    return True

def get_log_events_by_type_and_time(log_type, start, end):
    start_struct_time = datetime.datetime.strptime(start, "%Y-%m-%d")
    start_timestamp = time.mktime(start_struct_time.timetuple())

    end_struct_time = datetime.datetime.strptime(end, "%Y-%m-%d")
    end_timestamp = time.mktime(end_struct_time.timetuple())
    end_timestamp += 24 * 60 * 60

    events = get_log_events_by_time(log_type, start_timestamp, end_timestamp)
    events = events if events else []
    return events
