import os
import re
import json
import uuid
import stat
import shutil
import logging
import requests
import posixpath
from datetime import datetime
from urllib.parse import quote, unquote

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from django.utils.translation import gettext as _
from django.http import HttpResponseRedirect, HttpResponse
from django.core.files.base import ContentFile
from django.utils import timezone
from django.db import transaction
from django.urls import reverse
from django.http import FileResponse

from seaserv import seafile_api, check_quota

from seahub.views import check_folder_permission
from seahub.api2.authentication import TokenAuthentication, SdocJWTTokenAuthentication
from seahub.api2.utils import api_error, user_to_dict, to_python_boolean
from seahub.api2.throttling import UserRateThrottle
from seahub.seadoc.utils import is_valid_seadoc_access_token, get_seadoc_upload_link, \
    get_seadoc_download_link, get_seadoc_file_uuid, gen_seadoc_access_token, \
    gen_seadoc_image_parent_path, get_seadoc_asset_upload_link, get_seadoc_asset_download_link, \
    can_access_seadoc_asset, is_seadoc_revision, export_sdoc
from seahub.utils.file_types import SEADOC, IMAGE
from seahub.utils import get_file_type_and_ext, normalize_file_path, normalize_dir_path, PREVIEW_FILEEXT, get_file_history, \
    gen_inner_file_get_url, gen_inner_file_upload_url, get_service_url
from seahub.tags.models import FileUUIDMap
from seahub.utils.error_msg import file_type_error_msg
from seahub.utils.repo import parse_repo_perm
from seahub.utils.file_revisions import get_file_revisions_within_limit
from seahub.seadoc.models import SeadocHistoryName, SeadocDraft, SeadocRevision, SeadocCommentReply
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils.timeutils import utc_datetime_to_isoformat_timestr, timestamp_to_isoformat_timestr
from seahub.base.models import FileComment
from seahub.constants import PERMISSION_READ_WRITE, PERMISSION_INVISIBLE
from seahub.seadoc.sdoc_server_api import SdocServerAPI


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


class SeadocOriginFileContent(APIView):
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
        
        revision_info = is_seadoc_revision(file_uuid)
        origin_doc_uuid = revision_info.get('origin_doc_uuid', '')
        is_published = revision_info.get('is_published', False)

        if is_published:
            error_msg = 'seadoc file %s has publish.' % uuid_map.filename
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        origin_uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(origin_doc_uuid)
        if not origin_uuid_map:
            error_msg = 'seadoc origin uuid %s not found.' % origin_doc_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # get content from sdoc server
        username = request.user.username
        sdoc_server_api = SdocServerAPI(origin_doc_uuid, str(origin_uuid_map.filename), username)
        try:          
            res = sdoc_server_api.get_doc()
            return Response({
                'content': json.dumps(res)
            })
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


class SeadocExportView(APIView):
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, file_uuid):
        username = request.user.username
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'seadoc uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        filetype, fileext = get_file_type_and_ext(uuid_map.filename)
        if filetype != SEADOC:
            error_msg = 'seadoc file type %s invalid.' % filetype
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        permission = check_folder_permission(request, uuid_map.repo_id, uuid_map.parent_path)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            tmp_zip_path = export_sdoc(uuid_map, username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not os.path.exists(tmp_zip_path):
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        response = FileResponse(open(tmp_zip_path, 'rb'), content_type="application/x-zip-compressed", as_attachment=True)
        response['Content-Disposition'] = 'attachment;filename*=UTF-8\'\'' + quote(uuid_map.filename)

        tmp_dir = os.path.join('/tmp/sdoc', str(uuid_map.uuid))
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir)

        return response


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


