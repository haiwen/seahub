# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.profile.models import Profile

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

        info = {}
        info['email'] = email
        info['name'] = email2nickname(email)
        info['contact_email'] = email2contact_email(email)
        info['list_in_address_book'] = profile.list_in_address_book if profile else False

        return info

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

        # argument check for list_in_address_book
        list_in_address_book = request.data.get("list_in_address_book", None)
        if list_in_address_book is not None:
            if list_in_address_book.lower() not in ('true', 'false'):
                error_msg = 'list_in_address_book invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            # update user additional info
            self._update_user_additional_info(request, email)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get user info and return
        info = self._get_user_info(email)
        return Response(info)
