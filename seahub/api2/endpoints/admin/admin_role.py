# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status


from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.utils import api_error

from seahub.base.accounts import User
from seahub.role_permissions.utils import get_available_admin_roles
from seahub.role_permissions.models import AdminRole
from seahub.constants import DEFAULT_ADMIN

logger = logging.getLogger(__name__)

class AdminAdminRole(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get role info of an admin user.

        Permission checking:
        1. only admin can perform this action.
        2. email(from argument): must be an admin user.
        """

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        email = request.GET.get('email', None)
        if not email:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        ## 2. email(from argument): must be a admin user.
        if not user.is_staff:
            error_msg = "%s must be an administrator." % email
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get role info
        result = {}
        result['email'] = email

        try:
            admin_role = AdminRole.objects.get_admin_role(email)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result['role'] = admin_role.role

        return Response(result)

    def post(self, request):
        """ Add role for an admin user.

        Argument checking:
        1. role: must be in get_available_admin_roles.

        Permission checking:
        1. email(from argument): must be an admin user.
        2. only admin with `default_admin` role can perform this action.
        """

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        email = request.data.get('email', None)
        if not email:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        role = request.data.get('role', None)
        if not role:
            error_msg = 'role invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        role = role.lower()
        available_roles = get_available_admin_roles()
        if role not in available_roles:
            error_msg = 'role must be in %s.' % str(available_roles)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        ## 1. email(from argument): must be a admin user.
        if not user.is_staff:
            error_msg = "%s must be an administrator." % email
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        ## 2. only admin with `default_admin` role can perform this action.
        if request.user.admin_role != DEFAULT_ADMIN:
            error_msg = "%s's role must be '%s'." % (request.user.username,
                    DEFAULT_ADMIN)
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # add role
        try:
            AdminRole.objects.add_admin_role(email, role)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {}
        result['email'] = email

        try:
            admin_role = AdminRole.objects.get_admin_role(email)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result['role'] = admin_role.role

        return Response(result)

    def put(self, request):
        """ Update role for an admin user.

        Argument checking:
        1. role: must be in get_available_admin_roles.

        Permission checking:
        1. email(from argument): must be an admin user.
        2. only admin with `default_admin` role can perform this action.
        """

        if not request.user.admin_permissions.can_manage_user():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        email = request.data.get('email', None)
        if not email:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        role = request.data.get('role', None)
        if not role:
            error_msg = 'role invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        role = role.lower()
        available_roles = get_available_admin_roles()
        if role not in available_roles:
            error_msg = 'role must be in %s.' % str(available_roles)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        ## 1. email(from argument): must be an admin user.
        if not user.is_staff:
            error_msg = "%s must be an administrator." % email
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        ## 2. only admin with `default_admin` role can perform this action.
        if request.user.admin_role != DEFAULT_ADMIN:
            error_msg = "%s's role must be '%s'." % (request.user.username,
                    DEFAULT_ADMIN)
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # update role
        try:
            AdminRole.objects.update_admin_role(email, role)
        except AdminRole.DoesNotExist:
            AdminRole.objects.add_admin_role(email, role)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {}
        result['email'] = email

        try:
            admin_role = AdminRole.objects.get_admin_role(email)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result['role'] = admin_role.role

        return Response(result)
