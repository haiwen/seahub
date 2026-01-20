# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from django.utils.translation import gettext as _
from django.template.defaultfilters import filesizeformat

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.api2.utils import api_error, is_wiki_repo
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.avatar.settings import GROUP_AVATAR_DEFAULT_SIZE
from seahub.utils import is_org_context, is_valid_username, is_pro_version
from seahub.utils.repo import get_repo_owner
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.group.utils import validate_group_name, check_group_name_conflict, \
    is_group_member, is_group_admin, is_group_owner, is_group_admin_or_owner, \
    group_id_to_name, set_group_name_cache
from seahub.group.views import remove_group_common
from seahub.base.models import UserStarredFiles, UserMonitoredRepos, RepoArchiveStatus
from seahub.base.templatetags.seahub_tags import email2nickname, \
    translate_seahub_time, email2contact_email
from seahub.share.models import ExtraGroupsSharePermission
from seahub.settings import ENABLE_STORAGE_CLASSES

from .utils import api_check_group

logger = logging.getLogger(__name__)


def get_group_admins(group_id):
    members = ccnet_api.get_group_members(group_id)
    admin_members = [m for m in members if m.is_staff]

    admins = []
    for u in admin_members:
        admins.append(u.user_name)

    return admins


def get_group_info(request, group_id, avatar_size=GROUP_AVATAR_DEFAULT_SIZE):
    group = ccnet_api.get_group(group_id)
    isoformat_timestr = timestamp_to_isoformat_timestr(group.timestamp)
    group_info = {
        "id": group.id,
        "parent_group_id": group.parent_group_id,
        "name": group.group_name,
        "owner": group.creator_name,
        "created_at": isoformat_timestr,
        "admins": get_group_admins(group.id),
    }
    # parent_group_id = 0: non department group
    # parent_group_id = -1: top department group
    # parent_group_id = n(n > 0):  sub department group, n is parent group's id
    if group.parent_group_id != 0:
        group_info['group_quota'] = seafile_api.get_group_quota(group_id)

    group_info['group_quota_usage'] = ''
    if is_pro_version():
        if is_org_context(request):
            org_id = request.user.org.org_id
            group_info['group_quota_usage'] = seafile_api.org_get_group_quota_usage(org_id, group_id)
        else:
            group_info['group_quota_usage'] = seafile_api.get_group_quota_usage(group_id)

    return group_info


