# -*- coding: utf-8 -*-
import os
import json
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import gettext as _

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.utils import api_error, to_python_boolean
from seahub.utils import get_virus_files, get_virus_file_by_vid, delete_virus_file, operate_virus_file

logger = logging.getLogger(__name__)


class AdminVirusFilesView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """get virus files
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            page = int(request.GET.get('page', ''))
        except ValueError:
            page = 1

        try:
            per_page = int(request.GET.get('per_page', ''))
        except ValueError:
            per_page = 25

        try:
            has_handled = to_python_boolean(request.GET.get('has_handled', ''))
        except ValueError:
            has_handled = None

        start = (page - 1) * per_page
        count = per_page + 1

        try:
            virus_files = get_virus_files(has_handled=has_handled, start=start, limit=count)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if len(virus_files) > per_page:
            virus_files = virus_files[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        virus_file_list = list()
        for virus_file in virus_files:
            try:
                repo = seafile_api.get_repo(virus_file.repo_id)
                repo_owner = seafile_api.get_repo_owner(virus_file.repo_id)
            except Exception as e:
                logger.error(e)
                continue

            if not repo:
                continue
            else:
                record = dict()
                record["repo_name"] = repo.name
                record["repo_owner"] = repo_owner
                record["file_path"] = virus_file.file_path
                record["has_deleted"] = virus_file.has_deleted
                record["has_ignored"] = virus_file.has_ignored
                record["virus_id"] = virus_file.vid
                virus_file_list.append(record)

        return Response({"virus_file_list": virus_file_list, "has_next_page": has_next_page}, status=status.HTTP_200_OK)


class AdminVirusFileView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, virus_id):
        """delete virus file
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        virus_file = get_virus_file_by_vid(virus_id)
        if not virus_file:
            error_msg = 'Virus file %s not found.' % virus_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = os.path.dirname(virus_file.file_path)
        filename = os.path.basename(virus_file.file_path)
        try:
            seafile_api.del_file(virus_file.repo_id, parent_dir,
                                 json.dumps([filename]),
                                 request.user.username)
            delete_virus_file(virus_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True}, status=status.HTTP_200_OK)

    def put(self, request, virus_id):
        """ignore or un-ignore virus file
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        ignore = request.data.get('ignore')
        if ignore not in ('true', 'false'):
            error_msg = 'ignore invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        ignore = to_python_boolean(ignore)

        virus_file = get_virus_file_by_vid(virus_id)
        if not virus_file:
            error_msg = 'Virus file %s not found.' % virus_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            operate_virus_file(virus_id, ignore)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        virus_file = get_virus_file_by_vid(virus_id)

        repo = seafile_api.get_repo(virus_file.repo_id)
        repo_owner = seafile_api.get_repo_owner(virus_file.repo_id)
        res = dict(repo_name=repo.name)
        res["repo_owner"] = repo_owner
        res["file_path"] = virus_file.file_path
        res["has_deleted"] = virus_file.has_deleted
        res["has_ignored"] = virus_file.has_ignored
        res["virus_id"] = virus_file.vid

        return Response({"virus_file": res}, status=status.HTTP_200_OK)


class AdminVirusFilesBatchView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """ Delete virus files, ignore or cancel ignore virus files, in batch.

        Permission checking:
        1. admin user.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        virus_ids = request.POST.getlist('virus_ids', None)
        if not virus_ids:
            error_msg = 'virus_ids invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = request.POST.get('operation', None)
        if operation not in ('delete-virus', 'ignore-virus', 'cancel-ignore-virus'):
            error_msg = "operation can only be 'delete-virus', 'ignore-virus' or 'cancel-ignore-virus'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = dict(failed=[])
        result['success'] = []

        virus_files = []
        for virus_id in virus_ids:
            virus_file = get_virus_file_by_vid(int(virus_id))
            if virus_file:
                virus_files.append(virus_file)
            else:
                result['failed'].append({
                    'virus_id': virus_id,
                    'error_msg': _('Virus file is not found.')
                })
                continue

        if operation == 'delete-virus':
            for virus_file in virus_files:
                parent_dir = os.path.dirname(virus_file.file_path)
                filename = os.path.basename(virus_file.file_path)
                virus_id = int(virus_file.vid)
                try:
                    seafile_api.del_file(virus_file.repo_id, parent_dir,
                                         json.dumps([filename]),
                                         request.user.username)
                    delete_virus_file(virus_id)
                except Exception as e:
                    logger.error(e)
                    result['failed'].append({
                        'virus_id': virus_id,
                        'error_msg': _('Internal Server Error')
                    })
                    continue

                result['success'].append({'virus_id': virus_id})

        if operation == 'ignore-virus':
            for virus_file in virus_files:
                virus_id = int(virus_file.vid)
                try:
                    operate_virus_file(virus_id, True)
                except Exception as e:
                    logger.error(e)
                    result['failed'].append({
                        'virus_id': virus_id,
                        'error_msg': _('Internal Server Error')
                    })
                    continue

                result['success'].append({'virus_id': virus_id})

        if operation == 'cancel-ignore-virus':
            for virus_file in virus_files:
                virus_id = int(virus_file.vid)
                try:
                    operate_virus_file(virus_id, False)
                except Exception as e:
                    logger.error(e)
                    result['failed'].append({
                        'virus_id': virus_id,
                        'error_msg': _('Internal Server Error')
                    })
                    continue

                result['success'].append({'virus_id': virus_id})

        return Response(result)
