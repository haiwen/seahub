# Copyright (c) 2012-2019 Seafile Ltd.

import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.conf import settings
from seaserv import ccnet_api, seafile_api

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.organizations.models import OrgAdminSettings, FORCE_ADFS_LOGIN

logger = logging.getLogger(__name__)


class OrgAdminWebSettings(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):

        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        config_dict = {}
        file_ext_white_list = seafile_api.org_get_file_ext_white_list(org_id)
        if not file_ext_white_list:
            config_dict['file_ext_white_list'] = ''
        else:
            config_dict['file_ext_white_list'] = file_ext_white_list

        return Response(config_dict)

    def put(self, request, org_id):

        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        config_dict = {}
        for key, value in request.data.items():
            if key == 'file_ext_white_list':
                if value != '':
                    seafile_api.org_set_file_ext_white_list(org_id, value)
                    file_ext_white_list = seafile_api.org_get_file_ext_white_list(org_id)
                    config_dict['file_ext_white_list'] = file_ext_white_list
                else:
                    seafile_api.org_del_file_ext_white_list(org_id)
                    config_dict['file_ext_white_list'] = ''

            if key == FORCE_ADFS_LOGIN:
                try:
                    OrgAdminSettings.objects.update_or_create(org_id=org_id, key=FORCE_ADFS_LOGIN,
                                                              defaults={'value': value})
                    config_dict[FORCE_ADFS_LOGIN] = value
                except Exception as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        return Response(config_dict)
