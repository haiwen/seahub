import os
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.translation import ugettext_lazy as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, user_to_dict
from seahub.tags.models import FileUUIDMap, FileTag, Tags

from seaserv import seafile_api

logger = logging.getLogger(__name__)

def check_parameter(func):
    """chek if the param is given, check if the file or dir is exists, and split file_path to
    parent_path and filename
    """
    def _decorated(view, request, *args, **kwargs):
        file_path = None
        is_dir = None
        repo_id = kwargs.get('repo_id')
        if request.method == 'GET':
            file_path = request.GET.get('p', '')
            is_dir = request.GET.get('is_dir', '')
        elif request.method == 'POST':
            file_path = request.POST.get('p', '')
            is_dir = request.POST.get('is_dir', '')
        elif request.method == 'DELETE':
            file_path = request.GET.get('p', '')
            is_dir = request.GET.get('is_dir', '')
        if not file_path:
            error_msg = "p %s invalid." % file_path
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_dir = is_dir.lower()
        if is_dir not in ['true', 'false']:
            error_msg = 'is_dir %s invalid' % is_dir
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        #split file_path to  filename and parent_path
        #and check if the file is exists
        new_file_path = file_path.rstrip('/')
        parent_path = os.path.dirname(new_file_path)
        filename = os.path.basename(new_file_path)
        if is_dir == 'true':
            dir_id = seafile_api.get_dir_id_by_path(repo_id, new_file_path)
            if not dir_id:
                error_msg = _('Folder %s not found.' % file_path)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        else:
            if filename.strip() == '':
                error_msg = 'p %s invalid' % file_path
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            file_id = seafile_api.get_file_id_by_path(repo_id, new_file_path)
            if not file_id:
                error_msg = _('File %s not found.' % file_path)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = _('Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not repo:
            error_msg = _('Library %s not found.' % repo_id)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        #check whether the use can browse repo
        if not seafile_api.check_permission(repo_id, request.user.username):
            error_msg = _('Permission denied.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        kwargs['parent_path'] = parent_path
        kwargs['filename'] = filename
        kwargs['is_dir'] = is_dir
        return func(view, request, *args, **kwargs)
    return _decorated

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
    def post(self, request, repo_id, parent_path, filename, is_dir):
        name = request.POST.get('name', None)
        if not name or '/' in name:
            error_msg = _("Tag name %s invalid." % name)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        tag_obj, created = FileTag.objects.get_or_create_file_tag(
                repo_id,
                parent_path,
                filename,
                is_dir,
                name,
                request.user.username
                )
        if created:
            return Response(tag_obj.to_dict(), status=status.HTTP_201_CREATED)
        else:
            return Response(tag_obj.to_dict(), status=status.HTTP_200_OK)

class FileTagView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    @check_parameter
    def delete(self, request, repo_id, parent_path, filename, name, is_dir):
        if not name or '/' in name:
            error_msg = _("Tag name %s invalid." % name)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if FileTag.objects.delete_file_tag_by_path(repo_id,
                parent_path,filename,is_dir,name):
            return Response({"success": True}, status=status.HTTP_200_OK)
        else:
            return Response({"success": True}, status=status.HTTP_202_ACCEPTED)
