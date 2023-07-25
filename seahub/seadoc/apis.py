import os
import json
import uuid
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
from django.utils import timezone
from django.db import transaction

from seaserv import seafile_api, check_quota

from seahub.views import check_folder_permission
from seahub.api2.authentication import TokenAuthentication, SdocJWTTokenAuthentication
from seahub.api2.utils import api_error, user_to_dict, to_python_boolean
from seahub.api2.throttling import UserRateThrottle
from seahub.seadoc.utils import is_valid_seadoc_access_token, get_seadoc_upload_link, \
    get_seadoc_download_link, get_seadoc_file_uuid, gen_seadoc_access_token, \
    gen_seadoc_image_parent_path, get_seadoc_asset_upload_link, get_seadoc_asset_download_link, \
    can_access_seadoc_asset, is_seadoc_revision
from seahub.utils.file_types import SEADOC, IMAGE
from seahub.utils import get_file_type_and_ext, normalize_file_path, PREVIEW_FILEEXT, get_file_history, \
    gen_inner_file_get_url, gen_inner_file_upload_url
from seahub.tags.models import FileUUIDMap
from seahub.utils.error_msg import file_type_error_msg
from seahub.utils.repo import parse_repo_perm
from seahub.utils.file_revisions import get_file_revisions_within_limit
from seahub.seadoc.models import SeadocHistoryName, SeadocDraft, SeadocRevision
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils.timeutils import utc_datetime_to_isoformat_timestr, timestamp_to_isoformat_timestr
from seahub.base.models import FileComment
from seahub.constants import PERMISSION_READ_WRITE
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


class SeadocRevisionDownloadLinks(APIView):

    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

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

        
        file_download_link = get_seadoc_download_link(uuid_map)
        if not file_download_link:
            error_msg = 'seadoc file %s not found.' % uuid_map.filename
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
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
        
        origin_file_download_link = get_seadoc_download_link(origin_uuid_map)
        if not origin_file_download_link:
            error_msg = 'seadoc origin file %s not found.' % origin_uuid_map.filename
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        return Response({
            'file_download_link': file_download_link,
            'origin_file_download_link': origin_file_download_link
        })


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

        for file_comment in file_comments:
            comment = file_comment.to_dict()
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
        if not comment:
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
            comment_resolved = to_python_boolean(resolved)
            file_comment.resolved = comment_resolved
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
            for e in dirents:
                obj_name = e.obj_name
                seafile_api.copy_file(
                    repo_id, origin_image_parent_path,
                    json.dumps([obj_name]),
                    repo_id, revision_image_parent_path,
                    json.dumps([obj_name]),
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

        revision_queryset = SeadocRevision.objects.list_all_by_origin_doc_uuid(uuid_map.uuid)
        return Response({
            'count': revision_queryset.count()
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
        
        revision_queryset = SeadocRevision.objects.list_all_by_origin_doc_uuid(uuid_map.uuid)

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25
        start = (page - 1) * per_page
        limit = per_page + 1

        revisions_queryset= revision_queryset[start:limit]
        uuid_set = set()
        for item in revisions_queryset:
            uuid_set.add(item.doc_uuid)
            uuid_set.add(item.origin_doc_uuid)

        fileuuidmap_queryset = FileUUIDMap.objects.filter(uuid__in=list(uuid_set))
        revisions = [revision.to_dict(fileuuidmap_queryset) for revision in revisions_queryset]

        return Response({
            'count': revision_queryset.count(),
            'revisions': revisions
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

        # move revision file
        username = request.user.username
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

        # refresh docs
        doc_uuids = [revision.origin_doc_uuid, revision.doc_uuid]
        sdoc_server_api = SdocServerAPI(
            revision.origin_doc_uuid, origin_file_filename, username)
        sdoc_server_api.internal_refresh_docs(doc_uuids)

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

        revision = SeadocRevision.objects.get_by_doc_uuid(file_uuid)
        return Response(revision.to_dict())
