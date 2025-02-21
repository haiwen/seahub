# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.template.defaultfilters import filesizeformat
from django.utils.translation import gettext as _
import seaserv
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
from seahub.utils.repo import get_related_users_by_repo, normalize_repo_status_code, normalize_repo_status_str
from seahub.utils import is_valid_dirent_name, is_valid_email, transfer_repo
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.constants import PERMISSION_READ_WRITE
from seahub.base.models import FileTransfer

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
    result['owner_contact_email'] = email2contact_email(owner)
    result['size'] = repo.size
    result['size_formatted'] = filesizeformat(repo.size)
    result['encrypted'] = repo.encrypted
    result['file_count'] = repo.file_count
    result['status'] = normalize_repo_status_code(repo.status)
    result['last_modified'] = timestamp_to_isoformat_timestr(repo.last_modified)

    if '@seafile_group' in owner:
        group_id = get_group_id_by_repo_owner(owner)
        result['group_name'] = group_id_to_name(group_id)
        result['owner_name'] = group_id_to_name(group_id)
    else:
        result['owner_name'] = email2nickname(owner)

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

        if not request.user.admin_permissions.can_manage_library():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        order_by = request.GET.get('order_by', '').lower().strip()
        if order_by and order_by not in ('size', 'file_count'):
            error_msg = 'order_by invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # search libraries (by name/owner)
        repo_name = request.GET.get('name', '')
        owner = request.GET.get('owner', '')
        repos = []
        if repo_name and owner:
            # search by name and owner
            orgs = ccnet_api.get_orgs_by_user(owner)
            if orgs:
                org_id = orgs[0].org_id
                owned_repos = seafile_api.get_org_owned_repo_list(org_id, owner)
            else:
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
            orgs = ccnet_api.get_orgs_by_user(owner)
            if orgs:
                org_id = orgs[0].org_id
                owned_repos = seafile_api.get_org_owned_repo_list(org_id, owner)
            else:
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

        if order_by:
            repos_all = seafile_api.get_repo_list(start, limit, order_by)
        else:
            repos_all = seafile_api.get_repo_list(start, limit)

        if len(repos_all) > per_page:
            repos_all = repos_all[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        default_repo_id = get_system_default_repo_id()
        repos_all = [r for r in repos_all if not r.is_virtual]
        repos_all = [r for r in repos_all if r.repo_id != default_repo_id]

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
        if not request.user.admin_permissions.can_manage_library():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        repo_name = request.data.get('name', None)
        if not repo_name or not is_valid_dirent_name(repo_name):
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
            repo_id = seafile_api.create_repo(repo_name, '', repo_owner)
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

        if not request.user.admin_permissions.can_manage_library():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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

        if not request.user.admin_permissions.can_manage_library():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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
                        org_id if org_id and org_id > 0 else None)
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
        """ update a library status, transfer a library, rename a library

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_library():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        new_status = request.data.get('status', None)
        if new_status:
            if new_status not in ('normal', 'read-only'):
                error_msg = 'status invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        new_repo_name = request.data.get('name', None)
        if new_repo_name:
            if not is_valid_dirent_name(new_repo_name):
                error_msg = 'name invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        new_owner = request.data.get('owner', None)
        if new_owner:
            if not is_valid_email(new_owner) and '@seafile_group' not in new_owner:
                error_msg = 'owner invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_share = request.data.get('reshare', False)
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if new_status:
            try:
                seafile_api.set_repo_status(repo_id, normalize_repo_status_str(new_status))
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

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

        if new_owner:
            try:
                new_owner_obj = User.objects.get(email=new_owner)
            except User.DoesNotExist:
                error_msg = 'User %s not found.' % new_owner
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if not new_owner_obj.permissions.can_add_repo():
                error_msg = _('Transfer failed: role of %s is %s, can not add library.') % \
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
                    if '@seafile_group' in new_owner:
                        group_id = int(new_owner.split('@')[0])
                        if seaserv.is_org_group(group_id):
                            error_msg = 'Can not transfer library to an organization department %s' % new_owner
                            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
                except Exception as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            repo_owner = seafile_api.get_repo_owner(repo_id)

            if new_owner == repo_owner:
                error_msg = _("Library can not be transferred to owner.")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # get all pub repos
            pub_repos = []
            if not request.cloud_mode:
                pub_repos = seafile_api.list_inner_pub_repos_by_owner(repo_owner)

            # transfer repo
            try:
                transfer_repo(repo_id, new_owner, is_share)
                FileTransfer.objects.create(from_user=repo_owner,
                                            to=new_owner,
                                            repo_id=repo_id,
                                            org_id=-1,
                                            operator=request.user.username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

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


class AdminSearchLibrary(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, format=None):
        """ Search library by name or id.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_library():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        query_str = request.GET.get('query', '').lower().strip()
        if not query_str:
            error_msg = 'query invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            current_page = 1
            per_page = 25

        start = (current_page - 1) * per_page
        end = current_page * per_page
        limit = per_page + 1

        repos = seafile_api.search_repos_by_name(query_str)
        repos_count = len(repos)
        if repos_count > end:
            repos = repos[start: end]
            has_next_page = True
        else:
            if start - repos_count > 0:
                repos = list()
                start = start - repos_count
            else:
                repos = repos[start: end]
                start = 0

            repos += seafile_api.get_repos_by_id_prefix(query_str, start, limit)
            if len(repos) > per_page:
                repos = repos[:per_page]
                has_next_page = True
            else:
                has_next_page = False

        default_repo_id = get_system_default_repo_id()
        repos = [r for r in repos if not r.is_virtual]
        repos = [r for r in repos if r.repo_id != default_repo_id]

        email_dict = {}
        name_dict = {}
        contact_email_dict = {}
        for repo in repos:

            # get owner email
            repo_id = repo.repo_id
            repo_owner = seafile_api.get_repo_owner(repo_id)
            if not repo_owner:
                try:
                    org_repo_owner = seafile_api.get_org_repo_owner(repo_id)
                except Exception:
                    org_repo_owner = ''

            owner_email = repo_owner or org_repo_owner or ''
            if repo_id not in email_dict:
                email_dict[repo_id] = owner_email

            # get owner name
            if repo_id not in name_dict:

                # is department library
                if '@seafile_group' in owner_email:
                    group_id = get_group_id_by_repo_owner(owner_email)
                    owner_name = group_id_to_name(group_id)
                else:
                    owner_name = email2nickname(owner_email)

                name_dict[repo_id] = owner_name

            # get owner contact_email
            if repo_id not in contact_email_dict:

                if '@seafile_group' in owner_email:
                    owner_contact_email = ''
                else:
                    owner_contact_email = email2contact_email(owner_email)

                contact_email_dict[repo_id] = owner_contact_email

        result = []
        for repo in repos:

            info = dict()
            info['id'] = repo.repo_id
            info['name'] = repo.repo_name

            info['owner_email'] = email_dict.get(repo.repo_id, '')
            info['owner_name'] = name_dict.get(repo.repo_id, '')
            info['owner_contact_email'] = contact_email_dict.get(repo.repo_id, '')

            info['size'] = repo.size
            info['encrypted'] = repo.encrypted
            info['file_count'] = repo.file_count
            info['status'] = normalize_repo_status_code(repo.status)

            result.append(info)

        page_info = {
            'has_next_page': has_next_page,
            'current_page': current_page
        }
        return Response({"repo_list": result, "page_info": page_info})
