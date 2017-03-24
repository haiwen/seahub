# Copyright (c) 2012-2016 Seafile Ltd.
import re
import datetime
import time
import urllib

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

def is_first_page(page):
    return True if page == 1 else False

def is_last_page(page, per_page, total_count):
    if page * per_page >= total_count:
        return True
    else:
        return False

def generate_links_header_for_paginator(base_url, page, per_page, total_count, option_dict={}):

    if type(option_dict) is not dict:
        return ''

    query_dict = {'page': 1, 'per_page': per_page}
    query_dict.update(option_dict)

    # generate first page url
    first_page_url = base_url + '?' + urllib.urlencode(query_dict)

    # generate last page url
    last_page_query_dict = {'page': (total_count / per_page) + 1}
    query_dict.update(last_page_query_dict)
    last_page_url = base_url + '?' + urllib.urlencode(query_dict)

    # generate next page url
    next_page_query_dict = {'page': page + 1}
    query_dict.update(next_page_query_dict)
    next_page_url = base_url + '?' + urllib.urlencode(query_dict)

    # generate prev page url
    prev_page_query_dict = {'page': page - 1}
    query_dict.update(prev_page_query_dict)
    prev_page_url = base_url + '?' + urllib.urlencode(query_dict)

    # generate `Links` header
    links_header = ''
    if is_first_page(page):
        links_header = '<%s>; rel="next", <%s>; rel="last"' % (next_page_url, last_page_url)
    elif is_last_page(page, per_page, total_count):
        links_header = '<%s>; rel="first", <%s>; rel="prev"' % (first_page_url, prev_page_url)
    else:
        links_header = '<%s>; rel="next", <%s>; rel="last", <%s>; rel="first", <%s>; rel="prev"' % \
                (next_page_url, last_page_url, first_page_url, prev_page_url)

    return links_header
