import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import gettext as _

from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.avatar.settings import GROUP_AVATAR_DEFAULT_SIZE
from seahub.avatar.templatetags.group_avatar_tags import get_default_group_avatar_url, api_grp_avatar_url
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.settings import CLOUD_MODE, MULTI_TENANCY
from seahub.utils import is_valid_username, is_pro_version
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.group.utils import is_group_member, is_group_admin, \
        validate_group_name, check_group_name_conflict, set_group_name_cache
from seahub.admin_log.signals import admin_operation
from seahub.admin_log.models import GROUP_CREATE, GROUP_DELETE, GROUP_TRANSFER
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsProVersion
from seahub.share.models import ExtraGroupsSharePermission
from seahub.utils.ccnet_db import CcnetDB


logger = logging.getLogger(__name__)


def get_group_info(group_id):
    group = ccnet_api.get_group(group_id)
    isoformat_timestr = timestamp_to_isoformat_timestr(group.timestamp)
    group_info = {
        "id": group.id,
        "name": group.group_name,
        "owner": group.creator_name,
        "owner_name": email2nickname(group.creator_name),
        "created_at": isoformat_timestr,
        "quota": seafile_api.get_group_quota(group_id) if is_pro_version() else 0,
        "parent_group_id": group.parent_group_id if is_pro_version() else 0
    }

    return group_info