class SeadocAsyncCopyImages(APIView):

    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request, file_uuid):
        username = request.user.username
        origin_doc_uuid = request.data.get('origin_doc_uuid', '')
        if file_uuid == origin_doc_uuid:
            error_msg = 'file_uuid and origin_doc_uuid can not be the same.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)            
        if not origin_doc_uuid:
            error_msg = 'origin_doc_uuid invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        image_list = request.data.get('image_list', [])
        if not image_list or not isinstance(image_list, list):
            error_msg = 'image_list invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        # dst
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'seadoc uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        repo_id = uuid_map.repo_id
        if check_quota(repo_id) < 0:
            error_msg = _("Out of quota.")
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        image_parent_path = gen_seadoc_image_parent_path(file_uuid, repo_id, username)
        if not check_folder_permission(request, repo_id, image_parent_path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        # origin
        origin_uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(origin_doc_uuid)
        if not origin_uuid_map:
            error_msg = 'seadoc uuid %s not found.' % origin_doc_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        origin_repo_id = origin_uuid_map.repo_id
        origin_image_parent_path = gen_seadoc_image_parent_path(origin_doc_uuid, origin_repo_id, username)
        if not check_folder_permission(request, origin_repo_id, origin_image_parent_path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # copy image files
        res = seafile_api.copy_file(
            origin_repo_id, origin_image_parent_path,
            json.dumps(image_list),
            repo_id, image_parent_path,
            json.dumps(image_list),
            username=username, need_progress=1, synchronous=0
        )
        task_id = res.task_id if res.background else ''
        return Response({'task_id': task_id})


class SeadocQueryCopyMoveProgressView(APIView):

    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid):
        """ Fetch progress of file/dir mv/cp.
        """
        # argument check
        task_id = request.GET.get('task_id')
        if not task_id:
            error_msg = 'task_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            res = seafile_api.get_copy_task(task_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # res can be None
        if not res:
            error_msg = _('Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {}
        result['done'] = res.done
        result['total'] = res.total
        result['canceled'] = res.canceled
        result['failed'] = res.failed
        result['successful'] = res.successful
        return Response(result)


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
            name_queryset = SeadocHistoryName.objects.list_by_obj_ids(
                doc_uuid=file_uuid, obj_id_list=obj_id_list)
            name_dict = {item.obj_id: item.name for item in name_queryset}
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
        SeadocHistoryName.objects.update_name(file_uuid, obj_id, new_name)

        return Response({
            'obj_id': obj_id,
            'name': new_name,
        })


class SeadocDrafts(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """list drafts
        """
        username = request.user.username
        # argument check
        repo_id = request.GET.get('repo_id')
        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25
        start = (page - 1) * per_page
        limit = per_page + 1

        if repo_id:
            # resource check
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                error_msg = 'Library %s not found.' % repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # permission check
            permission = check_folder_permission(request, repo_id, '/')
            if not permission:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            draft_queryset = SeadocDraft.objects.list_by_repo_id(repo_id, start, limit)
            count = SeadocDraft.objects.filter(repo_id=repo_id).count()
        else:
            # owned
            draft_queryset = SeadocDraft.objects.list_by_username(username, start, limit)
            count = SeadocDraft.objects.filter(username=username).count()

        drafts = [draft.to_dict() for draft in draft_queryset]

        return Response({'drafts': drafts, 'count': count})


class SeadocMaskAsDraft(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def post(self, request, repo_id):
        """ Mask as draft
        """
        username = request.user.username
        # argument check
        path = request.data.get('p', None)
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

        # permission check
        permission = check_folder_permission(request, repo_id, path)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        #
        file_uuid = get_seadoc_file_uuid(repo, path)
        exist_draft = SeadocDraft.objects.get_by_doc_uuid(file_uuid)
        if exist_draft:
            error_msg = '%s is already draft' % filename
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        draft = SeadocDraft.objects.mask_as_draft(
            file_uuid, repo_id, username)

        return Response(draft.to_dict())

    def delete(self, request, repo_id):
        """ Unmask as draft
        """
        username = request.user.username
        # argument check
        path = request.data.get('p', None)
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

        # permission check
        permission = check_folder_permission(request, repo_id, path)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        #
        file_uuid = get_seadoc_file_uuid(repo, path)
        SeadocDraft.objects.unmask_as_draft(file_uuid)

        return Response({'success': True})


class SeadocCommentsView(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid):
        """list comments of a sdoc, same as FileCommentsView
        """
        auth = request.headers.get('authorization', '').split()
        if not is_valid_seadoc_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            avatar_size = 32

        resolved = request.GET.get('resolved', None)
        if resolved not in ('true', 'false', None):
            error_msg = 'resolved invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        start = None
        end = None
        page = request.GET.get('page', '')
        if page:
            try:
                page = int(request.GET.get('page', '1'))
                per_page = int(request.GET.get('per_page', '25'))
            except ValueError:
                page = 1
                per_page = 25
            start = (page - 1) * per_page
            end = page * per_page

        total_count = FileComment.objects.list_by_file_uuid(file_uuid).count()
        comments = []

        if resolved is None:
            file_comments = FileComment.objects.list_by_file_uuid(file_uuid)[start: end]
        else:
            comment_resolved = to_python_boolean(resolved)
            file_comments = FileComment.objects.list_by_file_uuid(file_uuid).filter(resolved=comment_resolved)[start: end]

        reply_queryset = SeadocCommentReply.objects.list_by_doc_uuid(file_uuid)

        for file_comment in file_comments:
            comment = file_comment.to_dict(reply_queryset)
            comment.update(user_to_dict(file_comment.author, request=request, avatar_size=avatar_size))
            comments.append(comment)

        result = {'comments': comments, 'total_count': total_count}
        return Response(result)

    def post(self, request, file_uuid):
        """Post a comment of a sdoc.
        """
        # argument check
        auth = request.headers.get('authorization', '').split()
        is_valid, payload = is_valid_seadoc_access_token(auth, file_uuid, return_payload=True)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            avatar_size = 32

        comment = request.data.get('comment', '')
        detail = request.data.get('detail', '')
        author = request.data.get('author', '')
        username = payload.get('username', '') or author
        if comment is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'comment invalid.')
        if not username:
            return api_error(status.HTTP_400_BAD_REQUEST, 'author invalid.')

        file_comment = FileComment.objects.add_by_file_uuid(
            file_uuid, username, comment, detail)
        comment = file_comment.to_dict()
        comment.update(user_to_dict(username, request=request, avatar_size=avatar_size))
        return Response(comment)


class SeadocCommentView(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid, comment_id):
        """Get a comment, same as FileCommentView
        """
        auth = request.headers.get('authorization', '').split()
        if not is_valid_seadoc_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            avatar_size = 32

        # resource check
        try:
            file_comment = FileComment.objects.get(pk=comment_id)
        except FileComment.DoesNotExist:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong comment id')
        if str(file_comment.uuid.uuid) != file_uuid:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found: %s' % comment_id)

        comment = file_comment.to_dict()
        comment.update(user_to_dict(
            file_comment.author, request=request, avatar_size=avatar_size))
        return Response(comment)

    def delete(self, request, file_uuid, comment_id):
        """Delete a comment
        """
        auth = request.headers.get('authorization', '').split()
        if not is_valid_seadoc_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # resource check
        try:
            file_comment = FileComment.objects.get(pk=comment_id)
        except FileComment.DoesNotExist:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Wrong comment id')
        if str(file_comment.uuid.uuid) != file_uuid:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found: %s' % comment_id)

        file_comment.delete()
        SeadocCommentReply.objects.filter(comment_id=comment_id).delete()
        return Response({'success': True})

    def put(self, request, file_uuid, comment_id):
        """Update a comment
        """
        auth = request.headers.get('authorization', '').split()
        if not is_valid_seadoc_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            avatar_size = 32

        # argument check
        resolved = request.data.get('resolved')
        if resolved not in ('true', 'false', None):
            error_msg = 'resolved invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        detail = request.data.get('detail')
        comment = request.data.get('comment')

        # resource check
        try:
            file_comment = FileComment.objects.get(pk=comment_id)
        except FileComment.DoesNotExist:
            error_msg = 'FileComment %s not found.' % comment_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        if str(file_comment.uuid.uuid) != file_uuid:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found: %s' % comment_id)

        if resolved is not None:
            # do not refresh updated_at
            comment_resolved = to_python_boolean(resolved)
            file_comment.resolved = comment_resolved
            file_comment.save(update_fields=['resolved'])

        if detail is not None or comment is not None:
            if detail is not None:
                file_comment.detail = detail
            if comment is not None:
                file_comment.comment = comment
            # save
            file_comment.updated_at = timezone.now()
            file_comment.save()

        comment = file_comment.to_dict()
        comment.update(user_to_dict(file_comment.author, request=request, avatar_size=avatar_size))
        return Response(comment)


class SeadocCommentRepliesView(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid, comment_id):
        """list comment replies of a sdoc
        """
        auth = request.headers.get('authorization', '').split()
        if not is_valid_seadoc_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            avatar_size = 32
        start = None
        end = None
        page = request.GET.get('page', '')
        if page:
            try:
                page = int(request.GET.get('page', '1'))
                per_page = int(request.GET.get('per_page', '25'))
            except ValueError:
                page = 1
                per_page = 25
            start = (page - 1) * per_page
            end = page * per_page

        # resource check
        file_comment = FileComment.objects.filter(
            id=comment_id, uuid=file_uuid).first()
        if not file_comment:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found.')

        total_count = SeadocCommentReply.objects.list_by_comment_id(comment_id).count()
        replies = []
        reply_queryset = SeadocCommentReply.objects.list_by_comment_id(comment_id)[start: end]
        for reply in reply_queryset:
            data = reply.to_dict()
            data.update(
                user_to_dict(reply.author, request=request, avatar_size=avatar_size))
            replies.append(data)

        result = {'replies': replies, 'total_count': total_count}
        return Response(result)

    def post(self, request, file_uuid, comment_id):
        """post a comment reply of a sdoc.
        """
        # argument check
        auth = request.headers.get('authorization', '').split()
        is_valid, payload = is_valid_seadoc_access_token(auth, file_uuid, return_payload=True)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            avatar_size = 32
        reply_content = request.data.get('reply', '')
        type_content = request.data.get('type', 'reply')
        author = request.data.get('author', '')
        username = payload.get('username', '') or author
        if reply_content is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'reply invalid.')
        if not username:
            return api_error(status.HTTP_400_BAD_REQUEST, 'author invalid.')

        # resource check
        file_comment = FileComment.objects.filter(
            id=comment_id, uuid=file_uuid).first()
        if not file_comment:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found.')

        reply = SeadocCommentReply.objects.create(
            author=username,
            reply=str(reply_content),
            type=str(type_content),
            comment_id=comment_id,
            doc_uuid=file_uuid,
        )
        data = reply.to_dict()
        data.update(
            user_to_dict(reply.author, request=request, avatar_size=avatar_size))
        return Response(data)


class SeadocCommentReplyView(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid, comment_id, reply_id):
        """Get a comment reply
        """
        auth = request.headers.get('authorization', '').split()
        if not is_valid_seadoc_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            avatar_size = 32

        # resource check
        file_comment = FileComment.objects.filter(
            id=comment_id, uuid=file_uuid).first()
        if not file_comment:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found.')

        reply = SeadocCommentReply.objects.filter(
            id=reply_id, doc_uuid=file_uuid, comment_id=comment_id).first()
        if not reply:
            return api_error(status.HTTP_404_NOT_FOUND, 'reply not found.')

        data = reply.to_dict()
        data.update(
            user_to_dict(reply.author, request=request, avatar_size=avatar_size))
        return Response(data)

    def delete(self, request, file_uuid, comment_id, reply_id):
        """Delete a comment reply
        """
        auth = request.headers.get('authorization', '').split()
        if not is_valid_seadoc_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # resource check
        file_comment = FileComment.objects.filter(
            id=comment_id, uuid=file_uuid).first()
        if not file_comment:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found.')

        reply = SeadocCommentReply.objects.filter(
            id=reply_id, doc_uuid=file_uuid, comment_id=comment_id).first()
        if not reply:
            return api_error(status.HTTP_404_NOT_FOUND, 'reply not found.')
        reply.delete()
        return Response({'success': True})

    def put(self, request, file_uuid, comment_id, reply_id):
        """Update a comment reply
        """
        auth = request.headers.get('authorization', '').split()
        if not is_valid_seadoc_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check
        reply_content = request.data.get('reply')
        if reply_content is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'reply invalid.')
        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            avatar_size = 32

        # resource check
        file_comment = FileComment.objects.filter(
            id=comment_id, uuid=file_uuid).first()
        if not file_comment:
            return api_error(status.HTTP_404_NOT_FOUND, 'comment not found.')

        reply = SeadocCommentReply.objects.filter(
            id=reply_id, doc_uuid=file_uuid, comment_id=comment_id).first()
        if not reply:
            return api_error(status.HTTP_404_NOT_FOUND, 'reply not found.')

        # save
        reply.reply = str(reply_content)
        reply.updated_at = timezone.now()
        reply.save()

        data = reply.to_dict()
        data.update(
            user_to_dict(reply.author, request=request, avatar_size=avatar_size))
        return Response(data)


class SeadocStartRevise(APIView):
    # sdoc editor use jwt token
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        """create
        """
        username = request.user.username
        # argument check
        path = request.data.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        repo_id = request.data.get('repo_id')
        if not repo_id:
            error_msg = 'repo_id invalid.'
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

        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # create revision dir if does not exist
        revision_dir_id = seafile_api.get_dir_id_by_path(repo_id, '/Revisions')
        if revision_dir_id is None:
            seafile_api.post_dir(repo_id, '/', 'Revisions', username)

        #
        origin_file_uuid = get_seadoc_file_uuid(repo, path)
        if SeadocRevision.objects.get_by_doc_uuid(origin_file_uuid):
            error_msg = 'seadoc %s is already a revision.' % filename
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        # save origin file
        try:
            sdoc_server_api = SdocServerAPI(origin_file_uuid, filename, username)            
            res = sdoc_server_api.save_doc()
        except Exception as e:
            warning_msg = 'Save origin sdoc %s failed.' % origin_file_uuid
            logger.warning(warning_msg)

        origin_file_id = seafile_api.get_file_id_by_path(repo_id, path)
        revision_file_uuid = str(uuid.uuid4())
        revision_filename = revision_file_uuid + '.sdoc'

        with transaction.atomic():
            revision_uuid_map = FileUUIDMap(
                uuid=revision_file_uuid,
                repo_id=repo_id,
                parent_path='/Revisions',
                filename=revision_filename,
                is_dir=False,
            )
            revision_uuid_map.save()

            revision = SeadocRevision.objects.add(
                doc_uuid=revision_file_uuid,
                origin_doc_uuid=origin_file_uuid,
                repo_id=repo_id,
                origin_doc_path=path,
                username=username,
                origin_file_version=origin_file_id,
            )

        # copy file to revision dir
        seafile_api.copy_file(
            repo_id, parent_dir,
            json.dumps([filename]),
            repo_id, '/Revisions',
            json.dumps([revision_filename]),
            username=username, need_progress=0, synchronous=1,
        )

        # copy image files
        origin_image_parent_path = '/images/sdoc/' + origin_file_uuid + '/'
        dir_id = seafile_api.get_dir_id_by_path(repo_id, origin_image_parent_path)
        if dir_id:
            revision_image_parent_path = gen_seadoc_image_parent_path(
                revision_file_uuid, repo_id, username)
            dirents = seafile_api.list_dir_by_path(repo_id, origin_image_parent_path)
            obj_name_list = [item.obj_name for item in dirents]
            seafile_api.copy_file(
                repo_id, origin_image_parent_path,
                json.dumps(obj_name_list),
                repo_id, revision_image_parent_path,
                json.dumps(obj_name_list),
                username=username, need_progress=0, synchronous=1
            )
        return Response(revision.to_dict())


class SeadocRevisionsCount(APIView):

    # sdoc editor use jwt token
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, file_uuid):
        if not file_uuid:
            error_msg = 'file_uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)

        if not uuid_map:
            error_msg = 'file %s uuid_map not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        count = SeadocRevision.objects.filter(origin_doc_uuid=uuid_map.uuid, is_published=False).count()
        return Response({
            'count': count
        })


