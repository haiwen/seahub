import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, seafserv_threaded_rpc

from seahub.utils import is_org_context, get_file_operation_records
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, \
        utc_datetime_to_isoformat_timestr

from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.views import check_folder_permission
from seahub.share.models import FileShare, UploadLinkShare

logger = logging.getLogger(__name__)

def get_my_repo_info(repo):
    repo_info = {
        "repo_id": repo.repo_id,
        "name": repo.repo_name,
        "size": repo.size,
        "starred": repo.starred,
        "last_modified": timestamp_to_isoformat_timestr(repo.last_modified),
        "permission": 'rw',
        "encrypted": repo.encrypted,
        "status": repo.status if repo.status else '',
    }

    return repo_info

def get_shared_in_repo_info(repo):
    repo_info = {
        "repo_id": repo.repo_id,
        "name": repo.repo_name,
        "size": repo.size,
        "starred": repo.starred,
        "last_modified": timestamp_to_isoformat_timestr(repo.last_modified),
        "repo_owner": repo.user,
        "permission": repo.permission,
        "encrypted": repo.encrypted,
        "status": repo.status if repo.status else '',
    }

    return repo_info

def get_public_repo_info(repo):
    repo_info = {
        "repo_id": repo.repo_id,
        "name": repo.repo_name,
        "size": repo.size,
        "starred": repo.starred,
        "last_modified": timestamp_to_isoformat_timestr(repo.last_modified),
        "repo_owner": repo.user,
        "permission": repo.permission,
        "encrypted": repo.encrypted,
        "status": repo.status if repo.status else '',
    }

    return repo_info


