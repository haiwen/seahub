# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import ccnet_api, seafile_api

from seaserv import seafserv_threaded_rpc

from seahub.utils.file_size import get_file_size_unit
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.permissions import IsProVersion

try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED= False

if ORG_MEMBER_QUOTA_ENABLED:
    from seahub_extra.organizations.models import OrgMemberQuota

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False

try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

logger = logging.getLogger(__name__)

def get_org_info(org_id):

    org_info = {}

    org = ccnet_api.get_org_by_id(org_id)

    org_info['org_id'] = org_id
    org_info['org_name'] = org.org_name
    org_info['ctime'] = timestamp_to_isoformat_timestr(org.ctime)
    org_info['org_url_prefix'] = org.url_prefix

    creator = org.creator
    org_info['creator_email'] = creator
    org_info['creator_name'] = email2nickname(creator)
    org_info['creator_contact_email'] = email2contact_email(creator)

    org_info['quota'] = seafile_api.get_org_quota(org_id)

    if ORG_MEMBER_QUOTA_ENABLED:
        org_info['max_user_number'] = OrgMemberQuota.objects.get_quota(org_id)

    return org_info


class AdminOrganization(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, org_id):
        """ Get base info of a organization

        Permission checking:
        1. only admin can perform this action.
        """

        if not (CLOUD_MODE and MULTI_TENANCY):
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            org_info = get_org_info(org_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(org_info)

    def put(self, request, org_id):
        """ Update base info of a organization

        Permission checking:
        1. only admin can perform this action.
        """

        if not (CLOUD_MODE and MULTI_TENANCY):
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # update org name
        new_name = request.data.get('org_name', None)
        if new_name:
            try:
                ccnet_api.set_org_name(org_id, new_name)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # update org max user number
        max_user_number = request.data.get('max_user_number', None)
        if max_user_number and ORG_MEMBER_QUOTA_ENABLED:

            try:
                max_user_number = int(max_user_number)
            except ValueError:
                error_msg = 'max_user_number invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if max_user_number <= 0:
                error_msg = 'max_user_number invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                OrgMemberQuota.objects.set_quota(org_id, max_user_number)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        quota_mb = request.data.get('quota', None)
        if quota_mb:

            try:
                quota_mb = int(quota_mb)
            except ValueError:
                error_msg = 'quota invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if quota_mb < 0:
                error_msg = 'quota invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)


            quota = quota_mb * get_file_size_unit('MB')
            try:
                seafile_api.set_org_quota(org_id, quota)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        org_info = get_org_info(org_id)
        return Response(org_info)

    def delete(self, request, org_id):
        """ Delete an organization

        Permission checking:
        1. only admin can perform this action.
        """

        if not (CLOUD_MODE and MULTI_TENANCY):
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            # remove org users
            users = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
            for u in users:
                ccnet_api.remove_org_user(org_id, u.email)

            # remove org groups
            groups = ccnet_api.get_org_groups(org_id, -1, -1)
            for g in groups:
                ccnet_api.remove_org_group(org_id, g.gid)

            # remove org repos
            seafile_api.remove_org_repo_by_org_id(org_id)

            # remove org
            ccnet_api.remove_org(org_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
