import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.template.defaultfilters import filesizeformat

from seaserv import ccnet_api, seafile_api, seafserv_threaded_rpc

from seahub.views.ajax import get_related_users_by_org_repo, \
    get_related_users_by_repo
from seahub.signals import repo_deleted
from seahub.views import get_system_default_repo_id
from seahub.utils import is_org_context
from seahub.base.accounts import User
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

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
        return Response((page_info, return_results))

class AdminLibrary(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def delete(self, request, repo_id, format=None):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return Response({'success': True})

        if get_system_default_repo_id() == repo_id:
            error_msg = ('System library can not be deleted.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if is_org_context(request):
            org_id = seafserv_threaded_rpc.get_org_id_by_repo_id(repo_id)
            usernames = get_related_users_by_org_repo(org_id, repo_id)
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            org_id = -1
            usernames = get_related_users_by_repo(repo_id)
            repo_owner = seafile_api.get_repo_owner(repo_id)

        try:
            seafile_api.remove_repo(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        repo_deleted.send(sender=None, org_id=org_id, usernames=usernames,
                          repo_owner=repo_owner, repo_id=repo_id,
                          repo_name=repo.repo_name)

        return Response({'success': True})

    def put(self, request, repo_id, format=None):
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

        if is_org_context(request):
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

        seafile_api.set_repo_owner(repo_id, new_owner)
        repo = seafile_api.get_repo(repo_id)
        repo_info = get_repo_info(repo)

        return Response(repo_info)
