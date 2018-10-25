# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error

from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils.repo import get_repo_owner, is_repo_admin, \
        repo_has_been_shared_out
from seahub.views import check_folder_permission, list_inner_pub_repos
from seahub.share.models import ExtraSharePermission
from seahub.utils import is_org_context
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

from seaserv import seafile_api

logger = logging.getLogger(__name__)


class ReposView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Return repos user can access.

        Permission checking:
        1. all authenticated user can perform this action.
        """

        filter_by = {
            'mine': False,
            'shared': False,
            'group': False,
            'public': False,
        }

        request_type_list = request.GET.getlist('type', "")
        if not request_type_list:
            # set all to True, no filter applied
            filter_by = filter_by.fromkeys(filter_by.iterkeys(), True)

        for request_type in request_type_list:
            request_type = request_type.strip()
            filter_by[request_type] = True

        email = request.user.username

        # Use dict to reduce memcache fetch cost in large for-loop.
        contact_email_dict = {}
        nickname_dict = {}

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        repo_info_list = []
        if filter_by['mine']:
            if org_id:
                owned_repos = seafile_api.get_org_owned_repo_list(org_id,
                        email, ret_corrupted=True)
            else:
                owned_repos = seafile_api.get_owned_repo_list(email,
                        ret_corrupted=True)

            # Reduce memcache fetch ops.
            modifiers_set = set([x.last_modifier for x in owned_repos])
            for e in modifiers_set:
                if e not in contact_email_dict:
                    contact_email_dict[e] = email2contact_email(e)
                if e not in nickname_dict:
                    nickname_dict[e] = email2nickname(e)

            owned_repos.sort(lambda x, y: cmp(y.last_modify, x.last_modify))
            for r in owned_repos:

                # do not return virtual repos
                if r.is_virtual:
                    continue

                repo_info = {
                    "type": "mine",
                    "repo_id": r.id,
                    "repo_name": r.name,
                    "owner_email": email,
                    "owner_name": email2nickname(email),
                    "owner_contact_email": email2contact_email(email),
                    "last_modified": timestamp_to_isoformat_timestr(r.last_modify),
                    "modifier_email": r.last_modifier,
                    "modifier_name": nickname_dict.get(r.last_modifier, ''),
                    "modifier_contact_email": contact_email_dict.get(r.last_modifier, ''),
                    "size": r.size,
                    "encrypted": r.encrypted,
                    "permission": 'rw',  # Always have read-write permission to owned repo
                }
                repo_info_list.append(repo_info)

        if filter_by['shared']:

            if org_id:
                shared_repos = seafile_api.get_org_share_in_repo_list(org_id,
                        email, -1, -1)
            else:
                shared_repos = seafile_api.get_share_in_repo_list(
                        email, -1, -1)

            repos_with_admin_share_to = ExtraSharePermission.objects.\
                    get_repos_with_admin_permission(email)

            # Reduce memcache fetch ops.
            owners_set = set([x.user for x in shared_repos])
            modifiers_set = set([x.last_modifier for x in shared_repos])
            for e in owners_set | modifiers_set:
                if e not in contact_email_dict:
                    contact_email_dict[e] = email2contact_email(e)
                if e not in nickname_dict:
                    nickname_dict[e] = email2nickname(e)

            shared_repos.sort(lambda x, y: cmp(y.last_modify, x.last_modify))
            for r in shared_repos:

                repo_info = {
                    "type": "shared",
                    "repo_id": r.repo_id,
                    "repo_name": r.repo_name,
                    "last_modified": timestamp_to_isoformat_timestr(r.last_modify),
                    "modifier_email": r.last_modifier,
                    "modifier_name": nickname_dict.get(r.last_modifier, ''),
                    "modifier_contact_email": contact_email_dict.get(r.last_modifier, ''),
                    "size": r.size,
                    "encrypted": r.encrypted,
                    "permission": r.permission,
                }

                if r.repo_id in repos_with_admin_share_to:
                    repo_info['is_admin'] = True
                else:
                    repo_info['is_admin'] = False

                repo_info_list.append(repo_info)

        if filter_by['group']:

            if org_id:
                group_repos = seafile_api.get_org_group_repos_by_user(email, org_id)
            else:
                group_repos = seafile_api.get_group_repos_by_user(email)

            group_repos.sort(lambda x, y: cmp(y.last_modify, x.last_modify))

            # Reduce memcache fetch ops.
            share_from_set = set([x.user for x in group_repos])
            modifiers_set = set([x.last_modifier for x in group_repos])
            for e in modifiers_set | share_from_set:
                if e not in contact_email_dict:
                    contact_email_dict[e] = email2contact_email(e)
                if e not in nickname_dict:
                    nickname_dict[e] = email2nickname(e)

            for r in group_repos:
                repo_info = {
                    "type": "group",
                    "group_id": r.group_id,
                    "group_name": r.group_name,
                    "repo_id": r.repo_id,
                    "repo_name": r.repo_name,
                    "last_modified": timestamp_to_isoformat_timestr(r.last_modify),
                    "modifier_email": r.last_modifier,
                    "modifier_name": nickname_dict.get(r.last_modifier, ''),
                    "modifier_contact_email": contact_email_dict.get(r.last_modifier, ''),
                    "size": r.size,
                    "encrypted": r.encrypted,
                    "permission": r.permission,
                }
                repo_info_list.append(repo_info)

        if filter_by['public'] and request.user.permissions.can_view_org():
            public_repos = list_inner_pub_repos(request)

            # Reduce memcache fetch ops.
            share_from_set = set([x.user for x in public_repos])
            modifiers_set = set([x.last_modifier for x in public_repos])
            for e in modifiers_set | share_from_set:
                if e not in contact_email_dict:
                    contact_email_dict[e] = email2contact_email(e)
                if e not in nickname_dict:
                    nickname_dict[e] = email2nickname(e)

            for r in public_repos:
                repo_info = {
                    "type": "public",
                    "repo_id": r.repo_id,
                    "repo_name": r.repo_name,
                    "last_modified": timestamp_to_isoformat_timestr(r.last_modify),
                    "modifier_email": r.last_modifier,
                    "modifier_name": nickname_dict.get(r.last_modifier, ''),
                    "modifier_contact_email": contact_email_dict.get(r.last_modifier, ''),
                    "size": r.size,
                    "encrypted": r.encrypted,
                    "permission": r.permission,
                }
                repo_info_list.append(repo_info)

        return Response({'repos': repo_info_list})


class RepoView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        """ Return repo info

        Permission checking:
        1. all authenticated user can perform this action.
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if permission is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        repo_owner = get_repo_owner(request, repo_id)

        try:
            has_been_shared_out = repo_has_been_shared_out(request, repo_id)
        except Exception as e:
            has_been_shared_out = False
            logger.error(e)

        result = {
            "repo_id": repo.id,
            "repo_name": repo.name,

            "owner_email": repo_owner,
            "owner_name": email2nickname(repo_owner),
            "owner_contact_email": email2contact_email(repo_owner),

            "size": repo.size,
            "encrypted": repo.encrypted,
            "file_count": repo.file_count,
            "permission": permission,
            "no_quota": True if seafile_api.check_quota(repo_id) < 0 else False,
            "is_admin": is_repo_admin(username, repo_id),
            "is_virtual": repo.is_virtual,
            "has_been_shared_out": has_been_shared_out,
        }

        return Response(result)
