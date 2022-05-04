# Copyright (c) 2012-2016 Seafile Ltd.

import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from seaserv import ccnet_api

from seahub.api2.permissions import IsProVersion
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

from seahub.api2.utils import api_error
from seahub.api2.endpoints.utils import is_org_user

from seahub.utils import is_valid_email
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile

logger = logging.getLogger(__name__)

def get_user_info(email):

    profile = Profile.objects.get_profile_by_user(email)

    info = {}
    info['email'] = email
    info['name'] = email2nickname(email)
    info['contact_email'] = profile.contact_email if profile and profile.contact_email else ''

    return info


class OrgAdminUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion,)

    def put(self, request, org_id, email):
        """ update name of an org user.

        Permission checking:
        1. only admin can perform this action.
        """

        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not request.user.org.is_staff:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if request.user.org.org_id != org_id:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not is_org_user(email, org_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # update user's name
        name = request.data.get("name", None)
        if name is not None:

            name = name.strip()
            if len(name) > 64:
                error_msg = 'Name is too long (maximum is 64 characters).'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if "/" in name:
                error_msg = "Name should not include '/'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                Profile.objects.add_or_update(email, nickname=name)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # update user's contact email
        contact_email = request.data.get("contact_email", None)
        if contact_email is not None:

            contact_email = contact_email.strip()
            if contact_email != '' and not is_valid_email(contact_email):
                error_msg = 'contact_email invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                Profile.objects.add_or_update(email, contact_email=contact_email)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        info = get_user_info(email)
        info['is_active'] = user.is_active

        return Response(info)
