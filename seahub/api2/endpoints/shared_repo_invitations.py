# Copyright (c) 2012-2019 Seafile Ltd.

import logging

from django.utils.translation import ugettext as _
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from post_office.models import STATUS

from seaserv import seafile_api

from seahub.utils import is_org_context
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import CanInviteGuest
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.accounts import User
from seahub.utils import is_valid_email
from seahub.invitations.models import Invitation, SharedRepoInvitation
from seahub.invitations.utils import block_accepter
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE, \
        PERMISSION_ADMIN
from seahub.share.utils import is_repo_admin

json_content_type = 'application/json; charset=utf-8'
logger = logging.getLogger(__name__)

class SharedRepoInvitationsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanInviteGuest)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        """ List invitations by shared repo.
        """
        # argument check
        path = request.GET.get('p', '/')

        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        # permission check
        username = request.user.username
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if username != repo_owner and not is_repo_admin(username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # main
        shared_list = list()
        try:
            shared_queryset = SharedRepoInvitation.objects.list_by_repo_id_and_path(repo_id, path)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        for obj in shared_queryset:
            data = obj.invitation.to_dict()
            data['permission'] = obj.permission

            shared_list.append(data)

        return Response({'shared_invitation_list': shared_list})


class SharedRepoInvitationsBatchView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanInviteGuest)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id, format=None):
        """ repo shared in batches to inviters
        """
        # argument check
        path = request.data.get('path', '/')

        itype = request.data.get('type', '').lower()
        if not itype or itype != 'guest':
            return api_error(status.HTTP_400_BAD_REQUEST, 'type invalid.')

        accepters = request.data.get('accepters', None)
        if not accepters:
            return api_error(status.HTTP_400_BAD_REQUEST, 'accepters invalid.')

        permission = request.data.get('permission', PERMISSION_READ)
        if permission not in (PERMISSION_READ, PERMISSION_READ_WRITE):
            return api_error(status.HTTP_400_BAD_REQUEST, 'permission invalid.')

        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        # permission check
        username = request.user.username
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if username != repo_owner and not is_repo_admin(username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        # main
        result = {}
        result['failed'] = []
        result['success'] = []

        try:
            invitation_queryset = Invitation.objects.order_by('-invite_time').filter(
                    inviter=request.user.username, accept_time=None)
            shared_queryset = SharedRepoInvitation.objects.list_by_repo_id_and_path(
                repo_id=repo_id, path=path)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        for accepter in accepters:

            if not accepter.strip():
                continue

            accepter = accepter.lower()

            if not is_valid_email(accepter):
                result['failed'].append({
                    'email': accepter,
                    'error_msg': _('Email %s invalid.') % accepter
                    })
                continue

            if block_accepter(accepter):
                result['failed'].append({
                    'email': accepter,
                    'error_msg': _('The email address is not allowed to be invited as a guest.')
                    })
                continue

            try:
                user = User.objects.get(accepter)
                # user is active return exist
                if user.is_active is True:
                    result['failed'].append({
                        'email': accepter,
                        'error_msg': _('User %s already exists.') % accepter
                        })
                    continue
            except User.DoesNotExist:
                pass
            
            if invitation_queryset.filter(accepter=accepter).exists():
                invitation_obj = invitation_queryset.filter(accepter=accepter)[0]
            else:
                invitation_obj = Invitation.objects.add(
                    inviter=request.user.username, accepter=accepter)

            if shared_queryset.filter(invitation=invitation_obj).exists():
                    result['failed'].append({
                        'email': accepter,
                        'error_msg': _('This item has been shared to %s.') % accepter
                    })
                    continue
            
            try:
                SharedRepoInvitation.objects.add(
                    invitation=invitation_obj, repo_id=repo_id, path=path, permission=permission)
            except Exception as e:
                logger.error(e)
                result['failed'].append({
                    'email': accepter,
                    'error_msg': _('Internal Server Error'),
                })
                
            data = invitation_obj.to_dict()
            data['permission'] = permission
            result['success'].append(data)

            m = invitation_obj.send_to(email=accepter)
            if m.status != STATUS.sent:
                result['failed'].append({
                    'email': accepter,
                    'error_msg': _('Failed to send email, email service is not properly configured, please contact administrator.'),
                })

        return Response(result)
