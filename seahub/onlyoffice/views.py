# Copyright (c) 2012-2017 Seafile Ltd.
import os
import jwt
import json
import logging
import requests
import posixpath
import time
import email.utils
import urllib.parse

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

from django.urls import reverse
from django.core.cache import cache
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from seaserv import seafile_api


from seahub.onlyoffice.settings import VERIFY_ONLYOFFICE_CERTIFICATE, ONLYOFFICE_JWT_SECRET
from seahub.onlyoffice.utils import get_onlyoffice_dict, get_doc_key_by_repo_id_file_path
from seahub.onlyoffice.utils import delete_doc_key, get_file_info_by_doc_key
from seahub.onlyoffice.converter_utils import get_file_name_without_ext, \
        get_file_ext, get_file_type, get_internal_extension
from seahub.onlyoffice.converter import get_converter_uri
from seahub.utils import gen_inner_file_upload_url, is_pro_version, \
    normalize_file_path, check_filename_with_rename, \
    gen_inner_file_get_url, get_service_url, get_file_type_and_ext, gen_file_get_url
from seahub.utils.file_op import if_locked_by_online_office
from seahub.views import check_folder_permission
from seahub.utils.file_types import SPREADSHEET



# Get an instance of a logger
logger = logging.getLogger('onlyoffice')


