# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.template.defaultfilters import filesizeformat
from django.utils.translation import ugettext as _
from seaserv import ccnet_api, seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.accounts import User
from seahub.signals import repo_deleted
from seahub.views import get_system_default_repo_id
from seahub.admin_log.signals import admin_operation
from seahub.admin_log.models import REPO_CREATE, REPO_DELETE, REPO_TRANSFER
from seahub.share.models import FileShare, UploadLinkShare
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.group.utils import is_group_member, group_id_to_name
from seahub.utils.repo import get_related_users_by_repo

from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner

try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

logger = logging.getLogger(__name__)

def get_repo_info(repo):

    repo_owner = seafile_api.get_repo_owner(repo.repo_id)
    if not repo_owner:
        try:
            org_repo_owner = seafile_api.get_org_repo_owner(repo.repo_id)
        except Exception:
            org_repo_owner = None

    owner = repo_owner or org_repo_owner or ''

    result = {}
    result['id'] = repo.repo_id
    result['name'] = repo.repo_name
    result['owner'] = owner
    result['owner_email'] = owner
    result['owner_name'] = email2nickname(owner)
    result['owner_contact_email'] = email2contact_email(owner)
    result['size'] = repo.size
    result['size_formatted'] = filesizeformat(repo.size)
    result['encrypted'] = repo.encrypted
    result['file_count'] = repo.file_count

    if '@seafile_group' in owner:
        group_id = get_group_id_by_repo_owner(owner)
        result['group_name'] = group_id_to_name(group_id)

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
                if not repo.name or repo.is_virtual:
                    continue

                if repo_name in repo.name:
                    repo_info = get_repo_info(repo)
                    repos.append(repo_info)

            return Response({"name": repo_name, "owner": owner, "repos": repos})

        elif repo_name:
            # search by name(keyword in name)
            repos_all = seafile_api.get_repo_list(-1, -1)
            for repo in repos_all:
                if not repo.name or repo.is_virtual:
                    continue

                if repo_name in repo.name:
                    repo_info = get_repo_info(repo)
                    repos.append(repo_info)

            return Response({"name": repo_name, "owner": '', "repos": repos})

        elif owner:
            # search by owner
            owned_repos = seafile_api.get_owned_repo_list(owner)
            for repo in owned_repos:
                if repo.is_virtual:
                    continue

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

    def post(self, request):
        """ Admin create library

        Permission checking:
        1. only admin can perform this action.
        """

        repo_name = request.data.get('name', None)
        if not repo_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        username = request.user.username
        repo_owner = request.data.get('owner', None)
        if repo_owner:
            try:
                User.objects.get(email=repo_owner)
            except User.DoesNotExist:
                error_msg = 'User %s not found.' % repo_owner
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        else:
            repo_owner = username

        try:
            repo_id = seafile_api.create_repo(repo_name, '', repo_owner, None)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # send admin operation log signal
        admin_op_detail = {
            "id": repo_id,
            "name": repo_name,
            "owner": repo_owner,
        }
        admin_operation.send(sender=None, admin_name=request.user.username,
                operation=REPO_CREATE, detail=admin_op_detail)

        repo = seafile_api.get_repo(repo_id)
        repo_info = get_repo_info(repo)
        return Response(repo_info)

class AdminLibrary(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, repo_id, format=None):
        """ get info of a library

        Permission checking:
        1. only admin can perform this action.
        """
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_info = get_repo_info(repo)

        return Response(repo_info)

    def delete(self, request, repo_id, format=None):
        """ delete a library

        Permission checking:
        1. only admin can perform this action.
        """
        if get_system_default_repo_id() == repo_id:
            error_msg = _('System library can not be deleted.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            # for case of `seafile-data` has been damaged
            # no `repo object` will be returned from seafile api
            # delete the database record anyway
            try:
                seafile_api.remove_repo(repo_id)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            return Response({'success': True})

        repo_name = repo.name
        repo_owner = seafile_api.get_repo_owner(repo_id)
        if not repo_owner:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)

        try:
            seafile_api.remove_repo(repo_id)

            try:
                org_id = seafile_api.get_org_id_by_repo_id(repo_id)
                related_usernames = get_related_users_by_repo(repo_id,
                        org_id if org_id > 0 else None)
            except Exception as e:
                logger.error(e)
                org_id = -1
                related_usernames = []

            # send signal for seafevents
            repo_deleted.send(sender=None, org_id=-1, operator=request.user.username,
                    usernames=related_usernames, repo_owner=repo_owner,
                    repo_id=repo_id, repo_name=repo.name)

        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # send admin operation log signal
        admin_op_detail = {
            "id": repo_id,
            "name": repo_name,
            "owner": repo_owner,
        }
        admin_operation.send(sender=None, admin_name=request.user.username,
                operation=REPO_DELETE, detail=admin_op_detail)

        return Response({'success': True})

    def put(self, request, repo_id, format=None):
        """ transfer a library, rename a library

        Permission checking:
        1. only admin can perform this action.
        """
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        new_repo_name = request.data.get('name', None)
        if new_repo_name:
            try:
                res = seafile_api.edit_repo(repo_id, new_repo_name, '', None)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if res == -1:
                e = 'Admin rename failed: ID of library is %s, edit_repo api called failed.' % \
                        repo_id
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        new_owner = request.data.get('owner', None)
        if new_owner:
            try:
                new_owner_obj = User.objects.get(email=new_owner)
            except User.DoesNotExist:
                error_msg = 'User %s not found.' % new_owner
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if not new_owner_obj.permissions.can_add_repo():
                error_msg = 'Transfer failed: role of %s is %s, can not add library.' % \
                        (new_owner, new_owner_obj.role)
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if MULTI_TENANCY:
                try:
                    if seafile_api.get_org_id_by_repo_id(repo_id) > 0:
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

                if not is_group_member(shared_group_id, new_owner):
                    continue

                seafile_api.set_group_repo(repo_id, shared_group_id,
                        new_owner, shared_group.perm)

            # reshare repo to links
            try:
                UploadLinkShare.objects.filter(username=repo_owner, repo_id=repo_id).update(username=new_owner)
                FileShare.objects.filter(username=repo_owner, repo_id=repo_id).update(username=new_owner)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            # check if current repo is pub-repo
            # if YES, reshare current repo to public
            for pub_repo in pub_repos:
                if repo_id != pub_repo.id:
                    continue

                seafile_api.add_inner_pub_repo(repo_id, pub_repo.permission)

                break

            # send admin operation log signal
            admin_op_detail = {
                "id": repo_id,
                "name": repo.name,
                "from": repo_owner,
                "to": new_owner,
            }
            admin_operation.send(sender=None, admin_name=request.user.username,
                    operation=REPO_TRANSFER, detail=admin_op_detail)

        repo = seafile_api.get_repo(repo_id)
        repo_info = get_repo_info(repo)

        return Response(repo_info)
