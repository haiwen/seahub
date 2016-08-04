import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import ugettext as _

from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.base.accounts import User
from seahub.utils import is_valid_username
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.group.utils import is_group_member, is_group_admin

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

logger = logging.getLogger(__name__)

def get_group_info(group_id):
    group = ccnet_api.get_group(group_id)
    isoformat_timestr = timestamp_to_isoformat_timestr(group.timestamp)
    group_info = {
        "id": group.id,
        "name": group.group_name,
        "owner": group.creator_name,
        "created_at": isoformat_timestr,
    }

    return group_info

class AdminGroups(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request):
        """ List all groups

        Permission checking:
        1. Admin user;
        """

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = (current_page - 1) * per_page
        limit = per_page + 1

        groups = ccnet_api.get_all_groups(start, limit)

        if len(groups) > per_page:
            groups = groups[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        return_results = []

        for group in groups:
            if hasattr(ccnet_api, 'is_org_group') and \
                    ccnet_api.is_org_group(group.id):
                continue

            group_info = get_group_info(group.id)
            return_results.append(group_info)

        page_info = {
            'has_next_page': has_next_page,
            'current_page': current_page
        }

        return Response({"page_info": page_info, "groups": return_results})


class AdminGroup(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def put(self, request, group_id):
        """ Admin transfer a group

        Permission checking:
        1. Admin user;
        """

        # argument check
        new_owner = request.data.get('new_owner', None)
        if not new_owner or not is_valid_username(new_owner):
            error_msg = 'new_owner %s invalid.' % new_owner
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # recourse check
        group_id = int(group_id) # Checked by URL Conf
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check if new_owner exists,
        # NOT need to check old_owner for old_owner may has been deleted.
        try:
            User.objects.get(email=new_owner)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % new_owner
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        old_owner = group.creator_name
        if new_owner == old_owner:
            error_msg = _(u'User %s is already group owner.') % new_owner
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # transfer a group
        try:
            if not is_group_member(group_id, new_owner):
                ccnet_api.group_add_member(group_id, old_owner, new_owner)

            if not is_group_admin(group_id, new_owner):
                ccnet_api.group_set_admin(group_id, new_owner)

            ccnet_api.set_group_creator(group_id, new_owner)
            ccnet_api.group_unset_admin(group_id, old_owner)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        group_info = get_group_info(group_id)

        return Response(group_info)

    def delete(self, request, group_id):
        """ Dismiss a specific group
        """

        try:
            group_id = int(group_id)
            ccnet_api.remove_group(group_id)
            seafile_api.remove_group_repos(group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