class SeadocRevisions(APIView):
    # sdoc editor use jwt token
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, file_uuid):
        if not file_uuid:
            error_msg = 'file_uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)

        if not uuid_map:
            error_msg = 'file %s uuid_map not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        count = SeadocRevision.objects.filter(origin_doc_uuid=uuid_map.uuid, is_published=False).count()
        revision_queryset = SeadocRevision.objects.list_all_by_origin_doc_uuid(uuid_map.uuid)

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25
        start = (page - 1) * per_page
        limit = page * per_page

        revisions_queryset= revision_queryset[start:limit]
        uuid_set = set()
        for item in revisions_queryset:
            uuid_set.add(item.doc_uuid)
            uuid_set.add(item.origin_doc_uuid)

        fileuuidmap_queryset = FileUUIDMap.objects.filter(uuid__in=list(uuid_set))
        revisions = [revision.to_dict(fileuuidmap_queryset) for revision in revisions_queryset]

        return Response({
            'count': count,
            'revisions': revisions
        })


class SeadocRevisionView(APIView):
    # sdoc editor use jwt token
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, file_uuid):
        if not file_uuid:
            error_msg = 'file_uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)

        if not uuid_map:
            error_msg = 'file %s uuid_map not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        revision = SeadocRevision.objects.get_by_doc_uuid(file_uuid)
        if not revision:
            error_msg = 'Revision %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        if revision.is_published:
            error_msg = 'Revision %s is already published.' % file_uuid
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        repo_id = revision.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if permission != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        # get revision file info
        revision_file_uuid = uuid_map
        revision_parent_path = revision_file_uuid.parent_path
        revision_filename = revision_file_uuid.filename
        username = request.user.username

        revision_image_parent_path = '/images/sdoc/' + str(revision_file_uuid.uuid) + '/'
        dir_id = seafile_api.get_dir_id_by_path(repo_id, revision_image_parent_path)
        if dir_id:
            seafile_api.del_file(
                    repo_id, '/images/sdoc/', json.dumps([str(revision_file_uuid.uuid)]), username)

            seafile_api.del_file(
                    repo_id, revision_parent_path, json.dumps([revision_filename]), username)
            
        SeadocRevision.objects.delete_by_doc_uuid(file_uuid)

        sdoc_server_api = SdocServerAPI(file_uuid, revision_filename, username)
        sdoc_server_api.remove_doc()

        return Response({
            'success': True
        })

    # modify by rebase op
    def put(self, request, file_uuid):

        if not file_uuid:
            error_msg = 'file_uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)

        if not uuid_map:
            error_msg = 'file %s uuid_map not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        revision = SeadocRevision.objects.get_by_doc_uuid(file_uuid)
        if not revision:
            error_msg = 'Revision %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        if revision.is_published:
            error_msg = 'Revision %s is already published.' % file_uuid
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        origin_doc_uuid = revision.origin_doc_uuid
        origin_uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(origin_doc_uuid)
        if not origin_uuid_map:
            error_msg = 'origin file %s uuid_map not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_path = posixpath.join(uuid_map.parent_path, uuid_map.filename)
        file_id = seafile_api.get_file_id_by_path(uuid_map.repo_id, file_path)
        if not file_id:  # save file anyway
            seafile_api.post_empty_file(
                uuid_map.repo_id, uuid_map.parent_path, uuid_map.filename, '')

        username = request.user.username
        upload_link = get_seadoc_upload_link(uuid_map, username)
        if not upload_link:
            error_msg = 'seadoc file %s not found.' % uuid_map.filename
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:

            # rewrite file
            file = request.FILES.get('file', None) 
            files = {
                'file': file,
                'file_name': uuid_map.filename,
                'target_file': file_path,
            }
            requests.post(upload_link, files=files)

            # update origin file version
            origin_doc_path = revision.origin_doc_path
            newest_file_version = seafile_api.get_file_id_by_path(origin_uuid_map.repo_id, origin_doc_path)
            SeadocRevision.objects.update_origin_file_version(file_uuid, newest_file_version)

            # server content update 
            sdoc_server_api = SdocServerAPI(file_uuid, str(uuid_map.filename), username)            
            sdoc_server_api.replace_doc()

            return Response({
                'origin_file_version': newest_file_version,
            })
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


