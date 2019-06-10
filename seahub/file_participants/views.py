# Copyright (c) 2012-2019 Seafile Ltd.
# -*- coding: utf-8 -*-
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsRepoAccessible
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, get_user_common_info
from .models import FileParticipant
from seahub.utils import normalize_file_path, is_valid_username
from seahub.views import check_folder_permission
from pysearpc import SearpcError
from seahub.base.accounts import User

logger = logging.getLogger(__name__)


class FileParticipantsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        """List all participants of a file.
        """
        # argument check
        path = request.GET.get('path', '/').rstrip('/')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid path.')
        path = normalize_file_path(path)

        # resource check
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal error.')
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # main
        participant_list = []
        participant_queryset = FileParticipant.objects.get_by_file_path(repo_id, path)

        for participant in participant_queryset:
            participant_info = get_user_common_info(participant.username)
            participant_list.append(participant_info)

        return Response({'participant_list': participant_list})

    def post(self, request, repo_id, format=None):
        """Post a participant of a file.
        """
        # argument check
        path = request.GET.get('path', '/').rstrip('/')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid path.')
        path = normalize_file_path(path)

        email = request.data.get('email', '').lower()
        if not email:
            email = request.user.username

        if not is_valid_username(email):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid email.')

        # resource check
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal error.')
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, 'User %s not found.' % email)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        request.user = user
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'User %s permission denied.' % email)

        # main
        if FileParticipant.objects.get_by_file_path_and_username(repo_id, path, email):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Participant %s already exists.' % email)

        FileParticipant.objects.add_by_file_path_and_username(repo_id, path, email)
        participant = get_user_common_info(email)

        return Response(participant, status=201)


class FileParticipantView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, repo_id, format=None):
        """Delete a participant
        """
        # argument check
        path = request.GET.get('path', '/').rstrip('/')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid path.')
        path = normalize_file_path(path)

        email = request.data.get('email', '').lower()
        if not email or not is_valid_username(email):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid email.')

        # resource check
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal error.')
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # main
        FileParticipant.objects.delete_by_file_path_and_username(repo_id, path, email)

        return Response({'success': True})
