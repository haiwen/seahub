import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.organizations.models import OrgAdminSettings, DISABLE_ORG_USER_CLEAN_TRASH
from seahub.utils import is_valid_username
from seahub.utils.db_api import SeafileDB
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.group.utils import group_id_to_name

from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.organizations.views import org_user_exists
from constance import config

logger = logging.getLogger(__name__)

def get_trash_repo_info(repo):
    result = {}
    owner = repo.owner_id

    result['name'] = repo.repo_name
    result['id'] = repo.repo_id
    result['owner'] = owner
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
        """ List deleted repos (by team admin)

        Permission checking:
        1. only admin can perform this action.
        """

        org_id = int(org_id)
        # list by page
        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = (current_page - 1) * per_page
        limit = per_page + 1

        try:
            db_api = SeafileDB()
            repos_all = db_api.get_org_trash_repo_list(int(org_id), start, limit)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if len(repos_all) > per_page:
            repos_all = repos_all[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        return_results = []
        for repo in repos_all:
            repo_info = get_trash_repo_info(repo)
            return_results.append(repo_info)

        page_info = {
            'has_next_page': has_next_page,
            'current_page': current_page
        }

        return Response({"page_info": page_info, "repos": return_results})

    def delete(self, request, org_id):
        """ clean all deleted org libraries(by team admin)

        Permission checking:
        1. only org admin can perform this action.
        """

        org_id = int(org_id)
        if not config.ENABLE_USER_CLEAN_TRASH:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)


        if org_id and org_id > 0:
            disable_clean_trash = OrgAdminSettings.objects.filter(org_id=org_id, key=DISABLE_ORG_USER_CLEAN_TRASH).first()
            if (disable_clean_trash is not None) and int(disable_clean_trash.value):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        try:
            
            db_api = SeafileDB()
            db_api.empty_org_repo_trash(int(org_id))
        except Exception as e:
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
        1. only org admin can perform this action.
        """

        org_id = int(org_id)
        owner = seafile_api.get_trash_repo_owner(repo_id)
        if not owner:
            error_msg = "Library does not exist in trash."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if '@seafile_group' in owner:
            group_org_id = ccnet_api.get_org_id_by_group(int(owner.split('@')[0]))
            if group_org_id != org_id:
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
            group_org_id = ccnet_api.get_org_id_by_group(int(owner.split('@')[0]))
            if group_org_id != org_id:
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