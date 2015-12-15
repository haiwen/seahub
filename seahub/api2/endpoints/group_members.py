import logging

from django.utils.translation import ugettext as _

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

import seaserv
from pysearpc import SearpcError

from seahub.profile.models import Profile
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.avatar.templatetags.avatar_tags import api_avatar_url, \
    get_default_avatar_url
from seahub.utils import is_valid_username
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.base.accounts import User

from .utils import api_check_group_member, api_check_group_staff

logger = logging.getLogger(__name__)

def get_group_member_info(request, group_id, email, avatar_size=AVATAR_DEFAULT_SIZE):
    p = Profile.objects.get_profile_by_user(email)
    if p:
        login_id = p.login_id if p.login_id != '' else ''
    else:
        login_id = ''

    try:
        avatar_url, is_default, date_uploaded = api_avatar_url(email, avatar_size)
    except Exception as e:
        logger.error(e)
        avatar_url = get_default_avatar_url()

    is_admin = seaserv.check_group_staff(group_id, email)
    member_info = {
        "name": email2nickname(email),
        'email': email,
        "contact_email": Profile.objects.get_contact_email_by_user(email),
        "login_id": login_id,
        "avatar_url": request.build_absolute_uri(avatar_url),
        "is_admin": is_admin,
    }

    return member_info


class GroupMembers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_check_group_member
    def get(self, request, group_id, format=None):
        """
        Get all group members.
        """

        try:
            avatar_size = int(request.GET.get('avatar_size',
                AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        try:
            members = seaserv.get_group_members(group_id)
        except SearpcError as e:
            logger.error(e)
            error_msg = _(u'Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            only_admin = int(request.GET.get('only_admin', 0))
        except ValueError:
            only_admin = 0

        if only_admin not in (0, 1):
            error_msg = _(u'Argument is not valid')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        group_members = []
        for m in members:
            # only return group admins
            if only_admin and not m.is_staff:
                continue

            member_info = get_group_member_info(request, group_id, m.user_name, avatar_size)
            group_members.append(member_info)

        return Response(group_members)

    @api_check_group_staff
    def post(self, request, group_id):
        """
        Add a group member.
        """
        username = request.user.username

        email = request.data.get('email', None)

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = _(u'Invalid username')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            seaserv.group_add_member(group_id, username, email)
        except SearpcError as e:
            logger.error(e)
            error_msg = _(u'Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        member_info = get_group_member_info(request, group_id, email, AVATAR_DEFAULT_SIZE)

        return Response(member_info, status=status.HTTP_201_CREATED)
