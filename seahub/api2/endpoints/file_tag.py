import os
import re
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.translation import gettext_lazy as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean
from seahub.tags.models import FileTag
from seahub.file_tags.models import FileTags
from seahub.repo_tags.models import RepoTags
from seahub.utils import normalize_file_path
from seahub.constants import PERMISSION_READ_WRITE
from seahub.views import check_folder_permission

from seaserv import seafile_api

logger = logging.getLogger(__name__)


class RepoFileTagsView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """list all tags of a file.
        """
        # argument check
        file_path = request.GET.get('file_path')
        if not file_path:
            error_msg = 'file_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        file_path = normalize_file_path(file_path)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        if not file_id:
            error_msg = 'File not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            file_tags = FileTags.objects.get_file_tag_by_path(repo_id, file_path)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"file_tags": file_tags}, status=status.HTTP_200_OK)

    def post(self, request, repo_id):
        """add a tag for a file.
        """
        # argument check
        file_path = request.data.get('file_path')
        if not file_path:
            error_msg = 'file_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        file_path = normalize_file_path(file_path)
        repo_tag_id = request.data.get('repo_tag_id')

        if not repo_tag_id:
            error_msg = 'repo_tag_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        if not file_id:
            error_msg = 'File not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_tag = RepoTags.objects.get_repo_tag_by_id(repo_tag_id)
        if not repo_tag:
            error_msg = 'repo_tag not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_tag = FileTags.objects.get_file_tag(repo_id, repo_tag_id, file_path)
        if file_tag:
            error_msg = 'file tag %s already exist.' % repo_tag_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, '/') != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        try:
            file_tag = FileTags.objects.add_file_tag(repo_id, repo_tag_id, file_path)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"file_tag": file_tag.to_dict()}, status=status.HTTP_201_CREATED)


class RepoFileTagView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, repo_id, file_tag_id):
        """delete a tag from a file
        """
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_tag = FileTags.objects.get_file_tag_by_id(file_tag_id)
        if not file_tag:
            error_msg = 'file_tag %s not found.' % file_tag_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, '/') != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        try:
            FileTags.objects.delete_file_tag(file_tag_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": "true"}, status=status.HTTP_200_OK)


# Deprecated
def check_parameter(func):
    """check if the param is given, check if the file or dir exists, and split file_path to
    parent_path and filename
    """
    def _decorated(view, request, *args, **kwargs):
        file_path = None
        is_dir = None
        repo_id = kwargs.get('repo_id')
        if request.method == 'GET':
            file_path = request.GET.get('path', '')
            is_dir = request.GET.get('is_dir', '')
        elif request.method in ['POST', 'PUT']:
            file_path = request.data.get('path', '')
            is_dir = request.data.get('is_dir', '')
        elif request.method == 'DELETE':
            file_path = request.GET.get('path', '')
            is_dir = request.GET.get('is_dir', '')

        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = _('Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not file_path:
            error_msg = "p %s invalid." % file_path
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            is_dir = to_python_boolean(is_dir)
        except ValueError:
            error_msg = 'is_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # split file_path to filename and parent_path
        # and check if the file exists
        new_file_path = file_path.rstrip('/')
        parent_path = os.path.dirname(new_file_path)
        filename = os.path.basename(new_file_path)
        if is_dir:
            dir_id = seafile_api.get_dir_id_by_path(repo_id, new_file_path)
            if not dir_id:
                error_msg = 'Folder %s not found.' % file_path
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if check_folder_permission(request, repo_id, new_file_path) != 'rw':
                error_msg = _('Permission denied.')
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        else:
            if filename.strip() == '':
                error_msg = 'p %s invalid' % file_path
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            file_id = seafile_api.get_file_id_by_path(repo_id, new_file_path)
            if not file_id:
                error_msg = 'File %s not found.' % file_path
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if check_folder_permission(request, repo_id, parent_path) != 'rw':
                error_msg = _('Permission denied.')
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        kwargs['parent_path'] = parent_path
        kwargs['filename'] = filename
        kwargs['is_dir'] = is_dir
        return func(view, request, *args, **kwargs)
    return _decorated

def check_tagname(tagname):
    return True if re.match('^[\.\w-]+$', tagname, re.U) else False

class FileTagsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    @check_parameter
    def get(self, request, repo_id, parent_path, filename, is_dir):
        tag_list = FileTag.objects.get_all_file_tag_by_path(
                repo_id, parent_path,
                filename, is_dir
                )
        tag_list = [tag.to_dict() for tag in tag_list]
        return Response({"tags": tag_list}, status=status.HTTP_200_OK)

    @check_parameter
    def put(self, request, repo_id, parent_path, filename, is_dir):
        names = request.data.get('names', None)
        if names is None:
            error_msg = "Tag can not be empty"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        res_tag_list = []
        if not names.strip():
            name_list = []
        else:
            name_list = [name.strip() for name in names.split(",")]
            for name in name_list:
                if not check_tagname(name):
                    error_msg = _('Tag can only contain letters, numbers, dot, hyphen or underscore.')
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        FileTag.objects.delete_all_filetag_by_path(repo_id, parent_path,
                                                  filename, is_dir)
        for name in name_list:
            tag_obj, created = FileTag.objects.get_or_create_file_tag(
                    repo_id, parent_path, filename, is_dir, name,
                    request.user.username
            )
            res_tag_list.append(tag_obj.to_dict())

        return Response({"tags": res_tag_list}, status=status.HTTP_200_OK)

    @check_parameter
    def post(self, request, repo_id, parent_path, filename, is_dir):
        names = request.POST.get('names', None)
        if names is None or not names.strip():
            error_msg = "Tag can not be empty"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        name_list = [name.strip() for name in names.split(",")]
        for name in name_list:
            if not check_tagname(name):
                error_msg = _('Tag can only contain letters, numbers, dot, hyphen or underscore.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        res_tag_list = []
        for name in name_list:
            tag_obj, created = FileTag.objects.get_or_create_file_tag(
                    repo_id, parent_path, filename, is_dir, name,
                    request.user.username
            )
            res_tag_list.append(tag_obj.to_dict())
        return Response({"tags": res_tag_list}, status=status.HTTP_200_OK)

class FileTagView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    @check_parameter
    def delete(self, request, repo_id, parent_path, filename, name, is_dir):
        if not name or not check_tagname(name):
            error_msg = _('Tag can only contain letters, numbers, dot, hyphen or underscore.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if FileTag.objects.delete_file_tag_by_path(repo_id,
                parent_path, filename, is_dir, name):
            return Response({"success": True}, status=status.HTTP_200_OK)
        else:
            return Response({"success": True}, status=status.HTTP_202_ACCEPTED)
