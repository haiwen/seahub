# Copyright (c) 2012-2016 Seafile Ltd.
import re
import datetime
import time
import urllib
import logging

from rest_framework import status

from seaserv import ccnet_api
from pysearpc import SearpcError

from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils import get_log_events_by_time, is_pro_version, is_org_context

try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

logger = logging.getLogger(__name__)

def api_check_group(func):
    """
    Decorator for check if group valid
    """
    def _decorated(view, request, group_id, *args, **kwargs):
        group_id = int(group_id) # Checked by URL Conf
        try:
            group = ccnet_api.get_group(int(group_id))
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return func(view, request, group_id, *args, **kwargs)

    return _decorated

def add_org_context(func):
    def _decorated(view, request, *args, **kwargs):
        if is_org_context(request):
            org_id = request.user.org.org_id
        else:
            org_id = None
        return func(view, request, org_id=org_id, *args, **kwargs)

    return _decorated

def is_org_user(username, org_id=None):
    """ Check if an user is an org user.

    Keyword arguments:
    org_id -- An integer greater than zero. If provided,
    check if the user is a member of the specific org.
    """

    if not is_pro_version() or not MULTI_TENANCY:
        return False

    try:
        if org_id:
            # Return non-zero if True, otherwise 0.
            return ccnet_api.org_user_exists(org_id, username) != 0
        else:
            orgs = ccnet_api.get_orgs_by_user(username)
            return len(orgs) > 0
    except Exception as e:
        logger.error(e)
        return False

def get_user_contact_email_dict(email_list):
    email_list = set(email_list)
    user_contact_email_dict = {}
    for email in email_list:
        if not user_contact_email_dict.has_key(email):
            user_contact_email_dict[email] = email2contact_email(email)

    return user_contact_email_dict

def get_user_name_dict(email_list):
    email_list = set(email_list)
    user_name_dict = {}
    for email in email_list:
        if not user_name_dict.has_key(email):
            user_name_dict[email] = email2nickname(email)

    return user_name_dict

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

def generate_links_header_for_paginator(base_url, page, per_page, total_count, option_dict={}):

    def is_first_page(page):
        return True if page == 1 else False

    def is_last_page(page, per_page, total_count):
        if page * per_page >= total_count:
            return True
        else:
            return False

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