class DeleteSeadocOtherRevision(APIView):
    # sdoc editor use jwt token
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, file_uuid, revision_id):
        origin_doc_uuid = file_uuid
        if not origin_doc_uuid:
            error_msg = 'origin_file_uuid %s not found.' % origin_doc_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        origin_uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(origin_doc_uuid)
        if not origin_uuid_map:
            error_msg = 'file %s uuid_map not found.' % origin_doc_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not revision_id:
            error_msg = 'Revision %s not found.' % revision_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        revision = SeadocRevision.objects.get_by_origin_doc_uuid_and_revision_id(origin_doc_uuid, revision_id)
        if not revision:
            error_msg = 'Revision %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        if revision.is_published:
            error_msg = 'Revision %s is already published.' % file_uuid
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_uuid = revision.doc_uuid
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'file %s uuid_map not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        repo_id = revision.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if permission != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        # get revision file info
        revision_file_uuid = uuid_map
        revision_parent_path = revision_file_uuid.parent_path
        revision_filename = revision_file_uuid.filename
        username = request.user.username

        revision_image_parent_path = '/images/sdoc/' + str(revision_file_uuid.uuid) + '/'
        dir_id = seafile_api.get_dir_id_by_path(repo_id, revision_image_parent_path)
        if dir_id:
            seafile_api.del_file(
                    repo_id, '/images/sdoc/', json.dumps([str(revision_file_uuid.uuid)]), username)

            seafile_api.del_file(
                    repo_id, revision_parent_path, json.dumps([revision_filename]), username)
            
        SeadocRevision.objects.delete_by_doc_uuid(file_uuid)

        sdoc_server_api = SdocServerAPI(file_uuid, revision_filename, username)
        sdoc_server_api.remove_doc()

        return Response({
            'success': True,
        })

