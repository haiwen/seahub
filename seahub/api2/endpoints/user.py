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
        info['telephone'] = d_profile.telephone if d_profile else ''
        info['login_id'] = profile.login_id if profile else ''
        info['list_in_address_book'] = profile.list_in_address_book if profile else False

        return info

    def _update_user_info(self, info_dict, email):

        # update nickname
        if info_dict['name']:
            Profile.objects.add_or_update(email, nickname=info_dict['name'])

        # update account contact email
        if info_dict['contact_email']:
            Profile.objects.add_or_update(email, contact_email=info_dict['contact_email'])

        # update account telephone
        if info_dict['telephone']:
            DetailedProfile.objects.add_or_update(email, department=None , telephone=info_dict['telephone'])

        # update user list_in_address_book
        if info_dict['list_in_address_book']:
            Profile.objects.add_or_update(email, list_in_address_book=info_dict['list_in_address_book'])

    def get(self, request):
        email = request.user.username
        info = self._get_user_info(email)
        return Response(info)

    def put(self, request):

        email = request.user.username

        if not ENABLE_UPDATE_USER_INFO:
            error_msg = _('Feature disabled.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check for name
        name = request.data.get("name", None)
        if name:
            name = name.strip()
            if len(name) > 64:
                error_msg = _('Name is too long (maximum is 64 characters)')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if "/" in name:
                error_msg = _("Name should not include '/'.")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # argument check for contact_email
        contact_email = request.data.get("contact_email", None)
        if contact_email:
            
            if not ENABLE_USER_SET_CONTACT_EMAIL:
                error_msg = _('Feature disabled.')
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            profile = Profile.objects.get_profile_by_contact_email(contact_email)
            if profile and profile.user != email:
                # if contact email is used by others, return 403
                error_msg = _('Contact email %s already exists.' % contact_email)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # update contact email
            contact_email = contact_email.strip()
            if not is_valid_email(contact_email):
                error_msg = 'contact_email invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # agrument check for telephone
        telephone = request.data.get('telephone', None)
        if telephone:
            telephone = telephone.strip()
            if len(telephone) > 100:
                error_msg = _('telephone is too long (maximum is 100 characters).')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # argument check for list_in_address_book
        list_in_address_book = request.data.get("list_in_address_book", None)
        if list_in_address_book is not None:
            if list_in_address_book.lower() not in ('true', 'false'):
                error_msg = 'list_in_address_book invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        info_dict = {
            'name': name,
            'contact_email': contact_email,
            'telephone': telephone,
            'list_in_address_book': list_in_address_book,
        }

        # update user profile and user additionnal info
        try:
            self._update_user_info(info_dict, email)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get user info and return
        info = self._get_user_info(email)
        return Response(info)
