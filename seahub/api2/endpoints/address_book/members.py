import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import ccnet_api

from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.group.utils import is_group_admin
from seahub.base.accounts import User
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import api_check_group
from seahub.api2.endpoints.search_user import search_user_from_ccnet, \
        search_user_from_profile, format_searched_user_result

logger = logging.getLogger(__name__)

class AddressBookGroupsSearchMember(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAuthenticated, IsProVersion)

    @api_check_group
    def get(self, request, group_id):
        """ List members of a group (and in its sub groups) in address book.
        """

        try:
            avatar_size = int(request.GET.get('avatar_size',
                AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        # argument check
        q = request.GET.get('q', None)
        if not q:
            return api_error(status.HTTP_400_BAD_REQUEST, 'q invalid.')

        # permission check
        if not is_group_admin(group_id, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # search user from the whole Seafile system
        email_list = []
        email_list += search_user_from_ccnet(q)
        email_list += search_user_from_profile(q)
        # remove duplicate emails
        email_list = {}.fromkeys(email_list).keys()

        try:
            # get all members in current group and its sub groups
            all_members = ccnet_api.get_members_with_prefix(group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        group_email_list = [m.user_name for m in all_members]
        # remove duplicate emails
        group_email_list = {}.fromkeys(group_email_list).keys()

        email_result = []
        for email in group_email_list:

            # if email searched from the whole Seafile system
            # is NOT group member, filter it out.
            if email not in email_list:
                continue

            try:
                # remove nonexistent or inactive user
                user = User.objects.get(email=email)
                if not user.is_active:
                    continue
            except User.DoesNotExist:
                continue

            email_result.append(email)

        # format the email results
        result = format_searched_user_result(request, email_result, avatar_size)

        return Response(result)