class SeadocPublishRevision(APIView):
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request, file_uuid):
        """publish
        """
        force = request.data.get('force')  # used when origin file deleted

        # resource check
        revision = SeadocRevision.objects.get_by_doc_uuid(file_uuid)
        if not revision:
            error_msg = 'Revision %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        if revision.is_published:
            error_msg = 'Revision %s is already published.' % file_uuid
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)  

        repo_id = revision.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if permission != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get origin file info
        origin_file_uuid = FileUUIDMap.objects.get_fileuuidmap_by_uuid(
            revision.origin_doc_uuid)

        if not origin_file_uuid and not force:
            error_msg = 'origin sdoc %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if origin_file_uuid:
            origin_file_parent_path = origin_file_uuid.parent_path
            origin_file_filename = origin_file_uuid.filename
        else:
            origin_file_parent_path = os.path.dirname(revision.origin_doc_path)
            origin_file_filename = os.path.basename(revision.origin_doc_path)
        origin_file_path = posixpath.join(origin_file_parent_path, origin_file_filename)

        # check if origin file's parent folder exists
        if not seafile_api.get_dir_id_by_path(repo_id, origin_file_parent_path):
            dst_parent_path = '/'
        else:
            dst_parent_path = origin_file_parent_path

        # get revision file info
        revision_file_uuid = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        revision_parent_path = revision_file_uuid.parent_path
        revision_filename = revision_file_uuid.filename

        # username 
        username = request.user.username
        try:
            sdoc_server_api = SdocServerAPI(file_uuid, revision_filename, username)            
            res = sdoc_server_api.save_doc()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # move revision file
        seafile_api.move_file(
            repo_id, revision_parent_path,
            json.dumps([revision_filename]),
            repo_id, dst_parent_path,
            json.dumps([origin_file_filename]),
            replace=1, username=username,
            need_progress=0, synchronous=1,
        )

        dst_file_id = seafile_api.get_file_id_by_path(repo_id, origin_file_path)
        SeadocRevision.objects.publish(file_uuid, username, dst_file_id)

        # move image files
        revision_image_parent_path = '/images/sdoc/' + str(revision_file_uuid.uuid) + '/'
        dir_id = seafile_api.get_dir_id_by_path(repo_id, revision_image_parent_path)
        if dir_id:
            origin_image_parent_path = gen_seadoc_image_parent_path(
                str(origin_file_uuid.uuid), repo_id, username)
            dirents = seafile_api.list_dir_by_path(repo_id, revision_image_parent_path)
            for e in dirents:
                obj_name = e.obj_name
                seafile_api.move_file(
                    repo_id, revision_image_parent_path,
                    json.dumps([obj_name]),
                    repo_id, origin_image_parent_path,
                    json.dumps([obj_name]),
                    replace=1, username=username,
                    need_progress=0, synchronous=1,
                )
            seafile_api.del_file(
                repo_id, '/images/sdoc/', json.dumps([str(revision_file_uuid.uuid)]), username)

        try:         
            res = sdoc_server_api.publish_doc(str(origin_file_uuid.uuid), origin_file_filename)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        revision = SeadocRevision.objects.get_by_doc_uuid(file_uuid)
        return Response(revision.to_dict())