@csrf_exempt
def onlyoffice_editor_callback(request):
    """ Callback func of OnlyOffice.

    The document editing service informs the document storage service
    about status of the document editing using the callbackUrl from JavaScript API.
    The document editing service use the POST request with the information in body.

    https://api.onlyoffice.com/editors/callback
    """

    if request.method != 'POST':
        logger.error('Request method is not POST.')
        # The document storage service must return the following response.
        # otherwise the document editor will display an error message.
        return HttpResponse('{"error": 1}')

    # body info of POST rquest when open file on browser
    # {u'actions': [{u'type': 1, u'userid': u'uid-1527736776860'}],
    #  u'key': u'8062bdccf9b4cf809ae3',
    #  u'status': 1,
    #  u'users': [u'uid-1527736776860']}

    # body info of POST rquest when close file's web page (save file)
    # {u'actions': [{u'type': 0, u'userid': u'uid-1527736951523'}],
    # u'changesurl': u'...',
    # u'history': {u'changes': [{u'created': u'2018-05-31 03:17:17',
    #                            u'user': {u'id': u'uid-1527736577058',
    #                                      u'name': u'lian'}},
    #                           {u'created': u'2018-05-31 03:23:55',
    #                            u'user': {u'id': u'uid-1527736951523',
    #                                      u'name': u'lian'}}],
    #              u'serverVersion': u'5.1.4'},
    # u'key': u'61484dec693009f3d506',
    # u'lastsave': u'2018-05-31T03:23:55.767Z',
    # u'notmodified': False,
    # u'status': 2,
    # u'url': u'...',
    # u'users': [u'uid-1527736951523']}

    # Defines the status of the document. Can have the following values:
    # 0 - no document with the key identifier could be found,
    # 1 - document is being edited,
    # 2 - document is ready for saving,
    # 3 - document saving error has occurred,
    # 4 - document is closed with no changes,
    # 6 - document is being edited, but the current document state is saved,
    # 7 - error has occurred while force saving the document.

    # Status 1 is received every user connection to or disconnection from document co-editing.
    #
    # Status 2 (3) is received 10 seconds after the document is closed
    #              for editing with the identifier of the user who was the last to
    #              send the changes to the document editing service.
    #
    # Status 4 is received after the document is closed for editing with no changes by the last user.
    #
    # Status 6 (7) is received when the force saving request is performed.

    post_data = json.loads(request.body)
    status = int(post_data.get('status', -1))

    # get doc key and file basic info from database
    doc_key = post_data.get('key')
    doc_info = get_file_info_by_doc_key(doc_key)
    if not doc_info:

        logger.warning('status {}: can not get doc_info from database by doc_key {}'.format(status, doc_key))

        doc_info = cache.get(doc_key)
        if not doc_info:
            if status not in (1, 4):
                logger.error('status {}: can not get doc_info from cache by doc_key {}, post_data: {}'
                             .format(status, doc_key, post_data))
                return HttpResponse('{"error": 1}')
            else:
                # if the status is 1 and 4, the log level should not be error
                logger.info('status {}: can not get doc_info from database by doc_key {}'.format(status, doc_key))
                return HttpResponse('{"error": 1}')
        else:
            logger.info('status {}: get doc_info {} from cache by doc_key {}'.format(status, doc_info, doc_key))

    else:
        logger.info('status {}: get doc_info {} from database by doc_key {}'.format(status, doc_info, doc_key))

    if status == 1:

        actions = post_data.get('actions')
        if actions:
            if actions[0].get('type') == 1:
                logger.info('status {}, user connects: {}'.format(status, post_data))
            if actions[0].get('type') == 0:
                logger.info('status {}, user disconnects: {}'.format(status, post_data))
        else:
            logger.info('status {}: {}'.format(status, post_data))

        return HttpResponse('{"error": 0}')

    if status not in (2, 4, 6):
        logger.error('status {}: invalid status; doc_key {}.'.format(status, doc_key))
        return HttpResponse('{"error": 1}')

    repo_id = doc_info['repo_id']
    file_path = doc_info['file_path']
    username = doc_info['username']

    # save file
    if status in (2, 6):

        # Defines the link to the edited document to be saved with the document storage service.
        # The link is present when the status value is equal to 2 or 3 only.
        url = post_data.get('url')
        onlyoffice_resp = requests.get(url, verify=VERIFY_ONLYOFFICE_CERTIFICATE)
        if not onlyoffice_resp:
            logger.error('[OnlyOffice] No response from file content url.')
            return HttpResponse('{"error": 1}')

        fake_obj_id = {'online_office_update': True}
        update_token = seafile_api.get_fileserver_access_token(repo_id,
                                                               json.dumps(fake_obj_id),
                                                               'update',
                                                               username)

        if not update_token:
            logger.error('[OnlyOffice] No fileserver access token.')
            return HttpResponse('{"error": 1}')

        # get file content
        files = {'file': (os.path.basename(file_path), onlyoffice_resp.content)}
        data = {'target_file': file_path}

        # update file
        update_url = gen_inner_file_upload_url('update-api', update_token)
        resp = requests.post(update_url, files=files, data=data)
        if resp.status_code != 200:
            logger.error('update_url: {}'.format(update_url))
            logger.error('repo_id: {}, file_path: {}, content size: {}'.format(
                repo_id, file_path, len(onlyoffice_resp.content)))
            logger.error('response: {}'.format(resp.__dict__))

        # 2 - document is ready for saving,
        if status == 2:

            logger.info('status {}: delete doc_key {} from database'.format(status, doc_key))
            delete_doc_key(doc_key)
            cache.set(doc_key, doc_info, 24 * 60 * 60)

            if is_pro_version() and if_locked_by_online_office(repo_id, file_path):
                logger.info('status {}: unlock {} in repo_id {}'.format(status, file_path, repo_id))
                seafile_api.unlock_file(repo_id, file_path)

    # 4 - document is closed with no changes,
    if status == 4:

        logger.info('status {}: delete doc_key {} from database'.format(status, doc_key))
        delete_doc_key(doc_key)
        cache.set(doc_key, doc_info, 24 * 60 * 60)

        if is_pro_version() and if_locked_by_online_office(repo_id, file_path):
            logger.info('status {}: unlock {} in repo_id {}'.format(status, file_path, repo_id))
            seafile_api.unlock_file(repo_id, file_path)

    return HttpResponse('{"error": 0}')


