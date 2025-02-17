# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

import seaserv
from seaserv import ccnet_api, seafile_api

from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.group.utils import group_id_to_name
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils import is_valid_email, transfer_repo
from seahub.signals import repo_deleted
from seahub.constants import PERMISSION_READ_WRITE
from seahub.views.file import send_file_access_msg

from seahub.organizations.views import is_org_repo, org_user_exists

from pysearpc import SearpcError


logger = logging.getLogger(__name__)


class OrgAdminRepos(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):
        """List organization libraries
        """

        order_by = request.GET.get('order_by', '').lower().strip()
        if order_by and order_by not in ('size', 'file_count'):
            error_msg = 'order_by invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # Make sure page request is an int. If not, deliver first page.
        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            current_page = 1
            per_page = 25

        if order_by:
            repos_all = seafile_api.get_org_repo_list(org_id,
                    per_page * (current_page - 1), per_page + 1, order_by)
        else:
            repos_all = seafile_api.get_org_repo_list(org_id,
                    per_page * (current_page - 1), per_page + 1)

        page_next = False
        if len(repos_all) == per_page + 1:
            page_next = True

        repos = repos_all[:per_page]
        repos = [r for r in repos if not r.is_virtual]

        # get repo id owner dict
        all_repo_owner = []
        repo_id_owner_dict = {}
        for repo in repos:
            if repo.id not in repo_id_owner_dict:
                repo_owner = seafile_api.get_org_repo_owner(repo.id)
                all_repo_owner.append(repo_owner)
                repo_id_owner_dict[repo.id] = repo_owner

        # Use dict to reduce memcache fetch cost in large for-loop.
        repo_owner_dict = {}
        for email in set(all_repo_owner):
            if email not in repo_owner_dict:
                repo_owner_dict[email] = {}
                if '@seafile_group' in email:
                    group_id = get_group_id_by_repo_owner(email)
                    group_name = group_id_to_name(group_id)
                    repo_owner_dict[email]['owner_name'] = group_name
                    repo_owner_dict[email]['group_id'] = group_id
                    repo_owner_dict[email]['is_department_repo'] = True

                else:
                    repo_owner_dict[email]['owner_name'] = email2nickname(email)
                    repo_owner_dict[email]['group_id'] = ''
                    repo_owner_dict[email]['is_department_repo'] = False

        repo_list = []
        for r in repos:
            repo = {}
            repo_owner = repo_id_owner_dict[r.id]
            repo['owner_email'] = repo_owner
            repo['owner_name'] = repo_owner_dict[repo_owner]['owner_name']
            repo['encrypted'] = r.encrypted
            repo['repo_id'] = r.id
            repo['repo_name'] = r.name
            repo['is_department_repo'] = repo_owner_dict[repo_owner]['is_department_repo']
            repo['group_id'] = repo_owner_dict[repo_owner]['group_id']
            repo['size'] = r.size
            repo['file_count'] = r.file_count

            repo_list.append(repo)

        return Response({
                'repo_list': repo_list,
                'page': current_page,
                'page_next': page_next,
                })

class OrgAdminRepo(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def put(self, request, org_id, repo_id):
        """Transfer an organization library
        """
        new_owner = request.data.get('email', None)
        is_share = request.data.get('reshare', False)
        if not new_owner:
            error_msg = 'Email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not is_valid_email(new_owner) and not '@seafile_group' in new_owner:
            error_msg = 'Email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission checking
        if '@seafile_group' not in new_owner:
            if not org_user_exists(org_id, new_owner):
                error_msg = 'User %s not in org %s.' % (new_owner, org_id)
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_org_repo(org_id, repo_id):
            error_msg = 'Library %s not in org %s.' % (repo_id, org_id)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = seafile_api.get_org_repo_owner(repo_id)

        # get all pub repos
        pub_repos = seafile_api.list_org_inner_pub_repos_by_owner(org_id, repo_owner)
        # transfer repo
        try:
            transfer_repo(repo_id, new_owner, is_share, org_id)
            # send stats message
            send_file_access_msg(request, repo, '/', 'web')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # check if current repo is pub-repo
        # if YES, reshare current repo to public
        for pub_repo in pub_repos:
            if repo_id != pub_repo.id:
                continue

            seafile_api.set_org_inner_pub_repo(org_id, repo_id, pub_repo.permission)

            break

        repo_info = {}
        
        repo_info['owner_email'] = new_owner
        if '@seafile_group' in new_owner:
            group_id = get_group_id_by_repo_owner(new_owner)
            repo_info['group_name'] = group_id_to_name(group_id)
            repo_info['owner_name'] = group_id_to_name(group_id)
        else:
            repo_info['owner_name'] = email2nickname(new_owner)
        repo_info['encrypted'] = repo.encrypted 
        repo_info['repo_id'] = repo.repo_id
        repo_info['repo_name'] = repo.name
        repo_info['is_department_repo'] = False
        repo_info['group_id'] = ''

        return Response(repo_info)


    def delete(self, request, org_id, repo_id):
        """Remove an organization library
        """
        # resource check

        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_org_repo(org_id, repo_id):
            error_msg = 'Library %s not in org %s.' % (repo_id, org_id)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        usernames = seaserv.get_related_users_by_org_repo(org_id, repo_id)
        repo_owner = seafile_api.get_org_repo_owner(repo_id)

        seafile_api.remove_repo(repo_id)

        repo_deleted.send(sender=None, operator=request.user.username,
                          org_id=org_id, usernames=usernames,
                          repo_owner=repo_owner, repo_id=repo_id,
                          repo_name=repo.name)

        return Response({'success': True})
