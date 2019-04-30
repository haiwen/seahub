# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.translation import ugettext as _

from seahub.utils import is_valid_email
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.profile.models import Profile, DetailedProfile
from seahub.settings import ENABLE_UPDATE_USER_INFO, ENABLE_USER_SET_CONTACT_EMAIL

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

class User(APIView):
    """ Query/update user info of myself.
    """

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def _get_user_info(self, email):
        profile = Profile.objects.get_profile_by_user(email)
        d_profile = DetailedProfile.objects.get_detailed_profile_by_user(email)

        info = {}
        info['email'] = email
        info['name'] = email2nickname(email)
        info['contact_email'] = email2contact_email(email)
        info['telephone'] = ''
        if d_profile is not None:
            info['telephone'] = d_profile.telephone
        info['login_id'] = ''
        if profile is not None:
            info['login_id'] = profile.login_id
        info['list_in_address_book'] = profile.list_in_address_book if profile else False

        return info

    def _update_user_info(self, request , email):

        # update nickname
        nickname = request.data.get("name", None)
        if nickname is not None:
            Profile.objects.add_or_update(email, nickname=nickname)

        # update account login_id
        login_id = request.data.get("login_id", None)
        if login_id is not None:
            Profile.objects.add_or_update(email, login_id=login_id)

        # update account contact email
        contact_email = request.data.get('contact_email', None)
        if contact_email is not None:
            Profile.objects.add_or_update(email, contact_email=contact_email)
            # key = normalize_cache_key(email, CONTACT_CACHE_PREFIX)
            # cache.set(key, contact_email, CONTACT_CACHE_TIMEOUT)

        # update account telephone
        telephone = request.data.get('telephone', None)
        if telephone is not None:
            DetailedProfile.objects.update_telephone(email, telephone=telephone)

    def _update_user_additional_info(self, request, email):

        # update user list_in_address_book
        list_in_address_book = request.data.get("list_in_address_book", None)
        if list_in_address_book is not None:
            profile = Profile.objects.get_profile_by_user(email)
            if profile is None:
                profile = Profile(user=email)

            profile.list_in_address_book = list_in_address_book.lower() == 'true'
            profile.save()

    def get(self, request):
        email = request.user.username
        info = self._get_user_info(email)
        return Response(info)

    def put(self, request):

        email = request.user.username

        # basic permission check
        if not ENABLE_UPDATE_USER_INFO:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check for name
        name = request.data.get("name", None)
        if name:
            if len(name) > 64:
                error_msg = 'Name is too long (maximum is 64 characters).'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if "/" in name:
                error_msg = "Name should not include '/'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # argument check for login_id
        login_id = request.data.get("login_id", None)
        if login_id is not None:
            login_id = login_id.strip()
            if len(login_id) > 225:
                error_msg = 'login id is too long (maximum is 225 characters).'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)


            username_by_login_id = Profile.objects.get_username_by_login_id(login_id)
            if username_by_login_id is not None:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 _(u"Login id %s already exists." % login_id))

        # argument check for contact_email
        contact_email = request.data.get("contact_email", None)
        if contact_email is not None and contact_email.strip() != '':
            if not is_valid_email(contact_email):
                error_msg = 'Contact email invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            profile = Profile.objects.get_profile_by_contact_email(contact_email)
            if profile: #and profile.user != email:
                error_msg = 'Contact email %s already exists.' % contact_email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # agrument check for telephone
        telephone = request.data.get('telephone', None)
        if telephone is not None:
            telephone = telephone.strip()
            if len(telephone) > 100:
                error_msg = 'Telephone is too long (maximum is 100 characters).'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # argument check for list_in_address_book
        list_in_address_book = request.data.get("list_in_address_book", None)
        if list_in_address_book is not None:
            if list_in_address_book.lower() not in ('true', 'false'):
                error_msg = 'list_in_address_book invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check for contact_email
        old_contact_email = Profile.objects.get_contact_email_by_user(email)
        if not (old_contact_email or ENABLE_USER_SET_CONTACT_EMAIL):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # update user profile and user additionnal info
        try:
            self._update_user_info(request, email)
            self._update_user_additional_info(request, email)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get user info and return
        info = self._get_user_info(email)
        return Response(info)
