import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import ugettext as _

from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.avatar.templatetags.avatar_tags import api_avatar_url, \
        get_default_avatar_url
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils import is_org_context
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.group.utils import validate_group_name, check_group_name_conflict
from seahub.admin_log.signals import admin_operation
from seahub.admin_log.models import GROUP_DELETE
from seahub.api2.utils import to_python_boolean, api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.authentication import TokenAuthentication

logger = logging.getLogger(__name__)

def address_book_group_to_dict(group):
    if isinstance(group, int):
        group = ccnet_api.get_group(group)

    return {
        "id": group.id,
        "name": group.group_name,
        "owner": group.creator_name,
        "created_at": timestamp_to_isoformat_timestr(group.timestamp),
        "parent_group_id": group.parent_group_id,
        "quota": seafile_api.get_group_quota(group.id),
    }


class AdminAddressBookGroups(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    def get(self, request):
        """List top groups in address book."""
        return_results = []

        if is_org_context(request):
            # request called by org admin
            org_id = request.user.org.org_id
            groups = ccnet_api.get_org_top_groups(org_id)
        else:
            groups = ccnet_api.get_top_groups(including_org=False)
        for group in groups:
            return_results.append(address_book_group_to_dict(group))

        return Response({"data": return_results})

    def post(self, request):
        """Add a group in address book.

        parent_group: -1 - no parent group;
                      > 0 - have parent group.
        group_owner: default to system admin
        group_staff: default to system admin
        """
        group_name = request.data.get('group_name', '').strip()
        if not group_name:
            error_msg = 'name %s invalid.' % group_name
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Check whether group name is validate.
        if not validate_group_name(group_name):
            error_msg = _(u'Name can only contain letters, numbers, blank, hyphen or underscore.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Check whether group name is duplicated.
        if check_group_name_conflict(request, group_name):
            error_msg = _(u'The name already exists.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Group owner is 'system admin'
        group_owner = request.data.get('group_owner', '')

        try:
            parent_group = int(request.data.get('parent_group', -1))
        except ValueError:
            error_msg = 'parent_group invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if parent_group < 0 and parent_group != -1:
            error_msg = 'parent_group invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # TODO: check parent group exists

        try:
            if is_org_context(request):
                # request called by org admin
                org_id = request.user.org.org_id
                group_id = ccnet_api.create_org_group(
                    org_id, group_name, group_owner,
                    parent_group_id=parent_group)
            else:
                group_id = ccnet_api.create_group(group_name, group_owner,
                                                  parent_group_id=parent_group)
            seafile_api.set_group_quota(group_id, -2)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get info of new group
        group_info = address_book_group_to_dict(group_id)

        return Response(group_info, status=status.HTTP_200_OK)


class AdminAddressBookGroup(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    def _get_address_book_group_memeber_info(self, request, group_member_obj, avatar_size):

        email = group_member_obj.user_name
        try:
            avatar_url, is_default, date_uploaded = api_avatar_url(email, avatar_size)
        except Exception as e:
            logger.error(e)
            avatar_url = get_default_avatar_url()

        group_id = group_member_obj.group_id
        group = ccnet_api.get_group(group_member_obj.group_id)

        role = 'Member'
        is_admin = bool(group_member_obj.is_staff)
        if email == group.creator_name:
            role = 'Owner'
        elif is_admin:
            role = 'Admin'

        member_info = {
            'group_id': group_id,
            'group_name': group.group_name,
            'email': email,
            "name": email2nickname(email),
            "contact_email": email2contact_email(email),
            "avatar_url": request.build_absolute_uri(avatar_url),
            "is_admin": is_admin,
            "role": role,
        }

        return member_info

    def get(self, request, group_id):
        """List child groups and members in an address book group."""
        group_id = int(group_id)

        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size',
                                              AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        try:
            return_ancestors = to_python_boolean(request.GET.get(
                'return_ancestors', 'f'))
        except ValueError:
            return_ancestors = False

        ret_dict = address_book_group_to_dict(group)
        ret_groups = []
        ret_members = []

        groups = ccnet_api.get_child_groups(group_id)
        for group in groups:
            ret_groups.append(address_book_group_to_dict(group))

        try:
            members = ccnet_api.get_group_members(group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        for m in members:
            member_info = self._get_address_book_group_memeber_info(request,
                    m, avatar_size)
            ret_members.append(member_info)

        ret_dict['groups'] = ret_groups
        ret_dict['members'] = ret_members

        if return_ancestors:
            # get ancestor groups and remove last group which is self
            ancestor_groups = ccnet_api.get_ancestor_groups(group_id)[:-1]
            ret_dict['ancestor_groups'] = [address_book_group_to_dict(grp)
                                           for grp in ancestor_groups]
        else:
            ret_dict['ancestor_groups'] = []

        return Response(ret_dict)

    def delete(self, request, group_id):
        """ Delete an address book group.
        """
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            return Response({'success': True})

        try:
            has_repo = seafile_api.if_group_has_group_owned_repo(group_id)
            child_groups = ccnet_api.get_child_groups(group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if has_repo:
            error_msg = _(u'There are libraries in this department.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if len(child_groups) > 0:
            error_msg = _(u'There are sub-departments in this department.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            ret_code = ccnet_api.remove_group(group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if ret_code == -1:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # send admin operation log signal
        group_owner = group.creator_name
        group_name = group.group_name
        admin_op_detail = {
            "id": group_id,
            "name": group_name,
            "owner": group_owner,
        }
        admin_operation.send(sender=None, admin_name=request.user.username,
                operation=GROUP_DELETE, detail=admin_op_detail)

        return Response({'success': True})
