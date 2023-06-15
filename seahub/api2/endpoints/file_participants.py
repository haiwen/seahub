# Copyright (c) 2012-2019 Seafile Ltd.
# -*- coding: utf-8 -*-
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api
from django.utils.translation import gettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, get_user_common_info
from seahub.file_participants.models import FileParticipant
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
                participant_list.append(participant_info)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'participant_list': participant_list})

    def post(self, request, repo_id, format=None):
        """batch add participants of a file.
        """
        # argument check
        path = request.data.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid.')
        path = normalize_file_path(path)

        emails = request.data.get('emails')
        if not emails or not isinstance(emails, list):
            return api_error(status.HTTP_400_BAD_REQUEST, 'emails invalid.')
        emails = list(set(emails))

        # resource check
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File %s not found.' % path)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # batch add
        success = list()
        failed = list()

        try:
            uuid = FileUUIDMap.objects.get_or_create_fileuuidmap_by_path(repo_id, path, False)
            participants_queryset = FileParticipant.objects.get_participants(uuid)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        for email in emails:
            if not is_valid_username(email):
                error_dic = {'email': email, 'error_msg': 'email invalid.', 'error_code': 400}
                failed.append(error_dic)
                continue

            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                error_dic = {'email': email, 'error_msg': 'User not found.', 'error_code': 404}
                failed.append(error_dic)
                continue

            # permission check
            if not seafile_api.check_permission_by_path(repo_id, '/', user.username):
                error_dic = {'email': email, 'error_msg': _('Permission denied.'), 'error_code': 403}
                failed.append(error_dic)
                continue

            # main
            try:
                if participants_queryset.filter(uuid=uuid, username=email).count() > 0:
                    error_dic = {'email': email, 'error_msg': _('The participant already exists.'), 'error_code': 409}
                    failed.append(error_dic)
                    continue

                FileParticipant.objects.add_participant(uuid, email)
                participant = get_user_common_info(email)
                success.append(participant)
            except Exception as e:
                logger.error(e)
                error_dic = {'email': email, 'error_msg': _('Internal Server Error'), 'error_code': 500}
                failed.append(error_dic)
                continue

        return Response({'success': success, 'failed': failed})


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
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})
