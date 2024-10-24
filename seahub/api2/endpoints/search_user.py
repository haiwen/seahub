# Copyright (c) 2012-2016 Seafile Ltd.
import os
import sys
import logging

from django.db.models import Q
from django.conf import settings as django_settings

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.utils import is_valid_email, is_org_context
from seahub.utils.ccnet_db import CcnetDB
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.profile.models import Profile
from seahub.avatar.templatetags.avatar_tags import api_avatar_url

from seahub.settings import ENABLE_GLOBAL_ADDRESSBOOK, \
    ENABLE_SEARCH_FROM_LDAP_DIRECTLY, ENABLE_SHOW_LOGIN_ID_WHEN_SEARCH_USER

logger = logging.getLogger(__name__)

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False

try:
    current_path = os.path.dirname(os.path.abspath(__file__))
    seafile_conf_dir = os.path.join(current_path, '../../../../../conf')
    sys.path.append(seafile_conf_dir)
    from seahub_custom_functions import custom_search_user
    CUSTOM_SEARCH_USER = True
except ImportError:
    CUSTOM_SEARCH_USER = False


class SearchUser(APIView):
    """ Search user from contacts/all users
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def _can_use_global_address_book(self, request):

        return request.user.permissions.can_use_global_address_book()

    def get(self, request, format=None):

        q = request.GET.get('q', None)
        if not q:
            return api_error(status.HTTP_400_BAD_REQUEST, 'q invalid.')

        email_list = []
        username = request.user.username

        if self._can_use_global_address_book(request):
            # check user permission according to user's role(default, guest, etc.)
            # if current user can use global address book
            if CLOUD_MODE:
                if is_org_context(request):

                    # get all org users
                    url_prefix = request.user.org.url_prefix
                    try:
                        all_org_users = ccnet_api.get_org_users_by_url_prefix(url_prefix, -1, -1)
                    except Exception as e:
                        logger.error(e)
                        error_msg = 'Internal Server Error'
                        return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

                    limited_emails = []
                    for org_user in all_org_users:

                        if not org_user.is_active:
                            continue

                        # prepare limited emails for search from profile
                        limited_emails.append(org_user.email)

                        # search user from org users
                        if q in org_user.email:
                            email_list.append(org_user.email)

                    # search from profile, limit search range in all org users
                    email_list += search_user_from_profile_with_limits(q, limited_emails)

                elif ENABLE_GLOBAL_ADDRESSBOOK:
                    # search from ccnet
                    email_list += search_user_from_ccnet(q)

                    # search from profile, NOT limit search range
                    email_list += search_user_from_profile(q)
                else:
                    # in cloud mode, user will be added to Contact when share repo
                    # search user from user's contacts
                    email_list += search_user_when_global_address_book_disabled(request, q)
            else:
                # not CLOUD_MODE
                # search from ccnet
                email_list += search_user_from_ccnet(q)

                # search from profile, NOT limit search range
                email_list += search_user_from_profile(q)
        else:
            # if current user can NOT use global address book,
            # he/she can also search `q` from Contact,
            # search user from user's contacts
            email_list += search_user_when_global_address_book_disabled(request, q)

        # search finished, now filter out some users

        # remove duplicate emails
        # get_emailusers_in_list can only accept 20 users at most
        email_result = list({}.fromkeys(email_list).keys())[:20]

        # specific search `q`
        user_q_obj = ccnet_api.get_emailuser(q)
        if user_q_obj and user_q_obj.is_active:
            if q in email_result:
                email_result.remove(q)
            email_result.insert(0, q)

        if django_settings.ENABLE_ADDRESSBOOK_OPT_IN:
            # get users who has setted to show in address book
            listed_users = Profile.objects.filter(list_in_address_book=True).values('user')
            listed_user_list = [u['user'] for u in listed_users]

            email_result = list(set(email_result) & set(listed_user_list))

        # check if include myself in user result
        try:
            include_self = int(request.GET.get('include_self', 1))
        except ValueError:
            include_self = 1

        if include_self == 0 and username in email_result:
            # reomve myself
            email_result.remove(username)

        if CUSTOM_SEARCH_USER:
            email_result = custom_search_user(request, email_result)

        # format user result
        try:
            size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            size = 32

        formated_result = format_searched_user_result(
                request, email_result[:10], size)

        return Response({"users": formated_result})


def format_searched_user_result(request, users, size):
    results = []
    if ENABLE_SHOW_LOGIN_ID_WHEN_SEARCH_USER:
        profile_queryset = Profile.objects.filter(user__in=users)
        profile_dict = {p.user: p.login_id for p in profile_queryset if p.login_id}

    for email in users:
        url, is_default, date_uploaded = api_avatar_url(email, size)
        user_info = {
            "email": email,
            "avatar_url": url,
            "name": email2nickname(email),
            "contact_email": email2contact_email(email),
        }
        if ENABLE_SHOW_LOGIN_ID_WHEN_SEARCH_USER:
            user_info['login_id'] = profile_dict.get(email, '')
        results.append(user_info)

    return results


def search_user_from_ccnet(q, offset=0, limit=10):
    """ Return 10 items at most.
    """

    users = []

    ccnet_db = CcnetDB()
    users, count = ccnet_db.list_eligible_users(offset, limit,
                                                is_active=True, q=q)

    if count < 10 and ENABLE_SEARCH_FROM_LDAP_DIRECTLY:
        all_ldap_users = ccnet_api.search_ldapusers(q, 0, 10 - count)
        users.extend(all_ldap_users)

    # `users` is already search result, no need search more
    email_list = []
    for user in users:
        email_list.append(user.email)

    return email_list


def search_user_from_profile(q, offset=0, limit=10, max_attempts=10):
    """Return a list of email addresses, with a length of at least 10.

    If not enough results are found, continue searching up to max_attempts times.
    """
    email_list = []
    attempts = 0

    ccnet_db = CcnetDB()

    while len(email_list) < 10 and attempts < max_attempts:

        # Search by nickname, contact email, or login ID
        users = Profile.objects.filter(
            Q(nickname__icontains=q) |
            Q(contact_email__icontains=q) |
            Q(login_id__icontains=q)
        ).values('user')[offset:offset + limit]

        new_emails = ccnet_db.get_active_users_by_user_list([user['user'] for user in users])
        email_list.extend([email for email in new_emails if email not in email_list])
        offset += limit
        attempts += 1

    return email_list[:10]


def search_user_from_profile_with_limits(q, limited_emails):
    """ Return 10 items at most.
    """
    # search within limited_emails
    users = Profile.objects.filter(
        Q(user__in=limited_emails) & (
            Q(nickname__icontains=q) |
            Q(contact_email__icontains=q) |
            Q(login_id__icontains=q)
        )
    ).values('user')[:10]

    email_list = []
    for user in users:
        email_list.append(user['user'])

    return email_list


def search_user_when_global_address_book_disabled(request, q):

    """ Return 10 items at most.
    """

    email_list = []
    username = request.user.username
    current_user = User.objects.get(email=username)
    if current_user.role.lower() != 'guest':

        if is_valid_email(q):

            # if `q` is a valid email
            email_list.append(q)

            # get user whose `contact_email` is `q`
            users = Profile.objects.filter(contact_email=q).values('user')
            for user in users:
                email_list.append(user['user'])

        # get user whose `login_id` is `q`
        username_by_login_id = Profile.objects.get_username_by_login_id(q)
        if username_by_login_id:
            email_list.append(username_by_login_id)

    return email_list
