import os
import json
import logging
import requests
import posixpath
from datetime import datetime

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from django.utils.translation import gettext as _
from django.http import HttpResponseRedirect, HttpResponse
from django.core.files.base import ContentFile

from seaserv import seafile_api, check_quota

from seahub.views import check_folder_permission
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.seadoc.utils import is_valid_seadoc_access_token, get_seadoc_upload_link, \
    get_seadoc_download_link, get_seadoc_file_uuid, gen_seadoc_access_token, \
    gen_seadoc_image_parent_path, get_seadoc_asset_upload_link, get_seadoc_asset_download_link, \
    can_access_seadoc_asset
from seahub.utils.file_types import SEADOC, IMAGE
from seahub.utils import get_file_type_and_ext, normalize_file_path, PREVIEW_FILEEXT, get_file_history, \
    gen_inner_file_get_url, gen_inner_file_upload_url
from seahub.tags.models import FileUUIDMap
from seahub.utils.error_msg import file_type_error_msg
from seahub.utils.repo import parse_repo_perm
from seahub.utils.file_revisions import get_file_revisions_within_limit
from seahub.seadoc.db import list_seadoc_history_name, update_seadoc_history_name
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils.timeutils import utc_datetime_to_isoformat_timestr, timestamp_to_isoformat_timestr


logger = logging.getLogger(__name__)


class SeadocAccessToken(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        username = request.user.username
        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)
        filename = os.path.basename(path)

        filetype, fileext = get_file_type_and_ext(filename)
        if filetype != SEADOC:
            error_msg = 'seadoc file type %s invalid.' % filetype
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            obj_id = seafile_api.get_file_id_by_path(repo_id, path)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not obj_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, parent_dir)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        #
        file_uuid = get_seadoc_file_uuid(repo, path)
        access_token = gen_seadoc_access_token(file_uuid, filename, username, permission=permission)

        return Response({'access_token': access_token})


class SeadocUploadFile(APIView):

    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def post(self, request, file_uuid):
        # jwt permission check
        auth = request.headers.get('authorization', '').split()
        if not is_valid_seadoc_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        file = request.FILES.get('file', None)
        if not file:
            error_msg = 'file not found.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'seadoc uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        filetype, fileext = get_file_type_and_ext(uuid_map.filename)
        if filetype != SEADOC:
            error_msg = 'seadoc file type %s invalid.' % filetype
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_path = posixpath.join(uuid_map.parent_path, uuid_map.filename)
        file_id = seafile_api.get_file_id_by_path(uuid_map.repo_id, file_path)
        if not file_id:  # save file anyway
            seafile_api.post_empty_file(
                uuid_map.repo_id, uuid_map.parent_path, uuid_map.filename, '')
        #
        last_modify_user = request.POST.get('last_modify_user', '')
        upload_link = get_seadoc_upload_link(uuid_map, last_modify_user)
        if not upload_link:
            error_msg = 'seadoc file %s not found.' % uuid_map.filename
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # update file
        files = {
            'file': file,
            'file_name': uuid_map.filename,
            'target_file': file_path,
        }
        requests.post(upload_link, files=files)

        return Response({'success': True})


class SeadocUploadLink(APIView):

    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid):
        # jwt permission check
        auth = request.headers.get('authorization', '').split()
        if not is_valid_seadoc_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'seadoc uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        filetype, fileext = get_file_type_and_ext(uuid_map.filename)
        if filetype != SEADOC:
            error_msg = 'seadoc file type %s invalid.' % filetype
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_path = posixpath.join(uuid_map.parent_path, uuid_map.filename)
        file_id = seafile_api.get_file_id_by_path(uuid_map.repo_id, file_path)
        if not file_id:  # save file anyway
            seafile_api.post_empty_file(
                uuid_map.repo_id, uuid_map.parent_path, uuid_map.filename, '')

        upload_link = get_seadoc_upload_link(uuid_map)
        if not upload_link:
            error_msg = 'seadoc file %s not found.' % uuid_map.filename
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return Response({
            'upload_link': upload_link,
            'parent_dir': uuid_map.parent_path,
            'filename': uuid_map.filename,
        })


class SeadocDownloadLink(APIView):

    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid):
        # jwt permission check
        auth = request.headers.get('authorization', '').split()
        if not is_valid_seadoc_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'seadoc uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        filetype, fileext = get_file_type_and_ext(uuid_map.filename)
        if filetype != SEADOC:
            error_msg = 'seadoc file type %s invalid.' % filetype
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        #
        download_link = get_seadoc_download_link(uuid_map)
        if not download_link:
            error_msg = 'seadoc file %s not found.' % uuid_map.filename
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return Response({'download_link': download_link})


class SeadocUploadImage(APIView):

    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def post(self, request, file_uuid):
        """image path: /images/sdoc/${sdocUuid}/${filename}
        """
        # jwt permission check
        auth = request.headers.get('authorization', '').split()
        is_valid, payload = is_valid_seadoc_access_token(auth, file_uuid, return_payload=True)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        file = request.FILES.get('file')
        if not file:
            error_msg = 'Image can not be found.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_type, ext = get_file_type_and_ext(file.name)
        if file_type != IMAGE:
            error_msg = file_type_error_msg(ext, PREVIEW_FILEEXT.get('Image'))
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'seadoc uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if check_quota(uuid_map.repo_id) < 0:
            error_msg = _("Out of quota.")
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # main
        repo_id = uuid_map.repo_id
        username = payload.get('username', '')
        parent_path = gen_seadoc_image_parent_path(file_uuid, repo_id, username)
        file_path = posixpath.join(parent_path, file.name)

        upload_link = get_seadoc_asset_upload_link(repo_id, parent_path, username)
        files = {
            'file': file,
            'file_name': file.name,
            'target_file': file_path,
        }
        data = {'parent_dir': parent_path}
        resp = requests.post(upload_link, files=files, data=data)
        image_url = '/' + file.name
        return Response({'relative_path': image_url})


