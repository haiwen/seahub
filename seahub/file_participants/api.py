# Copyright (c) 2012-2019 Seafile Ltd.
# -*- coding: utf-8 -*-
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api
from django.utils.translation import ugettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, get_user_common_info
from .models import FileParticipant
from seahub.utils import normalize_file_path, is_valid_username
from seahub.views import check_folder_permission
from seahub.base.accounts import User
from seahub.tags.models import FileUUIDMap

logger = logging.getLogger(__name__)


class FileParticipantsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        """List all participants of a file.
        """
        # argument check
        path = request.GET.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid.')
        path = normalize_file_path(path)

        # resource check
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File %s not found.' % path)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # main
        try:
            file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap_by_path(repo_id, path, False)

            participant_list = []
            participant_queryset = FileParticipant.objects.get_participants(file_uuid)

            for participant in participant_queryset:
                participant_info = get_user_common_info(participant.username)
                participant_info['avatar_url'] = request.build_absolute_uri(participant_info['avatar_url'])
                participant_list.append(participant_info)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error.')

        return Response({'participant_list': participant_list})

    def post(self, request, repo_id, format=None):
        """Post a participant of a file.
        """
        # argument check
        path = request.data.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid.')
        path = normalize_file_path(path)

        email = request.data.get('email')
        if not email or not is_valid_username(email):
            return api_error(status.HTTP_400_BAD_REQUEST, 'email invalid.')

        # resource check
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File %s not found.' % path)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, 'User %s not found.' % email)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if not seafile_api.check_permission_by_path(repo_id, '/', user.username):
            return api_error(status.HTTP_403_FORBIDDEN, _('%s Permission denied.') % email)

        # main
        try:
            file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap_by_path(repo_id, path, False)

            if FileParticipant.objects.get_participant(file_uuid, email):
                return api_error(status.HTTP_409_CONFLICT, _('Participant %s already exists.') % email)

            FileParticipant.objects.add_participant(file_uuid, email)
            participant = get_user_common_info(email)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error.')

        return Response(participant, status=201)


class FileParticipantView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, repo_id, format=None):
        """Delete a participant
        """
        # argument check
        path = request.data.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid.')
        path = normalize_file_path(path)

        email = request.data.get('email')
        if not email or not is_valid_username(email):
            return api_error(status.HTTP_400_BAD_REQUEST, 'email invalid.')

        # resource check
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File %s not found.' % path)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # main
        try:
            file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap_by_path(repo_id, path, False)

            if not FileParticipant.objects.get_participant(file_uuid, email):
                return api_error(status.HTTP_404_NOT_FOUND, 'Participant %s not found.' % email)

            FileParticipant.objects.delete_participant(file_uuid, email)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error.')

        return Response({'success': True})
