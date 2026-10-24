# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from django.utils.translation import gettext as _

from seaserv import ccnet_api

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error, to_python_boolean
from seahub.base.accounts import User
from seahub.options.models import UserOptions
from seahub.two_factor.models import devices_for_user
from seahub.utils.two_factor_auth import has_two_factor_auth

from seahub.organizations.views import org_user_exists

logger = logging.getLogger(__name__)


class OrgAdminUserTwoFactorAuth(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def _get_org_user(self, org_id, email):
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            return None, api_error(status.HTTP_404_NOT_FOUND,
                                   f'Organization {org_id} not found.')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None, api_error(status.HTTP_404_NOT_FOUND,
                                   f'User {email} not found.')

        if not org_user_exists(org_id, email):
            return None, api_error(status.HTTP_404_NOT_FOUND,
                                   _('User %s not found in organization.') % email)

        return user, None

    def put(self, request, org_id, email):
        """Set/unset force 2FA for an organization member.
        """
        if not has_two_factor_auth():
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Two factor auth is not enabled')

        user, err = self._get_org_user(org_id, email)
        if err:
            return err

        force_2fa = request.data.get('force_2fa', None)
        try:
            force_2fa = to_python_boolean(force_2fa)
        except (AttributeError, ValueError):
            return api_error(status.HTTP_400_BAD_REQUEST, 'force_2fa invalid.')

        if force_2fa:
            UserOptions.objects.set_force_2fa(email)
        else:
            UserOptions.objects.unset_force_2fa(email)

        return Response({'success': True})

    def delete(self, request, org_id, email):
        """Remove all two-factor devices of an organization member.
        """
        if not has_two_factor_auth():
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Two factor auth is not enabled')

        user, err = self._get_org_user(org_id, email)
        if err:
            return err

        try:
            devices = devices_for_user(user)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                             'Internal Server Error')

        for device in devices:
            device.delete()

        return Response({'success': True})
