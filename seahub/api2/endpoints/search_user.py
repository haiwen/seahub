# Copyright (c) 2012-2016 Seafile Ltd.
import json

from django.db.models import Q
from django.http import HttpResponse

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework import status

import seaserv

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.utils import is_valid_email, is_org_context
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile
from seahub.contacts.models import Contact
from seahub.avatar.templatetags.avatar_tags import api_avatar_url

from seahub.settings import ENABLE_GLOBAL_ADDRESSBOOK, \
    ENABLE_SEARCH_FROM_LDAP_DIRECTLY

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False

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
                    # search from org
                    email_list += search_user_from_org(request, q)

                    # search from profile, limit search range in all org users
                    limited_emails = []
                    url_prefix = request.user.org.url_prefix
                    all_org_users = seaserv.get_org_users_by_url_prefix(url_prefix, -1, -1)
                    for user in all_org_users:
                        limited_emails.append(user.email)

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

        ## search finished
        # remove duplicate emails
        email_list = {}.fromkeys(email_list).keys()

        email_result = []
        # remove nonexistent or inactive user
        for email in email_list:
            try:
                user = User.objects.get(email=email)
                if user.is_active:
                    email_result.append(email)
            except User.DoesNotExist:
                continue

        # check if include myself in user result
        try:
            include_self = int(request.GET.get('include_self', 1))
        except ValueError:
            include_self = 1

        if include_self == 0 and username in email_result:
            # reomve myself
            email_result.remove(username)

        # format user result
        try:
            size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            size = 32

        formated_result = format_searched_user_result(
                request, email_result[:10], size)

        return HttpResponse(json.dumps({"users": formated_result}),
                status=200, content_type='application/json; charset=utf-8')

def format_searched_user_result(request, users, size):
    results = []

    for email in users:
        url, is_default, date_uploaded = api_avatar_url(email, size)
        results.append({
            "email": email,
            "avatar_url": request.build_absolute_uri(url),
            "name": email2nickname(email),
            "contact_email": Profile.objects.get_contact_email_by_user(email),
        })

    return results

def search_user_from_org(request, q):

    # get all org users
    url_prefix = request.user.org.url_prefix
    all_org_users = seaserv.get_org_users_by_url_prefix(url_prefix, -1, -1)

    # search user from org users
    email_list = []
    for org_user in all_org_users:
        if q in org_user.email:
            email_list.append(org_user.email)

    return email_list

def search_user_from_ccnet(q):
    users = []

    db_users = seaserv.ccnet_threaded_rpc.search_emailusers('DB', q, 0, 10)
    users.extend(db_users)

    count = len(users)
    if count < 10:
        ldap_imported_users = seaserv.ccnet_threaded_rpc.search_emailusers('LDAP', q, 0, 10 - count)
        users.extend(ldap_imported_users)

    count = len(users)
    if count < 10 and ENABLE_SEARCH_FROM_LDAP_DIRECTLY:
        all_ldap_users = seaserv.ccnet_threaded_rpc.search_ldapusers(q, 0, 10 - count)
        users.extend(all_ldap_users)

    # `users` is already search result, no need search more
    email_list = []
    for user in users:
        email_list.append(user.email)

    return email_list

def search_user_from_profile(q):
    # 'nickname__icontains' for search by nickname
    # 'contact_email__icontains' for search by contact email
    users = Profile.objects.filter(Q(nickname__icontains=q) | \
            Q(contact_email__icontains=q)).values('user')

    email_list = []
    for user in users:
        email_list.append(user['user'])

    return email_list

def search_user_from_profile_with_limits(q, limited_emails):
    # search within limited_emails
    users = Profile.objects.filter(Q(user__in=limited_emails) &
            (Q(nickname__icontains=q) | Q(contact_email__icontains=q))).values('user')

    email_list = []
    for user in users:
        email_list.append(user['user'])

    return email_list

def search_user_when_global_address_book_disabled(request, q):

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

    if is_valid_email(q):
        # if `q` is a valid email
        email_list.append(q)

        # get user whose `contact_email` is `q`
        users = Profile.objects.filter(contact_email=q).values('user')
        for user in users:
            email_list.append(user['user'])

    return email_list