class SeadocFileView(APIView):
    """redirect to file view by file_uuid
    """
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid):
        # do not permission check, just redirect

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'file uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = uuid_map.repo_id
        file_path = posixpath.join(uuid_map.parent_path, uuid_map.filename)
        file_url = reverse('view_lib_file', args=[repo_id, file_path])
        return HttpResponseRedirect(file_url)


class SeadocFileUUIDView(APIView):

    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, file_uuid):
        """ Get file_uuid of a file/dir.
        """
        sdoc_uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not sdoc_uuid_map:
            error_msg = 'seadoc uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('p', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_dir = request.GET.get('is_dir', 'false')
        is_dir = is_dir.lower()
        if is_dir not in ('true', 'false'):
            error_msg = "is_dir can only be 'true' or 'false'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo_id = sdoc_uuid_map.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        is_dir = to_python_boolean(is_dir)
        if is_dir:
            if not seafile_api.get_dir_id_by_path(repo_id, normalize_dir_path(path)):
                error_msg = 'Folder %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        else:
            if not seafile_api.get_file_id_by_path(repo_id, normalize_file_path(path)):
                error_msg = 'File %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # make sure path:
        # 1. starts with '/'
        # 2. NOT ends with '/'
        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)
        dirent_name = os.path.basename(path)

        # get file/dir uuid
        if repo.is_virtual:
            repo_id = repo.origin_repo_id
            path = posixpath.join(repo.origin_path, path.strip('/'))

            path = normalize_file_path(path)
            parent_dir = os.path.dirname(path)
            dirent_name = os.path.basename(path)

        try:
            uuid_map = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id,
                    parent_dir, dirent_name, is_dir)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'file_uuid': str(uuid_map.uuid)})


