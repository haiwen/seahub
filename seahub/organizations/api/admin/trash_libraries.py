import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.utils import is_valid_username
from seahub.utils.seafile_db import SeafileDB
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.group.utils import group_id_to_name

from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.organizations.views import org_user_exists

logger = logging.getLogger(__name__)

def get_trash_repo_info(repo):

    result = {}
    owner = repo.owner_id

    result['name'] = repo.repo_name
    result['id'] = repo.repo_id
    result['owner'] = owner
    result['org_id'] = repo.org_id
    result['owner_name'] = email2nickname(owner)
    result['delete_time'] = timestamp_to_isoformat_timestr(repo.del_time)

    if '@seafile_group' in owner:
        group_id = get_group_id_by_repo_owner(owner)
        result['group_name'] = group_id_to_name(group_id)

    return result


class OrgAdminTrashLibraries(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser )

    def get(self, request, org_id):
        """ List deleted repos (by owner)

        Permission checking:
        1. only admin can perform this action.
        """

        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # list by owner
        search_owner = request.GET.get('owner', '')
        if search_owner:
            if not org_user_exists(org_id, search_owner):
                error_msg = 'User %s not in org %s.' % (search_owner, org_id)
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if not is_valid_username(search_owner):
                error_msg = 'owner invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            repos = seafile_api.get_trash_repos_by_owner(search_owner)

            return_repos = []
            for repo in repos:
                result = get_trash_repo_info(repo)
                return_repos.append(result)

            return Response({"search_owner": search_owner, "repos": return_repos})

        # list by page
        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = (current_page - 1) * per_page
        limit = per_page + 1

        repos_all = seafile_api.get_trash_repo_list(start, limit)

        if len(repos_all) > per_page:
            repos_all = repos_all[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        return_results = []
        for repo in repos_all:
            if repo.org_id != org_id:
                continue
            repo_info = get_trash_repo_info(repo)
            return_results.append(repo_info)

        page_info = {
            'has_next_page': has_next_page,
            'current_page': current_page
        }

        return Response({"page_info": page_info, "repos": return_results})

    def delete(self, request, org_id):
        """ clean all deleted org libraries(by owner)

        Permission checking:
        1. only org admin can perform this action.
        """

        org_id = int(org_id)
        owner = request.data.get('owner', '')
        try:
            if owner:
                if not is_valid_username(owner):
                    error_msg = 'owner invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                seafile_api.empty_repo_trash_by_owner(owner)
            else:
                try:
                    db_api = SeafileDB()
                    db_api.empty_org_repo_trash(int(org_id))
                except Exception as e:
                    raise
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

class OrgAdminTrashLibrary(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser )

    def put(self, request, org_id, repo_id):
        """ restore a deleted library

        Permission checking:
        1. only admin can perform this action.
        """

        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        owner = seafile_api.get_trash_repo_owner(repo_id)
        if not owner:
            error_msg = "Library does not exist in trash."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if '@seafile_group' in owner:
            group_id = ccnet_api.get_org_id_by_group(int(owner.split('@')[0]))
            if group_id != org_id:
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        else:
            if not org_user_exists(org_id, owner):
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            seafile_api.restore_repo_from_trash(repo_id)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def delete(self, request, org_id, repo_id):
        """ permanently delete a deleted library

        Permission checking:
        1. only org admin can perform this action.
        """

        org_id = int(org_id)
        owner = seafile_api.get_trash_repo_owner(repo_id)
        if not owner:
            error_msg = "Library does not exist in trash."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if '@seafile_group' in owner:
            group_id = ccnet_api.get_org_id_by_group(int(owner.split('@')[0]))
            if group_id != org_id:
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        else:
            if not org_user_exists(org_id, owner):
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            seafile_api.del_repo_from_trash(repo_id)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})