class OnlyofficeConvert(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):

        repo_id = request.data.get('repo_id')
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(400, error_msg)

        file_path = request.data.get('file_path')
        if not file_path:
            error_msg = 'file_path invalid.'
            return api_error(400, error_msg)

        file_path = normalize_file_path(file_path)
        parent_dir = os.path.dirname(file_path)

        file_ext = get_file_ext(file_path)
        file_type = get_file_type(file_path)
        new_ext = get_internal_extension(file_type)

        if not new_ext:
            logger.error('[OnlyOffice] Could not generate internal extension.')
            error_msg = 'Internal Server Error'
            return api_error(500, error_msg)

        username = request.user.username
        doc_dic = get_onlyoffice_dict(request, username, repo_id, file_path)
        new_uri = get_converter_uri(doc_dic["doc_url"], file_ext, new_ext,
                                    doc_dic["doc_key"], False,
                                    request.data.get('file_password'))

        if not new_uri:
            logger.error('[OnlyOffice] No response from file converter.')
            error_msg = 'Internal Server Error'
            return api_error(500, error_msg)

        onlyoffice_resp = requests.get(new_uri, verify=VERIFY_ONLYOFFICE_CERTIFICATE)
        if not onlyoffice_resp:
            logger.error('[OnlyOffice] No response from file content url.')
            error_msg = 'Internal Server Error'
            return api_error(500, error_msg)

        fake_obj_id = {'parent_dir': parent_dir}
        upload_token = seafile_api.get_fileserver_access_token(repo_id,
                                                               json.dumps(fake_obj_id),
                                                               'upload-link',
                                                               username)

        if not upload_token:
            logger.error('[OnlyOffice] No fileserver access token.')
            error_msg = 'Internal Server Error'
            return api_error(500, error_msg)

        file_name = get_file_name_without_ext(file_path) + new_ext
        file_name = check_filename_with_rename(repo_id, parent_dir, file_name)

        files = {'file': (file_name, onlyoffice_resp.content)}
        data = {'parent_dir': parent_dir}
        upload_url = gen_inner_file_upload_url('upload-api', upload_token)

        try:
            file_name.encode('ascii')
        except UnicodeEncodeError:

            def rewrite_request(prepared_request):

                old_content = 'filename*=' + email.utils.encode_rfc2231(file_name, 'utf-8')
                old_content = old_content.encode()

                # new_content = 'filename="{}"\r\n\r\n'.format(file_name)
                new_content = 'filename="{}"'.format(file_name)
                new_content = new_content.encode()

                prepared_request.body = prepared_request.body.replace(old_content, new_content)

                return prepared_request

            resp = requests.post(upload_url, files=files, data=data, auth=rewrite_request)
        else:
            resp = requests.post(upload_url, files=files, data=data)

        if resp.status_code != 200:
            logger.error('upload_url: {}'.format(upload_url))
            logger.error('content size: {}'.format(len(onlyoffice_resp.content)))
            logger.error('parameter parent_dir: {}'.format(files['parent_dir']))
            logger.error('response: {}'.format(resp.__dict__))

        result = {}
        result['parent_dir'] = parent_dir
        result['file_name'] = file_name
        result['file_path'] = posixpath.join(parent_dir, file_name)

        return Response(result)


class OnlyofficeFileHistory(APIView):

    throttle_classes = (UserRateThrottle,)

    def get(self, request):

        if not ONLYOFFICE_JWT_SECRET:
            error_msg = 'feature is not enabled.'
            return api_error(501, error_msg)

        bearer_string = request.headers.get('authorization', '')
        if not bearer_string:
            logger.error('No authentication header.')
            error_msg = 'No authentication header.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        bearer_list = bearer_string.split()
        if len(bearer_list) != 2 or bearer_list[0].lower() != 'bearer':
            logger.error(f'Bearer {bearer_string} invalid')
            error_msg = 'Bearer invalid.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        token = bearer_list[1]
        try:
            payload = jwt.decode(token, ONLYOFFICE_JWT_SECRET, algorithms=['HS256'])
        except Exception as e:
            logger.error(e)
            logger.error(token)
            error_msg = 'Decode JWT token failed.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        payload = payload.get('payload')
        if not payload:
            logger.error(payload)
            error_msg = 'Payload invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        url = payload.get('url')
        if not url:
            logger.error(payload)
            error_msg = 'No url in payload.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        query_string = request.META.get('QUERY_STRING', '')
        if request.path not in url or query_string not in url:
            error_msg = 'Bearer invalid.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        parsed_url = urllib.parse.urlparse(url)
        query_parameters = urllib.parse.parse_qs(parsed_url.query)
        # username = query_parameters.get('username')[0]
        repo_id = query_parameters.get('repo_id')[0]
        file_path = query_parameters.get('path')[0]
        obj_id = query_parameters.get('obj_id')[0]

        if not repo_id or not file_path or not obj_id:
            logger.error(url)
            error_msg = 'url invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_name = os.path.basename(file_path)
        fileserver_token = seafile_api.get_fileserver_access_token(repo_id,
                                                                   obj_id,
                                                                   'view',
                                                                   '',
                                                                   use_onetime=False)

        inner_path = gen_inner_file_get_url(fileserver_token, file_name)
        file_content = urllib.request.urlopen(inner_path).read()
        return HttpResponse(file_content, content_type="application/octet-stream")