class AdminGroups(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request):
        """ List all groups / search group by name

        Permission checking:
        1. Admin user;
        """

        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # search groups by name
        group_name = request.GET.get('name', '')
        group_name = group_name.strip()
        return_results = []
        if group_name:
            # search by name(keyword in name)
            groups_all = ccnet_api.search_groups(group_name, -1, -1)
            for group in groups_all:
                group_info = get_group_info(group.id)
                return_results.append(group_info)

            return Response({"name": group_name, "groups": return_results})

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

    def post(self, request):
        """ Create a group

        Permission checking:
        1. Admin user;
        """

        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        group_name = request.data.get('group_name', '')
        if not group_name:
            error_msg = 'group_name %s invalid.' % group_name
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        group_name = group_name.strip()
        # Check whether group name is validate.
        if not validate_group_name(group_name):
            error_msg = _('Name can only contain letters, numbers, spaces, hyphen, dot, single quote, brackets or underscore.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Check whether group name is duplicated.
        pattern_matched_groups = ccnet_api.search_groups(group_name, -1, -1)
        for group in pattern_matched_groups:
            if group.group_name == group_name:
                error_msg = _('There is already a group with that name.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        group_owner = request.data.get('group_owner', '')
        if group_owner:
            try:
                User.objects.get(email=group_owner)
            except User.DoesNotExist:
                error_msg = 'User %s not found.' % group_owner
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        new_owner = group_owner or username

        # create group.
        try:
            group_id = ccnet_api.create_group(group_name, new_owner)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # send admin operation log signal
        admin_op_detail = {
            "id": group_id,
            "name": group_name,
            "owner": new_owner,
        }
        admin_operation.send(sender=None, admin_name=username,
                             operation=GROUP_CREATE, detail=admin_op_detail)

        # get info of new group
        group_info = get_group_info(group_id)

        return Response(group_info, status=status.HTTP_201_CREATED)


class AdminGroup(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def put(self, request, group_id):
        """ Admin update a group

        1. transfer a group.
        2. set group quota.
        3. rename group.
        4. move a group to another group.

        Permission checking:
        1. Admin user;
        """

        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # recourse check
        group_id = int(group_id)  # Checked by URL Conf
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        new_owner = request.data.get('new_owner', '')
        if new_owner:
            if not is_valid_username(new_owner):
                error_msg = 'new_owner %s invalid.' % new_owner
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # check if new_owner exists,
            # NOT need to check old_owner for old_owner may has been deleted.
            try:
                User.objects.get(email=new_owner)
            except User.DoesNotExist:
                error_msg = 'User %s not found.' % new_owner
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            old_owner = group.creator_name
            if new_owner == old_owner:
                error_msg = _('User %s is already group owner.') % new_owner
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

            # send admin operation log signal
            admin_op_detail = {
                "id": group_id,
                "name": group.group_name,
                "from": old_owner,
                "to": new_owner,
            }
            admin_operation.send(sender=None, admin_name=request.user.username,
                                 operation=GROUP_TRANSFER, detail=admin_op_detail)

        # set group quota
        group_quota = request.data.get('quota', '')
        if group_quota:
            try:
                group_quota = int(group_quota)
            except ValueError:
                error_msg = 'quota invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if not (group_quota > 0 or group_quota == -2):
                error_msg = 'quota invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                seafile_api.set_group_quota(group_id, group_quota)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        new_name = request.data.get('name', '')
        if new_name:
            if not validate_group_name(new_name):

                error_msg = _('Name can only contain letters, numbers, spaces, hyphen, dot, single quote, brackets or underscore.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if check_group_name_conflict(request, new_name):
                error_msg = _('There is already a group with that name.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                ccnet_api.set_group_name(group_id, new_name)
                set_group_name_cache(group_id, new_name)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # move a group to another group
        target_group_id = request.data.get('target_group_id')
        if target_group_id:
            try:
                target_group_id = int(target_group_id)
            except ValueError:
                error_msg = 'target_group_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            
            if group.creator_name != 'system admin':
                error_msg = 'Group %s is not a department' % group_id
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            
            target_group = ccnet_api.get_group(target_group_id)
            if not target_group:
                error_msg = 'Target group %d not found.' % target_group_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
            
            if target_group.creator_name != 'system admin':
                error_msg = 'Group %s is not a department' % target_group_id
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if group.parent_group_id == target_group_id or group_id == target_group_id:
                return Response({'success': True})

            is_org = ccnet_api.is_org_group(group_id)
            if is_org:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            
            try:
                ccnet_db = CcnetDB()
                sub_groups = ccnet_db.get_all_sub_groups(group_id)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            
            if target_group_id in sub_groups:
                error_msg = 'Cannot move to its own sub department.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            
            try:
                ccnet_db.move_department(group_id, target_group_id)
                return Response({'success': True})
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            
        group_info = get_group_info(group_id)
        return Response(group_info)

    def delete(self, request, group_id):
        """ Dismiss a specific group
        """

        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            return Response({'success': True})

        group_owner = group.creator_name
        group_name = group.group_name

        try:
            org_id = ccnet_api.get_org_id_by_group(group_id)
            if org_id >= 0:
                ccnet_api.remove_org_group(org_id, group_id)
            else:
                ccnet_api.remove_group(group_id)
            seafile_api.remove_group_repos(group_id)
            ExtraGroupsSharePermission.objects.filter(group_id=group_id).delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # send admin operation log signal
        admin_op_detail = {
            "id": group_id,
            "name": group_name,
            "owner": group_owner,
        }
        admin_operation.send(sender=None, admin_name=request.user.username,
                             operation=GROUP_DELETE, detail=admin_op_detail)

        return Response({'success': True})


class AdminSearchGroup(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request):
        """ Search group by name

        Permission checking:
        1. Admin user;
        """

        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        query_str = request.GET.get('query', '').lower().strip()
        if not query_str:
            error_msg = 'query invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = []
        groups = ccnet_api.search_groups(query_str, 0, 25)
        for group in groups:
            group_info = get_group_info(group.id)
            result.append(group_info)

        return Response({"group_list": result})
    

class AdminDepartments(APIView):
    """
    List all departments
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            all_groups = ccnet_api.list_all_departments()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        result = []
        for group in all_groups:
            created_at = timestamp_to_isoformat_timestr(group.timestamp)
            department_info = {
                "id": group.id,
                "email": '%s@seafile_group' % str(group.id),
                "parent_group_id": group.parent_group_id,
                "name": group.group_name,
                "owner": group.creator_name,
                "created_at": created_at,
            }
            result.append(department_info)

        return Response(result)


class AdminGroupToDeptView(APIView):
    """group to department"""
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, group_id):
        """ Admin change a group

        group to department

        Permission checking:
        1. Admin user;
        """
        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # recourse check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if group.creator_name == 'system admin':
            error_msg = 'Group %s is already a department' % group_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # group to department
        try:
            ccnet_db = CcnetDB()
            ccnet_db.change_groups_into_departments(group_id)
            seafile_api.set_group_quota(group_id, -2)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        group_info = get_group_info(group_id)
        return Response(group_info)