class Groups(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def _can_add_group(self, request):
        return request.user.permissions.can_add_group()

    def get(self, request):
        """ List all groups.
        """

        org_id = None
        username = request.user.username
        if is_org_context(request):
            org_id = request.user.org.org_id
            user_groups = ccnet_api.get_org_groups_by_user(org_id, username, return_ancestors=True)
        else:
            user_groups = ccnet_api.get_groups(username, return_ancestors=True)

        try:
            avatar_size = int(request.GET.get('avatar_size', GROUP_AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = GROUP_AVATAR_DEFAULT_SIZE

        try:
            with_repos = int(request.GET.get('with_repos', 0))
        except ValueError:
            with_repos = 0

        if with_repos not in (0, 1):
            error_msg = 'with_repos invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        groups = []
        if with_repos:
            gids = [g.id for g in user_groups]
            admin_info = ExtraGroupsSharePermission.objects.batch_get_repos_with_admin_permission(gids)

            try:
                starred_repos = UserStarredFiles.objects.get_starred_repos_by_user(username)
                starred_repo_id_list = [item.repo_id for item in starred_repos]
            except Exception as e:
                logger.error(e)
                starred_repo_id_list = []

        for g in user_groups:
            group_info = get_group_info(request, g.id, avatar_size)

            if with_repos:
                if org_id:
                    group_repos = seafile_api.get_org_group_repos(org_id, g.id)
                else:
                    group_repos = seafile_api.get_repos_by_group(g.id)

                # get repo id owner dict
                all_repo_owner = []
                repo_id_owner_dict = {}
                for repo in group_repos:
                    repo_id = repo.id
                    if repo_id not in repo_id_owner_dict:
                        repo_owner = get_repo_owner(request, repo_id)
                        all_repo_owner.append(repo_owner)
                        repo_id_owner_dict[repo_id] = repo_owner

                # Use dict to reduce memcache fetch cost in large for-loop.
                name_dict = {}
                contact_email_dict = {}

                for email in all_repo_owner:

                    if email not in name_dict:
                        if '@seafile_group' in email:
                            group_id = get_group_id_by_repo_owner(email)
                            group_name = group_id_to_name(group_id)
                            name_dict[email] = group_name
                        else:
                            name_dict[email] = email2nickname(email)

                    if email not in contact_email_dict:
                        if '@seafile_group' in email:
                            contact_email_dict[email] = ''
                        else:
                            contact_email_dict[email] = email2contact_email(email)

                # get monitored repo dict
                group_repo_ids = [item.repo_id for item in group_repos]
                try:
                    monitored_repos = UserMonitoredRepos.objects.filter(repo_id__in=group_repo_ids)
                    monitored_repos = monitored_repos.filter(email=username)
                    monitored_repo_id_list = [item.repo_id for item in monitored_repos]
                except Exception as e:
                    logger.error(e)
                    monitored_repo_id_list = []

                repos = []
                
                # Fetch archive status for all group repos at once
                if is_pro_version() and ENABLE_STORAGE_CLASSES:
                    archive_status_dict = RepoArchiveStatus.objects.get_repos_archive_status(group_repo_ids)
                else:
                    archive_status_dict = {}
                
                for r in group_repos:
                    if is_wiki_repo(r):
                        continue

                    repo_owner = repo_id_owner_dict.get(r.id, r.user)
                    
                    # Get permission, override to 'r' if archived
                    archive_status = archive_status_dict.get(r.id)
                    permission = r.permission
                    if archive_status == 'archived':
                        permission = 'r'
                    
                    repo = {
                        "id": r.id,
                        "repo_id": r.id,
                        "name": r.name,
                        "repo_name": r.name,
                        "size": r.size,
                        "size_formatted": filesizeformat(r.size),
                        "mtime": r.last_modified,
                        "mtime_relative": translate_seahub_time(r.last_modified),
                        "last_modified": timestamp_to_isoformat_timestr(r.last_modified),
                        "encrypted": r.encrypted,
                        "permission": permission,
                        "owner": repo_owner,
                        "owner_email": repo_owner,
                        "owner_name": name_dict.get(repo_owner, ''),
                        "owner_contact_email": contact_email_dict.get(repo_owner, ''),
                        "is_admin": (r.id, g.id) in admin_info,
                        "starred": r.repo_id in starred_repo_id_list,
                        "monitored": r.repo_id in monitored_repo_id_list,
                        "archive_status": archive_status,
                    }
                    repos.append(repo)

                group_info['repos'] = repos

            groups.append(group_info)

        return Response(groups)

    def post(self, request):
        """ Create a group
        """
        if not self._can_add_group(request):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        group_name = request.data.get('name', '')
        group_name = group_name.strip()

        # Check whether group name is validate.
        if not validate_group_name(group_name):
            error_msg = _('Name can only contain letters, numbers, spaces, hyphen, dot, single quote, brackets or underscore.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Check whether group name is duplicated.
        if check_group_name_conflict(request, group_name):
            error_msg = _('There is already a group with that name.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # create group.
        try:
            if is_org_context(request):
                org_id = request.user.org.org_id
                group_id = ccnet_api.create_org_group(org_id, group_name, username)
            else:
                group_id = ccnet_api.create_group(group_name, username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get info of new group
        group_info = get_group_info(request, group_id)

        return Response(group_info, status=status.HTTP_201_CREATED)


class Group(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_check_group
    def get(self, request, group_id):
        """ Get info of a group.
        """

        try:
            # only group member can get info of a group
            if not is_group_member(group_id, request.user.username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size', GROUP_AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = GROUP_AVATAR_DEFAULT_SIZE

        group_info = get_group_info(request, group_id, avatar_size)

        return Response(group_info)

    @api_check_group
    def put(self, request, group_id):
        """ Rename, transfer a specific group
        """

        username = request.user.username
        new_group_name = request.data.get('name', None)
        # rename a group
        if new_group_name:
            try:
                # only group owner/admin can rename a group
                if not is_group_admin_or_owner(group_id, username):
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                # Check whether group name is validate.
                if not validate_group_name(new_group_name):
                    error_msg = _('Name can only contain letters, numbers, spaces, hyphen, dot, single quote, brackets or underscore.')
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                # Check whether group name is duplicated.
                if check_group_name_conflict(request, new_group_name):
                    error_msg = _('There is already a group with that name.')
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                ccnet_api.set_group_name(group_id, new_group_name)
                set_group_name_cache(group_id, new_group_name)

            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        new_owner = request.data.get('owner', None)
        # transfer a group
        if new_owner:
            try:
                # only group owner can transfer a group
                if not is_group_owner(group_id, username):
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                # augument check
                if not is_valid_username(new_owner):
                    error_msg = 'Email %s invalid.' % new_owner
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                if is_group_owner(group_id, new_owner):
                    error_msg = _('User %s is already group owner.') % new_owner
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                # transfer a group
                if not is_group_member(group_id, new_owner):
                    ccnet_api.group_add_member(group_id, username, new_owner)

                if not is_group_admin(group_id, new_owner):
                    ccnet_api.group_set_admin(group_id, new_owner)

                ccnet_api.set_group_creator(group_id, new_owner)
                ccnet_api.group_unset_admin(group_id, username)

            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        wiki_enabled = request.data.get('wiki_enabled', None)
        # turn on/off group wiki
        if wiki_enabled:
            try:
                # only group owner/admin can turn on a group wiki
                if not is_group_admin_or_owner(group_id, username):
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                # augument check
                if wiki_enabled != 'true' and wiki_enabled != 'false':
                    error_msg = 'wiki_enabled invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        group_info = get_group_info(request, group_id)

        return Response(group_info)

    @api_check_group
    def delete(self, request, group_id):
        """ Dismiss a specific group
        """

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        username = request.user.username
        try:
            # only group owner can dismiss a group
            if not is_group_owner(group_id, username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            remove_group_common(group_id, username, org_id=org_id)

        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
