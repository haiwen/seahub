import logging

from django.utils.dateformat import DateFormat
from django.utils.translation import ugettext as _
from django.template.defaultfilters import filesizeformat

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

import seaserv
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.avatar.settings import GROUP_AVATAR_DEFAULT_SIZE
from seahub.avatar.templatetags.group_avatar_tags import api_grp_avatar_url, \
        get_default_group_avatar_url
from seahub.utils import is_org_context
from seahub.utils.timeutils import dt, utc_to_local
from seahub.group.utils import validate_group_name, check_group_name_conflict
from seahub.base.templatetags.seahub_tags import email2nickname, \
    translate_seahub_time


logger = logging.getLogger(__name__)


class Groups(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def _get_group_admins(self, group_id):
        members = seaserv.get_group_members(group_id)
        admin_members = filter(lambda m: m.is_staff, members)

        admins = []
        for u in admin_members:
            admins.append(u.user_name)
        return admins

    def _can_add_group(self, request):
        return request.user.permissions.can_add_group()

    def get(self, request):
        """ List all groups.
        """

        org_id = None
        username = request.user.username
        if is_org_context(request):
            org_id = request.user.org.org_id
            user_groups = seaserv.get_org_groups_by_user(org_id, username)
        else:
            user_groups = seaserv.get_personal_groups_by_user(username)

        try:
            size = int(request.GET.get('avatar_size', GROUP_AVATAR_DEFAULT_SIZE))
        except ValueError:
            size = GROUP_AVATAR_DEFAULT_SIZE

        with_repos = request.GET.get('with_repos')
        with_repos = True if with_repos == '1' else False

        groups = []
        for g in user_groups:
            try:
                avatar_url, is_default, date_uploaded = api_grp_avatar_url(g.id, size)
            except Exception as e:
                logger.error(e)
                avatar_url = get_default_group_avatar_url()

            val = utc_to_local(dt(g.timestamp))
            group = {
                "id": g.id,
                "name": g.group_name,
                "creator": g.creator_name,
                "created_at": val.strftime("%Y-%m-%dT%H:%M:%S") + DateFormat(val).format('O'),
                "avatar_url": request.build_absolute_uri(avatar_url),
                "admins": self._get_group_admins(g.id),
            }

            if with_repos:
                if org_id:
                    group_repos = seafile_api.get_org_group_repos(org_id, g.id)
                else:
                    group_repos = seafile_api.get_repos_by_group(g.id)

                repos = []
                for r in group_repos:
                    repo = {
                        "id": r.id,
                        "name": r.name,
                        "desc": r.desc,
                        "size": r.size,
                        "size_formatted": filesizeformat(r.size),
                        "mtime": r.last_modified,
                        "mtime_relative": translate_seahub_time(r.last_modified),
                        "encrypted": r.encrypted,
                        "permission": r.permission,
                        "owner": r.user,
                        "owner_nickname": email2nickname(r.user),
                        "share_from_me": True if username == r.user else False,
                    }
                    repos.append(repo)

                group['repos'] = repos

            groups.append(group)

        return Response(groups)

    def post(self, request):
        """ Create a group
        """
        if not self._can_add_group(request):
            error_msg = _(u'You do not have permission to create group.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        group_name = request.DATA.get('group_name', '')
        group_name = group_name.strip()

        # Check whether group name is validate.
        if not validate_group_name(group_name):
            error_msg = _(u'Group name can only contain letters, numbers, blank, hyphen or underscore')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Check whether group name is duplicated.
        if check_group_name_conflict(request, group_name):
            error_msg = _(u'There is already a group with that name.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Group name is valid, create that group.
        try:
            group_id = seaserv.ccnet_threaded_rpc.create_group(group_name, username)
        except SearpcError as e:
            logger.error(e)
            error_msg = _(u'Failed')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            size = int(request.DATA.get('avatar_size', GROUP_AVATAR_DEFAULT_SIZE))
        except ValueError:
            size = GROUP_AVATAR_DEFAULT_SIZE

        g = seaserv.get_group(group_id)
        try:
            avatar_url, is_default, date_uploaded = api_grp_avatar_url(g.id, size)
        except Exception as e:
            logger.error(e)
            avatar_url = get_default_group_avatar_url()

        val = utc_to_local(dt(g.timestamp))
        new_group = {
            "id": g.id,
            "name": g.group_name,
            "creator": g.creator_name,
            "created_at": val.strftime("%Y-%m-%dT%H:%M:%S") + DateFormat(val).format('O'),
            "avatar_url": request.build_absolute_uri(avatar_url),
            "admins": self._get_group_admins(g.id),
        }
        return Response(new_group, status=status.HTTP_201_CREATED)
