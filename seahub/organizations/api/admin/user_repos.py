# Copyright (c) 2012-2019 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from django.utils.translation import ugettext as _

from seaserv import ccnet_api, seafile_api

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils.repo import normalize_repo_status_code
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.group.utils import group_id_to_name


logger = logging.getLogger(__name__)


class OrgAdminUserRepos(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id, email):
        """Org admin list user owned repos

        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            err_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, err_msg)

        # permission check
        if not ccnet_api.org_user_exists(org_id, email):
            err_msg = _('User %s not found in organization.') % email
            return api_error(status.HTTP_404_NOT_FOUND, err_msg)

        # list repos
        repo_info_list = list()
        owned_repos = seafile_api.get_org_owned_repo_list(org_id, email)

        for r in owned_repos:
            # do not return virtual repos
            if r.is_virtual:
                continue

            repo_info = {
                "repo_id": r.id,
                "repo_name": r.name,
                "owner_email": email,
                "owner_name": email2nickname(email),
                "owner_contact_email": email2contact_email(email),
                "last_modified": timestamp_to_isoformat_timestr(r.last_modify),
                "modifier_email": r.last_modifier,
                "size": r.size,
                "encrypted": r.encrypted,
                "permission": 'rw',  # Always have read-write permission to owned repo
                "status": normalize_repo_status_code(r.status),
            }
            repo_info_list.append(repo_info)

        return Response({'repo_list': repo_info_list})


class OrgAdminUserBesharedRepos(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id, email):
        """Org admin list repos by shared to user

        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            err_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, err_msg)

        # permission check
        if not ccnet_api.org_user_exists(org_id, email):
            err_msg = _('User %s not found in organization.') % email
            return api_error(status.HTTP_404_NOT_FOUND, err_msg)

        # list beshared repos
        repo_info_list = list()
        beshared_repos = seafile_api.get_org_share_in_repo_list(org_id, email, -1, -1)

        for r in beshared_repos:
            owner_email = r.user

            group_name = ''
            is_group_owned_repo = False
            if '@seafile_group' in owner_email:
                is_group_owned_repo = True
                group_id = get_group_id_by_repo_owner(owner_email)
                group_name = group_id_to_name(group_id)

            owner_name = group_name if is_group_owned_repo else \
                email2nickname(owner_email)
            owner_contact_email = '' if is_group_owned_repo else \
                email2contact_email(owner_email)

            repo_info = {
                "repo_id": r.repo_id,
                "repo_name": r.repo_name,
                "last_modified": timestamp_to_isoformat_timestr(r.last_modify),
                "modifier_email": r.last_modifier,
                "owner_email": owner_email,
                "owner_name": owner_name,
                "owner_contact_email": owner_contact_email,
                "size": r.size,
                "encrypted": r.encrypted,
                "permission": r.permission,
                "status": normalize_repo_status_code(r.status),
            }
            repo_info_list.append(repo_info)

        return Response({'repo_list': repo_info_list})