class SeadocFilesInfoView(APIView):

    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request, file_uuid):
        """ Get files info by file view url or smart link
        """
        files_url = request.data.get('files_url', [])
        if not files_url:
            error_msg = 'files_url invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        service_url = get_service_url().strip('/')
        smart_link_re = re.compile(r'^%s/smart-link/([-0-9a-f]{36})/$' % (service_url))
        file_url_re = re.compile(r'^%s/lib/([-0-9a-f]{36})/file/(.*)' % (service_url))
        dir_url_re = re.compile(r'^%s/library/([-0-9a-f]{36})/(.*)' % (service_url))

        files_info = {}
        for file_url in files_url:
            file_url = unquote(file_url)
            files_info[file_url] = {}
            repo_id = ''
            path = ''
            dirent_file_uuid = ''
            is_dir = False
            try:
                if smart_link_re.match(file_url) is not None:
                    re_result = smart_link_re.match(file_url)
                    dirent_file_uuid = re_result.group(1)
                    uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(dirent_file_uuid)
                    if not uuid_map:
                        continue
                    repo_id = uuid_map.repo_id
                    path = posixpath.join(uuid_map.parent_path, uuid_map.filename)
                    is_dir = uuid_map.is_dir
                elif file_url_re.match(file_url) is not None:
                    re_result = file_url_re.match(file_url)
                    repo_id = re_result.group(1)
                    path = re_result.group(2)
                elif dir_url_re.match(file_url) is not None:
                    re_result = dir_url_re.match(file_url)
                    repo_id = re_result.group(1)
                    path = re_result.group(2).split('/', 1)[-1]
                    is_dir = True

                # check
                if not repo_id or not path:
                    continue
                if is_dir:
                    path = normalize_dir_path(path)
                    path = path.rstrip('/')
                    parent_path = os.path.dirname(path)
                    file_name = os.path.basename(path)
                else:
                    path = normalize_file_path(path)
                    parent_path = os.path.dirname(path)
                    file_name = os.path.basename(path)

                # permission check
                if not check_folder_permission(request, repo_id, path):
                    continue
            except Exception as e:
                logger.exception(e)
                continue
 
            info = {
                'is_dir': is_dir,
                'name': file_name,
                'parent_path': parent_path,
                'repo_id': repo_id,
                'file_type': '',
                'file_ext': '',
                'file_uuid': dirent_file_uuid,
            }
            if not is_dir:
                filetype, fileext = get_file_type_and_ext(file_name)
                info['file_ext'] = fileext
                info['file_type'] = filetype
                if filetype == SEADOC and not dirent_file_uuid:
                    repo = seafile_api.get_repo(repo_id)
                    dirent_file_uuid = get_seadoc_file_uuid(repo, path)
                    info['file_uuid'] = dirent_file_uuid
            files_info[file_url] = info

        return Response({'files_info': files_info})


