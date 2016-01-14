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

from seahub.utils import is_org_context
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile
from seahub.contacts.models import Contact
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.settings import ENABLE_GLOBAL_ADDRESSBOOK, ENABLE_SEARCH_FROM_LDAP_DIRECTLY


class SearchUser(APIView):
    """ Search user from contacts/all users
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def _can_use_global_address_book(self, request):

        return request.user.permissions.can_use_global_address_book()

    def get(self, request, format=None):


        if not self._can_use_global_address_book(request):
            return api_error(status.HTTP_403_FORBIDDEN,
                             'Guest user can not use global address book.')

        q = request.GET.get('q', None)

        if not q:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Argument missing.')

        users_from_ccnet = []
        users_from_profile = []
        users_result = []
        username = request.user.username

        if request.cloud_mode:
            if is_org_context(request):
                url_prefix = request.user.org.url_prefix
                users = seaserv.get_org_users_by_url_prefix(url_prefix, -1, -1)

                # search user from ccnet
                users_from_ccnet = filter(lambda u: q in u.email, users)

                # when search profile, only search users in org
                # 'nickname__contains' for search by nickname
                # 'contact_email__contains' for search by contact email
                users_from_profile = Profile.objects.filter(Q(user__in=[u.email for u in users]) & \
                                                          (Q(nickname__contains=q)) | \
                                                           Q(contact_email__contains=q)).values('user')
            elif ENABLE_GLOBAL_ADDRESSBOOK:
                users_from_ccnet = search_user_from_ccnet(q)
                users_from_profile = Profile.objects.filter(Q(contact_email__contains=q) | \
                        Q(nickname__contains=q)).values('user')
            else:
                # TODO delete this ?
                users = []
                contacts = Contact.objects.get_contacts_by_user(username)
                for c in contacts:
                    try:
                        user = User.objects.get(email = c.contact_email)
                        c.is_active = user.is_active
                    except User.DoesNotExist:
                        continue

                    c.email = c.contact_email
                    users.append(c)

                users_from_ccnet = filter(lambda u: q in u.email, users)
                # 'user__in' for only get profile of contacts
                # 'nickname__contains' for search by nickname
                # 'contact_email__contains' for search by contact
                users_from_profile = Profile.objects.filter(Q(user__in=[u.email for u in users]) & \
                                                          (Q(nickname__contains=q)) | \
                                                           Q(contact_email__contains=q)).values('user')
        else:
            users_from_ccnet = search_user_from_ccnet(q)
            users_from_profile = Profile.objects.filter(Q(contact_email__contains=q) | \
                    Q(nickname__contains=q)).values('user')

        # remove inactive users and add to result
        for u in users_from_ccnet[:10]:
            if u.is_active:
                users_result.append(u.email)

        for p in users_from_profile[:10]:
            try:
                user = User.objects.get(email = p['user'])
            except User.DoesNotExist:
                continue

            if not user.is_active:
                continue

            users_result.append(p['user'])

        # remove duplicate emails
        users_result = {}.fromkeys(users_result).keys()

        try:
            include_self = int(request.GET.get('include_self', 1))
        except ValueError:
            include_self = 1

        if include_self == 0 and username in users_result:
            # reomve myself
            users_result.remove(username)

        try:
            size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            size = 32

        formated_result = format_searched_user_result(request, users_result, size)[:10]
        return HttpResponse(json.dumps({"users": formated_result}), status=200,
                            content_type='application/json; charset=utf-8')

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

    return users
