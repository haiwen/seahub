# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.template.defaultfilters import filesizeformat
from django.utils.translation import ugettext as _

from seaserv import ccnet_api, seafile_api, seafserv_threaded_rpc

from seahub.views import get_system_default_repo_id
from seahub.base.accounts import User
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

logger = logging.getLogger(__name__)

def get_repo_info(repo):

    result = {}
    result['id'] = repo.repo_id
    result['name'] = repo.repo_name
    result['owner'] = seafile_api.get_repo_owner(repo.repo_id)
    result['size'] = repo.size
    result['size_formatted'] = filesizeformat(repo.size)
    result['encrypted'] = repo.encrypted
    result['file_count'] = repo.file_count

    return result


class AdminLibraries(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, format=None):
        """ List 'all' libraries (by name/owner/page)

        Permission checking:
        1. only admin can perform this action.
        """

        # search libraries (by name/owner)
        repo_name = request.GET.get('name', '')
        owner = request.GET.get('owner', '')
        repos = []
        if repo_name and owner:
            # search by name and owner
            owned_repos = seafile_api.get_owned_repo_list(owner)
            for repo in owned_repos:
                if not repo.name:
                    continue
                if repo_name in repo.name:
                    repo_info = get_repo_info(repo)
                    repos.append(repo_info)

            return Response({"name": repo_name, "owner": owner, "repos": repos})

        elif repo_name:
            # search by name(keyword in name)
            repos_all = seafile_api.get_repo_list(-1, -1)
            for repo in repos_all:
                if not repo.name:
                    continue
                if repo_name in repo.name:
                    repo_info = get_repo_info(repo)
                    repos.append(repo_info)

            return Response({"name": repo_name, "owner": '', "repos": repos})

        elif owner:
            # search by owner
            owned_repos = seafile_api.get_owned_repo_list(owner)
            for repo in owned_repos:
                repo_info = get_repo_info(repo)
                repos.append(repo_info)

            return Response({"name": '', "owner": owner, "repos": repos})

        # get libraries by page
        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = (current_page - 1) * per_page
        limit = per_page + 1

        repos_all = seafile_api.get_repo_list(start, limit)

        if len(repos_all) > per_page:
            repos_all = repos_all[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        default_repo_id = get_system_default_repo_id()
        repos_all = filter(lambda r: not r.is_virtual, repos_all)
        repos_all = filter(lambda r: r.repo_id != default_repo_id, repos_all)

        return_results = []

        for repo in repos_all:
            repo_info = get_repo_info(repo)
            return_results.append(repo_info)

        page_info = {
            'has_next_page': has_next_page,
            'current_page': current_page
        }

        return Response({"page_info": page_info, "repos": return_results})

class AdminLibrary(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def delete(self, request, repo_id, format=None):
        """ delete a library

        Permission checking:
        1. only admin can perform this action.
        """
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return Response({'success': True})

        if get_system_default_repo_id() == repo_id:
            error_msg = _('System library can not be deleted.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            seafile_api.remove_repo(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def put(self, request, repo_id, format=None):
        """ transfer a library

        Permission checking:
        1. only admin can perform this action.
        """
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        new_owner = request.data.get('owner', None)
        if not new_owner:
            error_msg = 'owner invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            User.objects.get(email=new_owner)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % new_owner
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if MULTI_TENANCY:
            try:
                if seafserv_threaded_rpc.get_org_id_by_repo_id(repo_id) > 0:
                    error_msg = 'Can not transfer organization library.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                if ccnet_api.get_orgs_by_user(new_owner):
                    error_msg = 'Can not transfer library to organization user %s' % new_owner
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        repo_owner = seafile_api.get_repo_owner(repo_id)

        # get repo shared to user/group list
        shared_users = seafile_api.list_repo_shared_to(
                repo_owner, repo_id)
        shared_groups = seafile_api.list_repo_shared_group_by_user(
                repo_owner, repo_id)

        # get all pub repos
        pub_repos = []
        if not request.cloud_mode:
            pub_repos = seafile_api.list_inner_pub_repos_by_owner(repo_owner)

        # transfer repo
        seafile_api.set_repo_owner(repo_id, new_owner)

        # reshare repo to user
        for shared_user in shared_users:
            shared_username = shared_user.user

            if new_owner == shared_username:
                continue

            seafile_api.share_repo(repo_id, new_owner,
                    shared_username, shared_user.perm)

        # reshare repo to group
        for shared_group in shared_groups:
            shared_group_id = shared_group.group_id

            if not ccnet_api.is_group_user(shared_group_id, new_owner):
                continue

            seafile_api.set_group_repo(repo_id, shared_group_id,
                    new_owner, shared_group.perm)

        # check if current repo is pub-repo
        # if YES, reshare current repo to public
        for pub_repo in pub_repos:
            if repo_id != pub_repo.id:
                continue

            seafile_api.add_inner_pub_repo(repo_id, pub_repo.permission)

            break

        repo = seafile_api.get_repo(repo_id)
        repo_info = get_repo_info(repo)

        return Response(repo_info)