class SeadocDirView(APIView):
    """list all files in dir
    """
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, file_uuid):
        username = request.user.username
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'seadoc uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_type = request.GET.get('type', 'sdoc')  # sdoc, image, file
        path = request.GET.get('p', '/')
        path = normalize_dir_path(path)

        repo_id = uuid_map.repo_id
        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            dirs = seafile_api.list_dir_with_perm(
                repo_id, path, dir_id, username, -1, -1)
            dirs = dirs if dirs else []
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to list dir.")

        uuid_map_queryset = FileUUIDMap.objects.get_fileuuidmaps_by_parent_path(repo_id, path)
        dir_list, file_list = [], []
        for dirent in dirs:
            if dirent.permission == PERMISSION_INVISIBLE:
                continue

            entry = {}
            if stat.S_ISDIR(dirent.mode):
                dtype = "dir"
            else:
                dtype = "file"
                filetype, fileext = get_file_type_and_ext(dirent.obj_name)
                dirent_uuid_map = uuid_map_queryset.filter(filename=dirent.obj_name).first()
                dirent_file_uuid = str(dirent_uuid_map.uuid) if dirent_uuid_map else ''
                if file_type == 'sdoc' and filetype == SEADOC:
                    entry["file_uuid"] = dirent_file_uuid
                elif filetype == 'image' and filetype == IMAGE:
                    entry["file_uuid"] = dirent_file_uuid
                elif file_type == 'file' and filetype not in (SEADOC, IMAGE):
                    entry["file_uuid"] = dirent_file_uuid
                else:
                    continue
            entry["type"] = dtype
            entry["name"] = dirent.obj_name
            entry["id"] = dirent.obj_id
            entry["mtime"] = dirent.mtime
            entry["permission"] = dirent.permission
            if dtype == 'dir':
                dir_list.append(entry)
            else:
                file_list.append(entry)

        dir_list.sort(key=lambda x: x['name'].lower())
        file_list.sort(key=lambda x: x['name'].lower())
        dentrys = dir_list + file_list
        return Response(dentrys)


class SdocRevisionBaseVersionContent(APIView):
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid):
        if not file_uuid:
            error_msg = 'file_uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'File %s uuid_map not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        revision = SeadocRevision.objects.get_by_doc_uuid(file_uuid)
        if not revision:
            error_msg = 'Revision %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        origin_doc_path = revision.origin_doc_path
        if not origin_doc_path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Origin file path is invalid.')
        
        origin_file_version = revision.origin_file_version
        if not origin_file_version:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Origin file version is missing.')
        
        origin_doc_uuid = revision.origin_doc_uuid
        origin_doc_uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(origin_doc_uuid)
        if not origin_doc_uuid_map:
            error_msg = 'Origin file uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        token = seafile_api.get_fileserver_access_token(origin_doc_uuid_map.repo_id,
                origin_file_version, 'download', username)

        if not token:
            error_msg = 'Origin file %s not found.' % origin_doc_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        origin_file_name = os.path.basename(origin_doc_path)
        download_url = gen_inner_file_get_url(token, origin_file_name)

        resp = requests.get(download_url)
        return Response({
            'content': resp.content
        })


class SeadocPublishedRevisionContent(APIView):
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid):
        if not file_uuid:
            error_msg = 'file_uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        revision = SeadocRevision.objects.get_by_doc_uuid(file_uuid)
        if not revision:
            error_msg = 'Revision %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not revision.is_published:
            error_msg = 'Revision %s is not published.' % file_uuid
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        origin_doc_path = revision.origin_doc_path
        if not origin_doc_path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Origin file path is invalid.')
        
        publish_file_version = revision.publish_file_version
        if not publish_file_version:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Origin file version is missing.')
        
        origin_doc_uuid = revision.origin_doc_uuid
        origin_doc_uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(origin_doc_uuid)
        if not origin_doc_uuid_map:
            error_msg = 'Origin file uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        token = seafile_api.get_fileserver_access_token(origin_doc_uuid_map.repo_id,
                publish_file_version, 'download', username)

        if not token:
            error_msg = 'Origin file %s not found.' % origin_doc_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        origin_file_name = os.path.basename(origin_doc_path)
        download_url = gen_inner_file_get_url(token, origin_file_name)

        resp = requests.get(download_url)
        return Response({
            'content': resp.content
        })
