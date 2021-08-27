# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from seaserv import ccnet_api

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.api2.endpoints.admin.groups import AdminGroup as SysAdminGroup
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

from pysearpc import SearpcError

from seahub.organizations.views import get_org_groups, get_org_id_by_group, remove_org_group


logger = logging.getLogger(__name__)


class OrgAdminGroups(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):
        """List organization group
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # Make sure page request is an int. If not, deliver first page.
        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            current_page = 1
            per_page = 25

        groups_plus_one = get_org_groups(org_id, per_page * (current_page - 1),
                                         per_page + 1)
        groups = groups_plus_one[:per_page]

        groups_list = []
        for i in groups:
            group = {}
            group['id'] = i.id
            group['group_name'] = i.group_name
            group['ctime'] = timestamp_to_isoformat_timestr(i.timestamp)
            group['creator_name'] = email2nickname(i.creator_name)
            group['creator_email'] = i.creator_name
            group['creator_contact_email'] = email2contact_email(i.creator_name)
            groups_list.append(group)


        if len(groups_plus_one) == per_page + 1:
            page_next = True
        else:
            page_next = False

        return Response({
                'groups': groups_list,
                'page': current_page,
                'per_page': per_page,
                'page_next': page_next,
                })


class OrgAdminGroup(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id, group_id):
        """get org group info
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        group_id = int(group_id)
        if get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # main
        group = ccnet_api.get_group(group_id)

        group_info = {
            "id": group.id,
            "group_name": group.group_name,
            "ctime": timestamp_to_isoformat_timestr(group.timestamp),
            "creator_email": group.creator_name,
            "creator_name": email2nickname(group.creator_name),
            'creator_contact_email': email2contact_email(group.creator_name),
        }

        return Response(group_info)

    def put(self, request, org_id, group_id):
        """ Admin update a group

        1. transfer a group.abs
        2. set group quota

        Permission checking:
        1. Admin user;
        """

        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        group_id = int(group_id)
        if get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return SysAdminGroup().put(request, group_id)


    def delete(self, request, org_id, group_id):
        """Remove an organization group
        """
        # resource check

        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission checking
        group_id = int(group_id)
        if get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            remove_org_group(org_id, group_id, request.user.username)
        except SearpcError as e:
            logger.error(e)

        return Response({'success': True})


class OrgAdminSearchGroup(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):
        """List organization group
        """
        # resource check
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if request.user.org.org_id != org.org_id:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        query = request.GET.get('query', '')
        if not query:
            error_msg = 'query invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org_groups = ccnet_api.search_org_groups(org_id, query, -1, -1)
        groups_list = []

        for i in org_groups:

            if query not in i.group_name:
                continue

            group = {}
            group['id'] = i.id
            group['group_name'] = i.group_name
            group['ctime'] = timestamp_to_isoformat_timestr(i.timestamp)
            group['creator_name'] = email2nickname(i.creator_name)
            group['creator_email'] = i.creator_name
            group['creator_contact_email'] = email2contact_email(i.creator_name)
            groups_list.append(group)

        return Response({'group_list': groups_list})
