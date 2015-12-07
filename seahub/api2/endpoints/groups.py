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
from seahub.utils import is_org_context, is_valid_username
from seahub.utils.timeutils import dt, utc_to_local
from seahub.group.utils import validate_group_name, check_group_name_conflict
from seahub.group.views import remove_group_common
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

    def put(self, request, group_id):
        """ Rename, transfer a group
        """

        group_id = int(group_id)
        try:
            group = seaserv.get_group(group_id)
        except SearpcError as e:
            logger.error(e)
            error_msg = _(u'Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not group:
            error_msg = _(u'Group does not exist.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # only group staff can rename or transfer a group
        username = request.user.username
        if not seaserv.check_group_staff(group_id, username):
            error_msg = _(u'Permission denied')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        operation = request.DATA.get('operation', '')
        if operation.lower() == 'rename':
            new_group_name = request.DATA.get('new_group_name', None)
            if not new_group_name:
                error_msg = _(u'Argument missing')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # Check whether group name is validate.
            if not validate_group_name(new_group_name):
                error_msg = _(u'Group name can only contain letters, numbers, blank, hyphen or underscore')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # Check whether group name is duplicated.
            if check_group_name_conflict(request, new_group_name):
                error_msg = _(u'There is already a group with that name.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                seaserv.ccnet_threaded_rpc.set_group_name(group_id, new_group_name)
            except SearpcError as e:
                logger.error(e)
                error_msg = _(u'Internal Server Error')
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        elif operation.lower() == 'transfer':
            email = request.DATA.get('email')
            if not email:
                error_msg = _(u'Argument missing')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if not is_valid_username(email):
                error_msg = _('Email %s is not valid.') % email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if email != username:
                try:
                    if not seaserv.is_group_user(group_id, email):
                        seaserv.ccnet_threaded_rpc.group_add_member(group_id, username, email)

                    seaserv.ccnet_threaded_rpc.set_group_creator(group_id, email)
                    seaserv.ccnet_threaded_rpc.group_set_admin(group_id, email)
                except SearpcError as e:
                    logger.error(e)
                    error_msg = _(u'Internal Server Error')
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        else:
            error_msg = _(u'Operation can only be rename or transfer.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        g = seaserv.get_group(group_id)
        val = utc_to_local(dt(g.timestamp))
        avatar_url, is_default, date_uploaded = api_grp_avatar_url(group_id,
                GROUP_AVATAR_DEFAULT_SIZE)

        group_info = {
            "id": g.id,
            "name": g.group_name,
            "creator": g.creator_name,
            "created_at": val.strftime("%Y-%m-%dT%H:%M:%S") + DateFormat(val).format('O'),
            "avatar_url": request.build_absolute_uri(avatar_url),
            "admins": self._get_group_admins(g.id),
        }
        return Response(group_info, status=status.HTTP_200_OK)

    def delete(self, request, group_id):
        """ Delete a group
        """

        group_id = int(group_id)
        try:
            group = seaserv.get_group(group_id)
        except SearpcError as e:
            logger.error(e)
            error_msg = _(u'Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not group:
            error_msg = _(u'Group does not exist.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # only group staff can delete a group
        username = request.user.username
        if not seaserv.check_group_staff(group_id, username):
            error_msg = _(u'Permission denied')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        try:
            remove_group_common(group_id, username, org_id=org_id)
        except SearpcError as e:
            logger.error(e)
            error_msg = _(u'Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True}, status=status.HTTP_200_OK)

