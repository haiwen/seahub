# -*- coding: utf-8 -*-

import logging
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

import seaserv
from seaserv import ccnet_api

from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.avatar.templatetags.group_avatar_tags import api_grp_avatar_url, get_default_group_avatar_url
from seahub.utils import is_pro_version
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.group.utils import is_group_member, is_group_admin
from seahub.avatar.settings import GROUP_AVATAR_DEFAULT_SIZE

logger = logging.getLogger(__name__)


class Departments(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """list all departments
        """

        if not is_pro_version():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            departments = ccnet_api.list_all_departments()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size', GROUP_AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = GROUP_AVATAR_DEFAULT_SIZE

        can_admin = request.GET.get('can_admin', 'false')

        try:
            can_admin = to_python_boolean(can_admin)
        except:
            return api_error(status.HTTP_400_BAD_REQUEST, 'can_admin invalid')

        result = []
        for department in departments:
            department = seaserv.get_group(department.id)

            username = request.user.username
            if can_admin:
                if not is_group_admin(department.id, username):
                    continue
            else:
                if not is_group_member(department.id, username):
                    continue

            created_at = timestamp_to_isoformat_timestr(department.timestamp)

            department_info = {
                "id": department.id,
                "email": '%s@seafile_group' % str(department.id),
                "parent_group_id": department.parent_group_id,
                "name": department.group_name,
                "owner": department.creator_name,
                "created_at": created_at,
            }

            result.append(department_info)

        return Response(result)