class SeadocDownloadImage(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = ()
    throttle_classes = (UserRateThrottle, )

    def get(self, request, file_uuid, filename):
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'seadoc uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = uuid_map.repo_id
        username = request.user.username
        # permission check
        file_path = posixpath.join(uuid_map.parent_path, uuid_map.filename)
        if not can_access_seadoc_asset(request, repo_id, file_path, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # main
        parent_path = gen_seadoc_image_parent_path(file_uuid, repo_id, username)
        download_link = get_seadoc_asset_download_link(repo_id, parent_path, filename, username)
        if not download_link:
            error_msg = 'file %s not found.' % filename
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        resp = requests.get(download_link)
        filetype, fileext = get_file_type_and_ext(filename)
        return HttpResponse(
            content=resp.content, content_type='image/' + fileext)


class SeadocCopyHistoryFile(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def post(self, request, repo_id):
        username = request.user.username
        obj_id = request.data.get('obj_id', '')
        path = request.data.get('p', '')
        ctime = request.data.get('ctime', '')

        # only check the permissions at the repo level
        # to prevent file can not be copied on the history page
        if not parse_repo_perm(check_folder_permission(request, repo_id, '/')).can_copy:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # new file name
        file_name = os.path.basename(path.rstrip('/'))
        parent_dir = os.path.dirname(path)
        new_file_name = '.'.join(file_name.split('.')[0:-1]) + \
            '(' + str(ctime) + ').' + file_name.split('.')[-1]
        new_file_path = posixpath.join(parent_dir, new_file_name)

        # download
        token = seafile_api.get_fileserver_access_token(repo_id,
                obj_id, 'download', username)
        if not token:
            error_msg = 'file %s not found.' % obj_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        download_url = gen_inner_file_get_url(token, file_name)
        resp = requests.get(download_url)
        content = resp.content
        file = ContentFile(content)
        file.name = new_file_name

        # upload
        obj_id = json.dumps({'parent_dir': parent_dir})
        token = seafile_api.get_fileserver_access_token(
            repo_id, obj_id, 'upload-link', username, use_onetime=True)
        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        upload_link = gen_inner_file_upload_url('upload-api', token)
        files = {
            'file': file,
            'file_name': new_file_name,
            'target_file': new_file_path,
        }
        data = {'parent_dir': parent_dir}
        resp = requests.post(upload_link, files=files, data=data)
        if not resp.ok:
            logger.error(resp.text)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({
            'file_name': new_file_name,
            'file_path': new_file_path,
        })


class SeadocHistory(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def _get_new_file_history_info(self, ent, avatar_size, name_dict):
        info = {}
        creator_name = ent.op_user
        url, is_default, date_uploaded = api_avatar_url(creator_name, avatar_size)
        info['creator_avatar_url'] = url
        info['creator_email'] = creator_name
        info['creator_name'] = email2nickname(creator_name)
        info['creator_contact_email'] = email2contact_email(creator_name)
        info['ctime'] = utc_datetime_to_isoformat_timestr(ent.timestamp)
        info['size'] = ent.size
        info['obj_id'] = ent.file_id
        info['commit_id'] = ent.commit_id
        info['old_path'] = ent.old_path if hasattr(ent, 'old_path') else ''
        info['path'] = ent.path
        info['name'] = name_dict.get(ent.file_id, '')
        return info

    def get(self, request, file_uuid):
        """list history, same as NewFileHistoryView
        """
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'seadoc uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = uuid_map.repo_id
        username = request.user.username
        path = posixpath.join(uuid_map.parent_path, uuid_map.filename)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        commit_id = repo.head_cmmt_id

        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 25))
        except ValueError:
            avatar_size = 32
            page = 1
            per_page = 25

        # Don't use seafile_api.get_file_id_by_path()
        # if path parameter is `rev_renamed_old_path`.
        # seafile_api.get_file_id_by_path() will return None.
        file_id = seafile_api.get_file_id_by_commit_and_path(repo_id,
                commit_id, path)
        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # get repo history limit
        try:
            history_limit = seafile_api.get_repo_history_limit(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        start = (page - 1) * per_page
        count = per_page
        try:
            file_revisions, total_count = get_file_history(repo_id, path, start, count, history_limit)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        name_dict = {}
        obj_id_list = [commit.file_id for commit in file_revisions]
        if obj_id_list:
            name_dict = list_seadoc_history_name(file_uuid, obj_id_list)
        data = [self._get_new_file_history_info(ent, avatar_size, name_dict) for ent in file_revisions]
        result = {
            "histories": data,
            "page": page,
            "total_count": total_count
        }
        return Response(result)

    def post(self, request, file_uuid):
        """rename history
        """
        username = request.user.username
        obj_id = request.data.get('obj_id', '')
        new_name = request.data.get('new_name', '')
        if not obj_id:
            error_msg = 'obj_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if not new_name:
            error_msg = 'new_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'seadoc uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = uuid_map.repo_id
        username = request.user.username
        path = posixpath.join(uuid_map.parent_path, uuid_map.filename)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        token = seafile_api.get_fileserver_access_token(repo_id,
                obj_id, 'download', username)
        if not token:
            error_msg = 'history %s not found.' % obj_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # main
        update_seadoc_history_name(file_uuid, obj_id, new_name)

        return Response({
            'obj_id': obj_id,
            'name': new_name,
        })
