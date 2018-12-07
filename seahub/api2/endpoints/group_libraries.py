# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api

from constance import config

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import api_check_group
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner

from seahub.signals import repo_created
from seahub.group.utils import is_group_member, is_group_admin, \
    group_id_to_name
from seahub.utils import is_org_context, is_valid_dirent_name, \
        send_perm_audit_msg
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils.repo import get_repo_owner, get_available_repo_perms
from seahub.share.models import ExtraGroupsSharePermission
from seahub.share.signals import share_repo_to_group_successful
from seahub.share.utils import is_repo_admin, check_group_share_in_permission, \
        share_dir_to_group
from seahub.constants import PERMISSION_READ
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email

logger = logging.getLogger(__name__)

def get_group_repo_info(request, group_repo):

    group_id = group_repo.group_id
    repo_id = group_repo.repo_id

    is_admin = ExtraGroupsSharePermission.objects.get_group_permission(repo_id,
            group_id)

    group_repo_info = {}
    group_repo_info['repo_id'] = repo_id
    group_repo_info['repo_name'] = group_repo.name

    group_repo_info['mtime'] = timestamp_to_isoformat_timestr(group_repo.last_modified)
    group_repo_info['last_modified'] = timestamp_to_isoformat_timestr(group_repo.last_modified)
    group_repo_info['permission'] = group_repo.permission
    group_repo_info['size'] = group_repo.size
    group_repo_info['encrypted'] = group_repo.encrypted
    group_repo_info['is_admin'] = True if is_admin else False

    return group_repo_info

class GroupLibraries(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    @api_check_group # check whether group exists or not
    def get(self, request, group_id):
        """ Get all group libraries.

        Permission checking:
        1. is group member;
        """

        # only group member can get group libraries
        if not is_group_member(group_id, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if is_org_context(request):
            org_id = request.user.org.org_id
            group_repos = seafile_api.get_org_group_repos(org_id, group_id)
        else:
            group_repos = seafile_api.get_repos_by_group(group_id)

        group_repos.sort(lambda x, y: cmp(y.last_modified, x.last_modified))

        # get repo id owner dict
        all_repo_owner = []
        repo_id_owner_dict = {}
        for repo in group_repos:
            repo_id = repo.id
            if repo_id not in repo_id_owner_dict:
                repo_owner = get_repo_owner(request, repo_id)
                all_repo_owner.append(repo_owner)
                repo_id_owner_dict[repo_id] = repo_owner

        all_modifier = [r.last_modifier for r in group_repos]

        # Use dict to reduce memcache fetch cost in large for-loop.
        name_dict = {}
        contact_email_dict = {}

        for email in set(all_repo_owner + all_modifier):

            if email not in name_dict:
                if '@seafile_group' in email:
                    group_id = get_group_id_by_repo_owner(email)
                    group_name= group_id_to_name(group_id)
                    name_dict[email] = group_name
                else:
                    name_dict[email] = email2nickname(email)

            if email not in contact_email_dict:
                if '@seafile_group' in email:
                    contact_email_dict[email] = ''
                else:
                    contact_email_dict[email] = email2contact_email(email)

        result = []
        for group_repo in group_repos:
            group_repo_info = get_group_repo_info(request, group_repo)

            repo_owner = repo_id_owner_dict[group_repo.id]
            group_repo_info['owner_email'] = repo_owner
            group_repo_info['owner_name'] = name_dict.get(repo_owner, '')
            group_repo_info['owner_contact_email'] = contact_email_dict.get(repo_owner, '')

            modifier = group_repo.last_modifier
            group_repo_info['modifier_email'] = modifier
            group_repo_info['modifier_name'] = name_dict.get(modifier, '')
            group_repo_info['modifier_contact_email'] = contact_email_dict.get(modifier, '')

            result.append(group_repo_info)

        return Response(result)

    @api_check_group
    def post(self, request, group_id):
        """ Add a group library.

        Permission checking:
        1. role permission, can_add_repo;
        1. is group member;
        """

        # argument check
        repo_name = request.data.get("repo_name", None)
        if not repo_name or \
                not is_valid_dirent_name(repo_name):
            error_msg = "repo_name invalid."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        password = request.data.get("password", None)
        if password and not config.ENABLE_ENCRYPTED_LIBRARY:
            error_msg = 'NOT allow to create encrypted library.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        permission = request.data.get('permission', PERMISSION_READ)
        if permission not in get_available_repo_perms():
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if not request.user.permissions.can_add_repo():
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not is_group_member(group_id, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # create group repo
        org_id = -1
        group_id = int(group_id)
        username = request.user.username

        is_org = False
        if is_org_context(request):
            is_org = True
            org_id = request.user.org.org_id
            repo_id = seafile_api.create_org_repo(repo_name,
                    '', username, password, org_id)
        else:
            repo_id = seafile_api.create_repo(repo_name,
                    '', username, password)

        repo = seafile_api.get_repo(repo_id)
        share_dir_to_group(repo, '/', username, username, group_id,
                permission, org_id if is_org else None)

        # for activities
        library_template = request.data.get("library_template", '')
        repo_created.send(sender=None, org_id=org_id, creator=username,
                repo_id=repo_id, repo_name=repo_name,
                library_template=library_template)

        # for notification
        share_repo_to_group_successful.send(sender=None, from_user=username,
                group_id=group_id, repo=repo, path='/', org_id=org_id)

        # for perm audit
        send_perm_audit_msg('add-repo-perm', username, group_id,
                repo_id, '/', permission)

        group_repo = seafile_api.get_group_shared_repo_by_path(repo_id,
                None, group_id, is_org)
        group_repo_info = get_group_repo_info(request, group_repo)

        group_repo_info['owner_email'] = username
        group_repo_info['owner_name'] = email2nickname(username)
        group_repo_info['owner_contact_email'] = email2contact_email(username)

        modifier = group_repo.last_modifier
        group_repo_info['modifier_email'] = modifier
        group_repo_info['modifier_name'] = email2nickname(modifier)
        group_repo_info['modifier_contact_email'] = email2contact_email(modifier)

        return Response(group_repo_info)

class GroupLibrary(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    @api_check_group
    def delete(self, request, group_id, repo_id):
        """ Delete a group library.

        Permission checking:
        1. is group admin;
        1. is repo owner;
        1. repo is shared to group with `admin` permission;
        """

        group_id = int(group_id)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        is_org = False
        if is_org_context(request):
            is_org = True

        group_repo = seafile_api.get_group_shared_repo_by_path(repo_id,
                None, group_id, is_org)
        if not group_repo:
            error_msg = 'Group library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # only group admin or repo owner can delete group repo.
        username = request.user.username
        repo_owner = get_repo_owner(request, repo_id)

        if not is_group_admin(group_id, username) and \
                repo_owner != username and \
                not is_repo_admin(username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        permission = check_group_share_in_permission(repo_id, group_id, is_org)

        if is_org:
            org_id = ccnet_api.get_org_id_by_group(group_id)
            seafile_api.del_org_group_repo(repo_id, org_id, group_id)
        else:
            seafile_api.unset_group_repo(repo_id, group_id, username)

        origin_repo_id = group_repo.origin_repo_id or repo_id
        origin_path = group_repo.origin_path or '/'
        send_perm_audit_msg('delete-repo-perm', username, group_id,
                origin_repo_id, origin_path, permission)

        # delete extra share permission
        ExtraGroupsSharePermission.objects.delete_share_permission(repo_id, group_id)

        return Response({'success': True})
