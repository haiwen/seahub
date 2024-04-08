# Copyright (c) 2012-2016 Seafile Ltd.
import json
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import gettext as _

from seaserv import seafile_api

from seahub.options.models import UserOptions
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.accounts import User
from seahub.views import get_system_default_repo_id

logger = logging.getLogger(__name__)


class AdminDefaultLibrary(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def create_default_repo(self, username):

        default_repo_id = seafile_api.create_repo(name=_("My Library"),
                                                  desc=_("My Library"),
                                                  username=username)

        sys_repo_id = get_system_default_repo_id()
        if not sys_repo_id or not seafile_api.get_repo(sys_repo_id):
            return None

        dirents = seafile_api.list_dir_by_path(sys_repo_id, '/')
        for dirent in dirents:
            obj_name = dirent.obj_name
            seafile_api.copy_file(sys_repo_id, '/',
                                  json.dumps([obj_name]),
                                  default_repo_id, '/',
                                  json.dumps([obj_name]),
                                  username, 0)

        UserOptions.objects.set_default_repo(username, default_repo_id)

        return default_repo_id

    def get(self, request):
        """ Get info of common user's default library.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_library():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        user_email = request.GET.get('user_email', None)
        if not user_email:
            error_msg = 'user_email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            User.objects.get(email=user_email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % user_email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # get default library info
        try:
            default_repo_id = UserOptions.objects.get_default_repo(user_email)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        default_repo_info = {}
        default_repo_info['user_email'] = user_email
        if default_repo_id and seafile_api.get_repo(default_repo_id) is not None:
            default_repo_info['exists'] = True
            default_repo_info['repo_id'] = default_repo_id
        else:
            default_repo_info['exists'] = False

        return Response(default_repo_info)

    def post(self, request):
        """ Create a default library for a common user.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_library():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        user_email = request.POST.get('user_email', None)
        if not user_email:
            error_msg = 'user_email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            common_user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % user_email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not common_user.permissions.can_add_repo():
            error_msg = 'Permission denied, %s can not create library.' % user_email
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # create default library for common use
        try:
            default_repo_id = UserOptions.objects.get_default_repo(user_email)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        default_repo_info = {}
        default_repo_info['user_email'] = user_email
        default_repo_info['exists'] = True

        try:
            if default_repo_id and seafile_api.get_repo(default_repo_id) is not None:
                default_repo_info['repo_id'] = default_repo_id
            else:
                new_default_repo_id = self.create_default_repo(user_email)
                default_repo_info['repo_id'] = new_default_repo_id
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(default_repo_info)
