# Copyright (c) 2012-2016 Seafile Ltd.
import os
import sys
import json
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
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.profile.models import Profile
from seahub.contacts.models import Contact
from seahub.avatar.templatetags.avatar_tags import api_avatar_url

from seahub.settings import ENABLE_GLOBAL_ADDRESSBOOK, \
    ENABLE_SEARCH_FROM_LDAP_DIRECTLY

logger = logging.getLogger(__name__)

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False

try:
    current_path = os.path.dirname(os.path.abspath(__file__))
    seafile_conf_dir = os.path.join(current_path, \
            '../../../../../conf')
    sys.path.append(seafile_conf_dir)
    from seahub_custom_functions import custom_search_user
    CUSTOM_SEARCH_USER = True
except ImportError as e:
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

        ## search finished, now filter out some users

        # remove duplicate emails
        email_list = {}.fromkeys(email_list).keys()

        email_result = []

        # remove nonexistent or inactive user
        email_list_json = json.dumps(email_list)
        user_obj_list = ccnet_api.get_emailusers_in_list('DB', email_list_json) + \
                ccnet_api.get_emailusers_in_list('LDAP', email_list_json)
        for user_obj in user_obj_list:
            if user_obj.is_active:
                email_result.append(user_obj.email)

        if django_settings.ENABLE_ADDRESSBOOK_OPT_IN:
            # get users who has setted to show in address book
            listed_users = Profile.objects.filter(list_in_address_book=True).values('user')
            listed_user_list = [ u['user'] for u in listed_users ]

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

    for email in users:
        url, is_default, date_uploaded = api_avatar_url(email, size)
        results.append({
            "email": email,
            "avatar_url": request.build_absolute_uri(url),
            "name": email2nickname(email),
            "contact_email": email2contact_email(email),
        })

    return results

def search_user_from_ccnet(q):
    """ Return 10 items at most.
    """

    users = []

    db_users = ccnet_api.search_emailusers('DB', q, 0, 10)
    users.extend(db_users)

    count = len(users)
    if count < 10:
        ldap_imported_users = ccnet_api.search_emailusers('LDAP', q, 0, 10 - count)
        users.extend(ldap_imported_users)

    count = len(users)
    if count < 10 and ENABLE_SEARCH_FROM_LDAP_DIRECTLY:
        all_ldap_users = ccnet_api.search_ldapusers(q, 0, 10 - count)
        users.extend(all_ldap_users)

    # `users` is already search result, no need search more
    email_list = []
    for user in users:
        email_list.append(user.email)

    return email_list

def search_user_from_profile(q):
    """ Return 10 items at most.
    """
    # 'nickname__icontains' for search by nickname
    # 'contact_email__icontains' for search by contact email
    users = Profile.objects.filter(Q(nickname__icontains=q) | \
            Q(contact_email__icontains=q)).values('user')[:10]

    email_list = []
    for user in users:
        email_list.append(user['user'])

    return email_list

def search_user_from_profile_with_limits(q, limited_emails):
    """ Return 10 items at most.
    """
    # search within limited_emails
    users = Profile.objects.filter(Q(user__in=limited_emails) &
            (Q(nickname__icontains=q) | Q(contact_email__icontains=q))).values('user')[:10]

    email_list = []
    for user in users:
        email_list.append(user['user'])

    return email_list

def search_user_when_global_address_book_disabled(request, q):
    """ Return 10 items at most.
    """

    email_list = []
    username = request.user.username

    # search from contact
    # get user's contact list
    contacts = Contact.objects.get_contacts_by_user(username)
    for contact in contacts:
        # search user from contact list
        if q in contact.contact_email:
            email_list.append(contact.contact_email)

    # search from profile, limit search range in user's contacts
    limited_emails = []
    for contact in contacts:
        limited_emails.append(contact.contact_email)

    email_list += search_user_from_profile_with_limits(q, limited_emails)

    current_user = User.objects.get(email=username)
    if is_valid_email(q) and current_user.role.lower() != 'guest':
        # if `q` is a valid email and current is not a guest user
        email_list.append(q)

        # get user whose `contact_email` is `q`
        users = Profile.objects.filter(contact_email=q).values('user')
        for user in users:
            email_list.append(user['user'])

    return email_list