class OnlyofficeGetHistoryFileAccessToken(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):

        if not ONLYOFFICE_JWT_SECRET:
            error_msg = 'feature is not enabled.'
            return api_error(501, error_msg)

        repo_id = request.data.get('repo_id')
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_path = request.data.get('file_path')
        if not file_path:
            error_msg = 'file_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        obj_id = request.data.get('obj_id')
        if not obj_id:
            error_msg = 'obj_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not seafile_api.get_repo(repo_id):
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        if not seafile_api.check_permission_by_path(repo_id, '/', username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        service_url = get_service_url().rstrip('/')
        url = reverse('onlyoffice_api_file_history')
        query_dict = {
            "username": username,
            "repo_id": repo_id,
            "path": file_path,
            "obj_id": obj_id
        }
        query_string = urllib.parse.urlencode(query_dict)
        full_url = f"{service_url}{url}?{query_string}"

        payload = {}
        payload['key'] = obj_id
        payload['url'] = full_url
        payload['version'] = obj_id
        payload['exp'] = int(time.time()) + 3 * 24 * 3600

        jwt_token = jwt.encode(payload, ONLYOFFICE_JWT_SECRET)
        payload['token'] = jwt_token

        return Response({"data": payload})


class OnlyofficeGetReferenceData(APIView):

    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        instance_id = request.data.get('instanceId')
        file_key = request.data.get('fileKey')

        username = request.user.username

        try:
            payload = jwt.decode(file_key, ONLYOFFICE_JWT_SECRET, algorithms=['HS256'])
        except:
            err_msg = 'File key invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, err_msg)

        source_repo_id = payload.get('repo_id')
        source_file_path = payload.get('file_path')

        if not seafile_api.get_repo(source_repo_id):
            error_msg = 'Library %s not found.' % source_repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_id = seafile_api.get_file_id_by_path(source_repo_id, source_file_path)
        if not file_id:
            error_msg = 'Souce file does not exist'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        doc_key = get_doc_key_by_repo_id_file_path(source_repo_id, source_file_path)
        file_name = os.path.basename(source_file_path.rstrip('/'))
        parent_dir = os.path.dirname(source_file_path.rstrip('/'))
        if check_folder_permission(request, source_repo_id, parent_dir) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        filetype, fileext = get_file_type_and_ext(source_file_path)
        if filetype != SPREADSHEET:
            err_msg = 'file type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, err_msg)

        file_id = seafile_api.get_file_id_by_path(source_repo_id,
                                                  source_file_path)
        dl_token = seafile_api.get_fileserver_access_token(
            source_repo_id,
            file_id,
            'download',
            username,
            use_onetime=False
        )

        doc_url = gen_file_get_url(dl_token, file_name)
        link = "%s%s"% (instance_id, reverse('view_lib_file', args=[
            source_repo_id, source_file_path]))

        result = {
            "fileType": fileext,
            "key": doc_key,
            "path": file_name,
            "referenceData": {
                "fileKey": file_key,
                "instanceId": instance_id,
            },
            "url": doc_url,
            "link": link
        }
        result['token'] = jwt.encode(result, ONLYOFFICE_JWT_SECRET)
        return Response({'data': result})