class AlphaBoxRepos(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ List all my repos or repos shared to me

        Permission checking:
        1. all authenticated user can perform this action.
        """

        r_type = request.GET.get('type', 'mine')
        r_type = r_type.lower()
        if r_type not in ('mine', 'shared'):
            error_msg = "type should be 'mine' or 'shared'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            page = 1
            per_page = 100

        if page <= 0:
            error_msg = 'page invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if per_page <= 0:
            error_msg = 'per_page invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        start = (page - 1) * per_page
        limit = per_page

        order_by = request.GET.get('order_by', 'last_modified')
        if order_by not in ('name', 'size', 'last_modified'):
            error_msg = "order_by can only be 'name', 'size', or 'last_modified'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if order_by == 'last_modified':
            order_by = 'update_time'

        desc = request.GET.get('desc', 'false')
        desc = desc.lower()
        if desc not in ('true', 'false'):
            error_msg = "desc should be 'true' or 'false'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if desc == 'true':
            order_by += '_desc'

        # if not pass 'starred' parameter, return all repos
        # if passed, filter repos by value of 'starred' parameter
        starred_parameter = request.GET.get('starred', None)
        if starred_parameter:
            starred_parameter = starred_parameter.lower()
            if starred_parameter not in ('true', 'false'):
                error_msg = "starred should be 'true' or 'false'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # if not pass 'permission' parameter, return all repos
        # if passed, filter repos by value of 'permission' parameter
        permission_parameter = request.GET.get('permission', None)
        if permission_parameter:
            permission_parameter = permission_parameter.lower()
            if permission_parameter not in ('r', 'rw'):
                error_msg = "permission should be 'r' or 'rw'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # if not pass 'encrypted' parameter, return all repos
        # if passed, filter repos by value of 'encrypted' parameter
        encrypted_parameter = request.GET.get('encrypted', None)
        if encrypted_parameter:
            encrypted_parameter = encrypted_parameter.lower()
            if encrypted_parameter not in ('true', 'false'):
                error_msg = "encrypted should be 'true' or 'false'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = []
        username = request.user.username
        if r_type == 'mine':
            try:
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    repos = seafile_api.get_org_owned_repo_list(org_id,
                            username, ret_corrupted=False,
                            start=start, limit=limit, order_by=order_by)
                else:
                    repos = seafile_api.get_owned_repo_list(
                            username, ret_corrupted=False, start=start, limit=limit)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            for repo in repos:
                repo_info = get_my_repo_info(repo)
                result.append(repo_info)

        if r_type == 'shared':

            shared_from = request.GET.get('shared_from', None)
            not_shared_from = request.GET.get('not_shared_from', None)

            try:
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    if shared_from:
                        repos = seafile_api.org_get_share_in_repo_list_with_sharer(org_id,
                                username, shared_from, negate=False,
                                start=start, limit=limit, order_by=order_by)
                    elif not_shared_from:
                        repos = seafile_api.org_get_share_in_repo_list_with_sharer(org_id,
                                username, not_shared_from, negate=True,
                                start=start, limit=limit, order_by=order_by)
                    else:
                        repos = seafile_api.get_org_share_in_repo_list(org_id,
                                username, start=start, limit=limit)
                else:
                    # TODO, not used currently
                    repos = []
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            for repo in repos:
                repo_info = get_shared_in_repo_info(repo)
                result.append(repo_info)

        # get repo id list
        repo_id_list = []
        for repo_info in result:
            repo_id = repo_info["repo_id"]
            if repo_id not in repo_id_list:
                repo_id_list.append(repo_id)

        # get share link info of repo

        # file_share_repo_ids.query
        # SELECT DISTINCT "share_fileshare"."repo_id" FROM "share_fileshare" WHERE "share_fileshare"."repo_id" IN ()
        file_share_repo_ids = FileShare.objects.filter(repo_id__in=repo_id_list). \
                values_list('repo_id', flat=True).distinct()

        # upload_link_share_repo_ids.query
        # SELECT DISTINCT "share_uploadlinkshare"."repo_id" FROM "share_uploadlinkshare" WHERE "share_uploadlinkshare"."repo_id" IN ()
        upload_link_share_repo_ids = UploadLinkShare.objects.filter(repo_id__in=repo_id_list). \
                values_list('repo_id', flat=True).distinct()

        for repo_info in result:
            repo_id = repo_info["repo_id"]
            share_link_info = {}
            share_link_info["has_download_link"] = repo_id in file_share_repo_ids
            share_link_info["has_upload_link"] = repo_id in upload_link_share_repo_ids
            repo_info["share_link"] = share_link_info

        if starred_parameter:
            # filter by value of 'starred' parameter
            result = [item for item in result if item['starred'] ==
                    to_python_boolean(starred_parameter)]

        if permission_parameter:
            # filter by value of 'permission' parameter
            result = [item for item in result if item['permission'] ==
                    permission_parameter]

        if encrypted_parameter:
            # filter by value of 'encrypted' parameter
            result = [item for item in result if item['encrypted'] ==
                    to_python_boolean(encrypted_parameter)]

        return Response(result)


class AlphaBoxRepo(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, repo_id):
        """ Modify repo basic info.

        1. Star/unstar a repo.
        2. Update repo status.

        Permission checking:
        1. User can view repo.
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        starred = request.data.get('starred', '')
        if starred:
            starred = starred.lower()
            if starred not in ('true', 'false'):
                error_msg = "starred should be 'true' or 'false'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if not check_folder_permission(request, repo_id, '/'):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            username = request.user.username
            try:
                if starred == 'true':
                    seafile_api.star_repo(repo_id, username)
                else:
                    seafile_api.unstar_repo(repo_id, username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        repo_status = request.data.get('status', '')
        if repo_status:

            if check_folder_permission(request, repo_id, '/') != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                seafile_api.update_repo_status(repo_id, repo_status)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class AlphaBoxReposCount(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get the number of all libraries that user can access.

        Permission checking:
        1. all authenticated user can perform this action.
        """

        r_type = request.GET.get('type', 'mine')
        r_type = r_type.lower()
        if r_type not in ('mine', 'shared'):
            error_msg = "type should be 'mine' or 'shared'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repos_count = 0
        username = request.user.username

        if r_type == 'mine':
            try:
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    repos_count = seafile_api.org_get_repo_num_by_owner(org_id,
                            username)
                else:
                    # TODO, not used currently
                    pass
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if r_type == 'shared':

            shared_from = request.GET.get('shared_from', None)
            not_shared_from = request.GET.get('not_shared_from', None)

            try:
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    if shared_from:
                        repos_count = seafile_api.org_get_share_repo_num_with_sharer(org_id,
                                username, shared_from, negate=False)
                    elif not_shared_from:
                        repos_count = seafile_api.org_get_share_repo_num_with_sharer(org_id,
                                username, not_shared_from, negate=True)
                    else:
                        repos_count = seafile_api.org_get_share_repo_num_with_sharer(org_id,
                                username, '', negate=True)
                else:
                    # TODO, not used currently
                    pass
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {
            'count': repos_count,
        }

        return Response(result)


class AlphaBoxReposSearch(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get_owned_repos_info(self, request):

        result = []
        username = request.user.username

        if is_org_context(request):
            org_id = request.user.org.org_id
            repos = seafile_api.get_org_owned_repo_list(org_id,
                    username, ret_corrupted=False, start=-1, limit=-1)
        else:
            repos = seafile_api.get_owned_repo_list(
                    username, ret_corrupted=False, start=-1, limit=-1)

        searched_name = request.GET.get('nameContains', '')
        for repo in repos:
            if searched_name.lower() not in repo.repo_name.lower():
                continue

            repo_info = get_my_repo_info(repo)
            repo_info['type'] = 'mine'
            result.append(repo_info)

        return result

    def get_shared_in_repos_info(self, request):

        result = []
        username = request.user.username

        shared_from = request.GET.get('shared_from', None)
        not_shared_from = request.GET.get('not_shared_from', None)

        if is_org_context(request):
            org_id = request.user.org.org_id
            if shared_from:
                repos = seafile_api.org_get_share_in_repo_list_with_sharer(org_id,
                        username, shared_from, negate=False, start=-1, limit=-1)
            elif not_shared_from:
                repos = seafile_api.org_get_share_in_repo_list_with_sharer(org_id,
                        username, not_shared_from, negate=True, start=-1, limit=-1)
            else:
                repos = seafile_api.get_org_share_in_repo_list(org_id,
                        username, start=-1, limit=-1)
        else:
            # TODO, not used currently
            repos = []

        searched_name = request.GET.get('nameContains', '')
        for repo in repos:
            if searched_name.lower() not in repo.repo_name.lower():
                continue

            repo_info = get_shared_in_repo_info(repo)
            repo_info['type'] = 'shared'
            result.append(repo_info)

        return result

    def get_public_repos_info(self, request):

        result = []

        if is_org_context(request):
            org_id = request.user.org.org_id
            # TODO: seafile_api.list_org_inner_pub_repos(org_id)
            repos = seafserv_threaded_rpc.list_org_inner_pub_repos(org_id)
        else:
            # TODO, not used currently
            repos = seafserv_threaded_rpc.list_inner_pub_repos()

        searched_name = request.GET.get('nameContains', '')
        for repo in repos:
            if searched_name.lower() not in repo.repo_name.lower():
                continue

            repo_info = get_public_repo_info(repo)
            repo_info['type'] = 'public'
            result.append(repo_info)

        return result

    def get(self, request):
        """ Search repo by name

        Permission checking:
        1. all authenticated user can perform this action.
        """

        r_type = request.GET.get('type', '')
        if r_type and r_type not in ('mine', 'shared', 'public'):
            error_msg = "type should be 'mine', 'shared' or 'public'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        searched_name = request.GET.get('nameContains', '')
        if not searched_name:
            error_msg = 'nameContains invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        owned_repos_info = []
        shared_in_repos_info = []
        public_repos_info = []
        try:
            if not r_type:
                owned_repos_info = self.get_owned_repos_info(request)
                shared_in_repos_info = self.get_shared_in_repos_info(request)
                public_repos_info = self.get_public_repos_info(request)
            elif r_type.lower() == 'mine':
                owned_repos_info = self.get_owned_repos_info(request)
            elif r_type.lower() == 'shared':
                shared_in_repos_info = self.get_shared_in_repos_info(request)
            elif r_type.lower() == 'public':
                public_repos_info = self.get_public_repos_info(request)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(owned_repos_info + shared_in_repos_info +
                public_repos_info)


class AlphaBoxFileOperationRecord(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """ Search repo by name

        Permission checking:
        1. all authenticated user can perform this action.
        """

        file_path = request.GET.get('file_path', '')
        if not file_path:
            error_msg = 'file_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        if not file_id:
            error_msg = 'File %s not found.' % file_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            records = get_file_operation_records(repo_id, file_path)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = []
        for record in records:
            info = {}
            info['username'] = record.username
            info['repo_id'] = record.repo_id
            info['operation'] = record.operation
            info['path'] = record.path
            info['other_path'] = record.other_path
            info['time'] = utc_datetime_to_isoformat_timestr(record.timestamp)
            result.append(info)

        return Response(result)

