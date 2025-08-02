import os
import logging
import requests
import posixpath
import base64

from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated

from seaserv import seafile_api

from seahub.utils.error_msg import file_type_error_msg
from seahub.views import check_folder_permission
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.exdraw.utils import is_valid_exdraw_access_token, get_exdraw_upload_link, get_exdraw_download_link, \
    get_exdraw_file_uuid, gen_exdraw_access_token, gen_exdraw_image_parent_path, get_exdraw_asset_upload_link, \
    get_exdraw_asset_download_link

from seahub.utils.file_types import EXCALIDRAW, IMAGE
from seahub.utils.file_op import if_locked_by_online_office
from seahub.utils import get_file_type_and_ext, normalize_file_path, is_pro_version, PREVIEW_FILEEXT
from seahub.tags.models import FileUUIDMap


logger = logging.getLogger(__name__)


class ExdrawAccessToken(APIView):
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
        if filetype != EXCALIDRAW:
            error_msg = 'exdraw file type %s invalid.' % filetype
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

        file_uuid = get_exdraw_file_uuid(repo, path)
        access_token = gen_exdraw_access_token(file_uuid, filename, username, permission=permission)

        return Response({'access_token': access_token})


class ExdrawUploadFile(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle, )

    def post(self, request, file_uuid):
        # jwt permission check
        auth = request.headers.get('authorization', '').split()
        if not is_valid_exdraw_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        file = request.FILES.get('file', None)
        if not file:
            error_msg = 'file not found.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'exdraw uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        filetype, fileext = get_file_type_and_ext(uuid_map.filename)
        if filetype != EXCALIDRAW:
            error_msg = 'exdraw file type %s invalid.' % filetype
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_path = posixpath.join(uuid_map.parent_path, uuid_map.filename)
        file_path = os.path.normpath(file_path)
        file_id = seafile_api.get_file_id_by_path(uuid_map.repo_id, file_path)
        if not file_id:  # save file anyway
            seafile_api.post_empty_file(
                uuid_map.repo_id, uuid_map.parent_path, uuid_map.filename, '')

        last_modify_user = request.POST.get('last_modify_user', '')
        upload_link = get_exdraw_upload_link(uuid_map, last_modify_user)
        if not upload_link:
            error_msg = 'exdraw file %s not found.' % uuid_map.filename
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # update file
        files = {'file': file}
        data = {'filename': uuid_map.filename, 'target_file': file_path}
        resp = requests.post(upload_link, files=files, data=data)
        if not resp.ok:
            logger.error('save exdraw failed %s, %s' % (file_uuid, resp.text))
            return api_error(resp.status_code, resp.content)

        return Response({'success': True})


class ExdrawDownloadLink(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid):
        # jwt permission check
        auth = request.headers.get('authorization', '').split()
        if not is_valid_exdraw_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'exdraw uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        filetype, fileext = get_file_type_and_ext(uuid_map.filename)
        if filetype != EXCALIDRAW:
            error_msg = 'exdraw file type %s invalid.' % filetype
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        download_link = get_exdraw_download_link(uuid_map)
        if not download_link:
            error_msg = 'exdraw file %s not found.' % uuid_map.filename
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return Response({'download_link': download_link})


class ExdrawEditorCallBack(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def post(self, request, file_uuid):
        # jwt permission check
        auth = request.headers.get('authorization', '').split()
        if not is_valid_exdraw_access_token(auth, file_uuid):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # file info check
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'exdraw uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        filetype, fileext = get_file_type_and_ext(uuid_map.filename)
        if filetype != EXCALIDRAW:
            error_msg = 'exdraw file type %s invalid.' % filetype
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # currently only implement unlock file
        exdraw_status = request.POST.get('status', '')
        if exdraw_status != 'no_write':
            error_msg = 'status invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # unlock file
        repo_id = uuid_map.repo_id
        file_path = posixpath.join(uuid_map.parent_path, uuid_map.filename)
        file_path = os.path.normpath(file_path)
        try:
            if is_pro_version() and if_locked_by_online_office(repo_id, file_path):
                seafile_api.unlock_file(repo_id, file_path)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class ExdrawUploadImage(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)
    
    def post(self, request, file_uuid):
        """image path: /images/exdraw/${sdocUuid}/${filename}
        """
        # jwt permission check
        auth = request.headers.get('authorization', '').split()
        is_valid, payload = is_valid_exdraw_access_token(auth, file_uuid, return_payload=True)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        # file info check
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'exdraw uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        filetype, fileext = get_file_type_and_ext(uuid_map.filename)
        if filetype != EXCALIDRAW:
            error_msg = 'exdraw file type %s invalid.' % filetype
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        base64_data = request.data.get('image_data')
        image_id = request.data.get('image_id')
        if not base64_data:
            error_msg = 'Base64 image data is required.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if not image_id:
            error_msg = 'image_id is required'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        repo_id = uuid_map.repo_id
        username = payload.get('username', '')
        parent_path = gen_exdraw_image_parent_path(file_uuid, repo_id, username)
        
        upload_link = get_exdraw_asset_upload_link(repo_id, parent_path, username)

        try:
            if base64_data.startswith('data:'):
                data_parts = base64_data.split(';base64,')
                if len(data_parts) != 2:
                    error_msg = 'Invalid base64 format.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
                mime_type = data_parts[0].split(':')[1]
                encoded_data = data_parts[1]
            else:
                encoded_data = base64_data
                mime_type = 'image/jpeg'
    
            decoded_data = base64.b64decode(encoded_data)
    
            file_ext = mime_type.split('/')[-1]
            filename = f"{image_id}.{file_ext}"
    
            file_path = posixpath.join(parent_path, filename)
            file_path = os.path.normpath(file_path)
            import io
            files = {'file': (filename, io.BytesIO(decoded_data), mime_type)}
            data = {'parent_dir': parent_path, 'filename': filename, 'target_file': file_path}
    
            resp = requests.post(upload_link, files=files, data=data)
            if not resp.ok:
                logger.error(resp.text)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
    
            image_url = '/' + filename
            return Response({'relative_path': image_url})
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
    
class ExdrawDownloadImage(APIView):

    authentication_classes = ()
    permission_classes = ()
    throttle_classes = (UserRateThrottle, )

    def get(self, request, file_uuid, filename):
    
        # jwt permission check
        auth = request.headers.get('authorization', '').split()
        is_valid, payload = is_valid_exdraw_access_token(auth, file_uuid, return_payload=True)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map:
            error_msg = 'exdraw uuid %s not found.' % file_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = uuid_map.repo_id
        username = payload.get('username')
        
        parent_path = gen_exdraw_image_parent_path(file_uuid, repo_id, username)
        download_link = get_exdraw_asset_download_link(repo_id, parent_path, filename, username)
        if not download_link:
            error_msg = 'file %s not found.' % filename
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        resp = requests.get(download_link)
        if not resp.ok:
            logger.error(resp.text)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        filetype, fileext = get_file_type_and_ext(filename)
        response = HttpResponse(
            content=resp.content, content_type='image/' + fileext)
        response['Cache-Control'] = 'private, max-age=%s' % (3600 * 24 * 7)
        return response
