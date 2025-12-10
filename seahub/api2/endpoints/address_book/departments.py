import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email

from seahub.utils import is_org_context
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

logger = logging.getLogger(__name__)


def get_address_book_group_member_info(group_member_obj, avatar_size=80):
    email = group_member_obj.user_name
    avatar_url, is_default, date_uploaded = api_avatar_url(email, avatar_size)
    is_admin = bool(group_member_obj.is_staff)
    role = 'Admin' if is_admin else 'Member'
    member_info = {
        'email': email,
        "name": email2nickname(email),
        "contact_email": email2contact_email(email),
        "avatar_url": avatar_url,
        "is_admin": is_admin,
        "role": role,
    }

    return member_info


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


class AddressBookDepartments(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        """ List sub groups of a group in address book.
        """
        if is_org_context(request):
            org_id = request.user.org.org_id
            groups = ccnet_api.get_org_top_groups(org_id)
        else:
            groups = ccnet_api.get_top_groups(including_org=False)

        all_groups = []
        try:
            for g in groups:
                all_groups.extend(ccnet_api.get_descendants_groups(g.id))

            return_results = []
            for group in all_groups:
                return_results.append(address_book_group_to_dict(group))
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({
            'departments': return_results
        })


class AddressBookDepartmentMembers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAuthenticated,)

    def _check_department_permission(self, org_id, department_id):
        '''
        check if the department belongs to the org
        '''
        return org_id == ccnet_api.get_org_id_by_group(department_id)

    def get(self, request, department_id):
        """ List members of a group in address book.
        """

        try:
            department_id = int(department_id)
        except Exception:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Department id invalid')

        org_id = request.user.org.org_id if request.user.org else None
        if org_id and not self._check_department_permission(org_id, department_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            return_results = []
            members = ccnet_api.get_group_members(department_id)
            for m in members:
                member_info = get_address_book_group_member_info(m)
                if m.user_name == '':
                    continue
                return_results.append(member_info)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({
            'members': return_results
        })
