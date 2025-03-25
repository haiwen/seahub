import os
import base64
import posixpath
import logging
import requests

from constance import config
from urllib.parse import urljoin, quote, unquote

import xml.etree.ElementTree as ET

from django.http import HttpResponse

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from seahub.settings import SERVICE_URL
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.profile.models import Profile
from seahub.utils.repo import is_repo_owner
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email

from seahub.ocm_via_webdav.models import ReceivedShares, Shares
from seahub.ocm_via_webdav.settings import ENABLE_OCM_VIA_WEBDAV, \
        OCM_VIA_WEBDAV_OCM_ENDPOINT, OCM_VIA_WEBDAV_OCM_PROVIDER_URI, \
        OCM_VIA_WEBDAV_NOTIFICATIONS_URI, OCM_VIA_WEBDAV_PROVIDER_ID, \
        OCM_VIA_WEBDAV_REMOTE_SERVERS

logger = logging.getLogger(__name__)


def get_remote_domain_by_shared_by(shared_by):

    return f"https://{shared_by.split('@')[-1]}"


def get_remote_webdav_root_uri(remote_domain):

    ocm_provider_url = urljoin(remote_domain, OCM_VIA_WEBDAV_OCM_PROVIDER_URI)
    resp = requests.get(ocm_provider_url)

    # {
    #     'apiVersion': '1.0-proposal1',
    #     'enabled': True,
    #     'endPoint': 'https://nextcloud.seafile.top/index.php/ocm',
    #     'resourceTypes': [
    #         {
    #             'name': 'file',
    #             'protocols': {'webdav': '/public.php/webdav/'},
    #             'shareTypes': ['user', 'group']
    #         }
    #     ]
    # }

    resource_types = resp.json().get('resourceTypes', [])
    if not resource_types:
        logger.error('Can not get resource_types from {}'.format(ocm_provider_url))
        logger.error(resp.content)
        return ''

    protocols = resource_types[0].get('protocols')
    if not protocols:
        logger.error('Can not get protocols from {}'.format(ocm_provider_url))
        logger.error(resp.content)
        return ''

    root_webdav_uri = protocols.get('webdav')
    if not root_webdav_uri:
        logger.error('Can not get webdav root uri from {}'.format(ocm_provider_url))
        logger.error(resp.content)
        return ''

    return root_webdav_uri


def get_remote_webdav_root_href(remote_domain):

    root_webdav_uri = get_remote_webdav_root_uri(remote_domain)
    if not root_webdav_uri:
        return ''

    return urljoin(remote_domain, root_webdav_uri)


def get_webdav_auth_headers(shared_secret):

    def format_string(string):
        return string + (4 - len(string) % 4) * ':'

    token = base64.b64encode('{}'.format(format_string(shared_secret)).encode('utf-8'))
    headers = {"Authorization": "Basic {}".format(token.decode('utf-8'))}

    return headers


def get_remote_ocm_endpoint(remote_domain):

    ocm_provider_url = urljoin(remote_domain, OCM_VIA_WEBDAV_OCM_PROVIDER_URI)
    resp = requests.get(ocm_provider_url)
    end_point = resp.json().get('endPoint')

    if not end_point:
        logger.error('Can not get endPoint from {}'.format(ocm_provider_url))
        logger.error(resp.content)
        return ''

    return end_point if end_point.endswith('/') else end_point + '/'


class OCMProviderView(APIView):

    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        Return ocm protocol info to remote server
        """

        result = {}

        if ENABLE_OCM:

            result = {
                'enabled': True,
                'apiVersion': OCM_API_VERSION,
                'endPoint': SERVICE_URL + '/' + OCM_ENDPOINT,
                'resourceTypes': {
                    'name': OCM_RESOURCE_TYPE_LIBRARY,
                    'shareTypes': OCM_SHARE_TYPES,
                    'protocols': {
                        OCM_SEAFILE_PROTOCOL: OCM_SEAFILE_PROTOCOL,
                    }
                }
            }

        if ENABLE_OCM_VIA_WEBDAV:

            result = {
                'apiVersion': '1.0-proposal1',
                'enabled': True,
                'endPoint': urljoin(SERVICE_URL, OCM_VIA_WEBDAV_OCM_ENDPOINT),
                'resourceTypes': [{
                    'name': 'file',
                    'protocols': {'webdav': 'seafdav'},
                    'shareTypes': ['user'],
                }]
            }

        return Response(result)


class SharesView(APIView):

    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """
        Receive share from other service
        """

        if not ENABLE_OCM_VIA_WEBDAV:
            error_msg = 'OCM via webdav feature is not enabled.'
            logger.error(error_msg)
            return api_error(501, error_msg)

        # {'description': '',
        #  'name': 'file-2  in lian-test folder.md',
        #  'owner': 'seafile@nextcloud.seafile.top',
        #  'ownerDisplayName': 'seafile',
        #  'protocol': {'name': 'webdav',
        #               'options': {'permissions': '{http://open-cloud-mesh.org/ns}share-permissions',
        #                           'sharedSecret': 'O2T5CYSqjPWfaYh'}},
        #  'providerId': 11,
        #  'resourceType': 'file',
        #  'shareType': 'user',
        #  'shareWith': 'lian@lian.com@https://test.seafile.com',
        #  'sharedBy': 'seafile@nextcloud.seafile.top',
        #  'sharedByDisplayName': 'seafile'}

        protocol_dict = request.data.get('protocol', {})
        protocol_name = protocol_dict.get('name')
        shared_secret = protocol_dict.get('options').get('sharedSecret')
        permissions = protocol_dict.get('options').get('permissions')

        owner = request.data.get('owner')
        owner_display_name = request.data.get('owner_display_name')

        name = request.data.get('name')
        description = request.data.get('description')
        provider_id = request.data.get('providerId')
        resource_type = request.data.get('resourceType')
        share_type = request.data.get('shareType')
        share_with = request.data.get('shareWith').split('http')[0].rstrip('@')
        shared_by = request.data.get('sharedBy')
        shared_by_display_name = request.data.get('sharedByDisplayName')

        share_with_ccnet_email = Profile.objects.get_username_by_contact_email(share_with)
        share = ReceivedShares(description=description,
                               name=name,
                               owner=owner,
                               owner_display_name=owner_display_name,
                               protocol_name=protocol_name,
                               shared_secret=shared_secret,
                               permissions=permissions,
                               provider_id=provider_id,
                               resource_type=resource_type,
                               share_type=share_type,
                               share_with=share_with_ccnet_email or share_with,
                               shared_by=shared_by,
                               shared_by_display_name=shared_by_display_name)
        share.save()

        # get webdav url
        remote_domain = get_remote_domain_by_shared_by(shared_by)
        webdav_root_href = get_remote_webdav_root_href(remote_domain)
        if not webdav_root_href:
            logger.error("Can't get remote webdav root href")
            error_msg = 'Internal Server Error'
            return api_error(501, error_msg)

        headers = get_webdav_auth_headers(shared_secret)
        prepared_request = requests.Request('propfind',
                                            webdav_root_href,
                                            headers=headers).prepare()

        request_session = requests.Session()
        resp = request_session.send(prepared_request)

        root = ET.fromstring(resp.content)
        if root[0].find('{DAV:}propstat') \
                  .find('{DAV:}prop') \
                  .find('{DAV:}resourcetype') \
                  .find('{DAV:}collection') is not None:
            share.is_dir = True
            share.save()

        result = {
            "recipientDisplayName": email2nickname(share_with)
        }
        return Response(result, status=status.HTTP_201_CREATED)


class ReceivedSharesView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        Get items shared from other service.
        """

        if not ENABLE_OCM_VIA_WEBDAV:
            error_msg = 'OCM via webdav feature is not enabled.'
            return api_error(501, error_msg)

        username = request.user.username

        info_list = []
        for share in ReceivedShares.objects.filter(share_with=username):

            info = {}
            info['id'] = share.id
            info['name'] = share.name
            info['ctime'] = share.ctime
            info['is_dir'] = share.is_dir
            info['shared_by'] = share.shared_by
            info['path'] = '/'

            info_list.append(info)

        result = {
            'received_share_list': info_list,
        }
        return Response(result)


class ReceivedShareView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, share_id):

        if not ENABLE_OCM_VIA_WEBDAV:
            error_msg = 'OCM via webdav feature is not enabled.'
            logger.error(error_msg)
            return api_error(501, error_msg)

        path = request.GET.get('path')
        if not path:
            error_msg = 'path invalid.'
            logger.error(error_msg)
            return api_error(400, error_msg)

        try:
            share = ReceivedShares.objects.get(id=share_id)
        except ReceivedShares.DoesNotExist:
            error_msg = "OCM share {} not found.".format(share_id)
            logger.error(error_msg)
            return api_error(404, error_msg)

        username = request.user.username
        if share.share_with != username:
            error_msg = 'Permission denied.'
            logger.error(error_msg)
            return api_error(403, error_msg)

        remote_domain = get_remote_domain_by_shared_by(share.shared_by)
        webdav_root_uri = get_remote_webdav_root_uri(remote_domain)

        if path == '/':
            webdav_uri = webdav_root_uri
        else:
            webdav_uri = posixpath.join(webdav_root_uri, path.lstrip('/'))

        webdav_href = urljoin(remote_domain, webdav_uri)
        headers = get_webdav_auth_headers(share.shared_secret)

        prepared_request = requests.Request('propfind',
                                            webdav_href,
                                            headers=headers).prepare()
        request_session = requests.Session()
        resp = request_session.send(prepared_request)

        if resp.status_code != 207:
            logger.error(resp.content)
            error_msg = 'Internal Server Error'
            return api_error(501, error_msg)

        info_list = []
        root = ET.fromstring(resp.content)
        for child in root:

            href_text = child.find('{DAV:}href').text
            href_text = unquote(href_text)
            if href_text == webdav_uri:
                continue

            is_collection = child.find('{DAV:}propstat') \
                                 .find('{DAV:}prop') \
                                 .find('{DAV:}resourcetype') \
                                 .find('{DAV:}collection') is not None

            last_modified = child.find('{DAV:}propstat') \
                                 .find('{DAV:}prop') \
                                 .find('{DAV:}getlastmodified').text

            info = {}
            info['id'] = share_id
            info['name'] = unquote(os.path.basename(href_text.rstrip('/')))
            info['ctime'] = last_modified
            info['shared_by'] = share.shared_by

            if is_collection:
                info['is_dir'] = True
                info['path'] = href_text.replace(webdav_root_uri.rstrip('/'), '')
            else:
                info['is_dir'] = False
                info['path'] = href_text.replace(webdav_root_uri, '')

            info_list.append(info)

        result = {
            'received_share_list': info_list,
            'parent_dir': posixpath.join('/', share.name, path.lstrip('/'))
        }
        return Response(result)

    def delete(self, request, share_id):
        """
        Delete item shared from other service.
        """

        if not ENABLE_OCM_VIA_WEBDAV:
            error_msg = 'OCM via webdav feature is not enabled.'
            logger.error(error_msg)
            return api_error(501, error_msg)

        try:
            share = ReceivedShares.objects.get(id=share_id)
        except ReceivedShares.DoesNotExist:
            error_msg = "OCM share {} not found.".format(share_id)
            logger.error(error_msg)
            return api_error(404, error_msg)

        username = request.user.username
        if share.share_with != username:
            error_msg = 'Permission denied.'
            logger.error(error_msg)
            return api_error(403, error_msg)

        # get remote server endpoint
        remote_domain = get_remote_domain_by_shared_by(share.shared_by)
        ocm_endpoint = get_remote_ocm_endpoint(remote_domain)
        if not ocm_endpoint:
            error_msg = 'Internal Server Error'
            logger.error(error_msg)
            return api_error(501, error_msg)

        notifications_url = urljoin(ocm_endpoint, OCM_VIA_WEBDAV_NOTIFICATIONS_URI.lstrip('/'))

        # send SHARE_DECLINED notification
        data = {
            "notification": {
                "message": "Recipient declined the share",
                "sharedSecret": ""
            },
            "notificationType": "SHARE_DECLINED",
            "providerId": "",
            "resourceType": ""
        }

        data['notification']['sharedSecret'] = share.shared_secret
        data['providerId'] = share.provider_id
        data['resourceType'] = share.resource_type

        resp = requests.post(notifications_url, json=data)
        if resp.status_code != 201:
            logger.error('Error occurred when send notification to {}'.format(notifications_url))
            logger.error(resp.content)

        share.delete()

        result = {
            'success': True
        }
        return Response(result)


class DownloadReceivedFileView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        Download received file.
        """

        if not ENABLE_OCM_VIA_WEBDAV:
            error_msg = 'OCM via webdav feature is not enabled.'
            logger.error(error_msg)
            return api_error(501, error_msg)

        # parameter check
        share_id = request.GET.get('share_id')
        if not share_id:
            error_msg = 'share_id invalid.'
            logger.error(error_msg)
            return api_error(400, error_msg)

        try:
            share_id = int(share_id)
        except ValueError as e:
            logger.error(e)
            error_msg = 'share_id invalid.'
            logger.error(error_msg)
            return api_error(400, error_msg)

        path = request.GET.get('path')
        if not path:
            error_msg = 'path invalid.'
            logger.error(error_msg)
            return api_error(400, error_msg)

        # resource check
        try:
            share = ReceivedShares.objects.get(id=share_id)
        except ReceivedShares.DoesNotExist:
            error_msg = "OCM share {} not found.".format(share_id)
            logger.error(error_msg)
            return api_error(404, error_msg)

        username = request.user.username
        if share.share_with != username:
            error_msg = 'Permission denied.'
            logger.error(error_msg)
            return api_error(403, error_msg)

        # download file via webdav
        remote_domain = get_remote_domain_by_shared_by(share.shared_by)
        headers = get_webdav_auth_headers(share.shared_secret)

        if path == '/':
            webdav_href = get_remote_webdav_root_href(remote_domain)
        else:
            webdav_href = urljoin(get_remote_webdav_root_href(remote_domain), quote(path))

        download_file_resp = requests.get(webdav_href, headers=headers)
        response = HttpResponse(download_file_resp.content, content_type="application/octet-stream")

        if path == '/':
            filename = share.name
        else:
            filename = os.path.basename(path)

        response['Content-Disposition'] = 'attachment; filename={}'.format(filename)

        return response


class NotificationsView(APIView):

    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """
        Receive notification from remote server.
        """

        if not ENABLE_OCM_VIA_WEBDAV:
            error_msg = 'OCM via webdav feature is not enabled.'
            logger.error(error_msg)
            return api_error(501, error_msg)

        error_result_not_found = {
            "message": "RESOURCE_NOT_FOUND",
            "validationErrors": [
                {
                    "name": "",
                    "message": "NOT_FOUND"
                }
            ]
        }

        provider_id = request.data.get('providerId')
        notification_type = request.data.get('notificationType')

        notification_dict = request.data.get('notification')
        shared_secret = notification_dict.get('sharedSecret')

        # {'notification': {'messgage': 'file is no longer shared with you',
        #                   'sharedSecret': 'QoVQuBhqphvVYvz'},
        #  'notificationType': 'SHARE_UNSHARED',
        #  'providerId': '13',
        #  'resourceType': 'file'}
        if notification_type == 'SHARE_UNSHARED':

            try:
                share = ReceivedShares.objects.get(shared_secret=shared_secret)
            except ReceivedShares.DoesNotExist:
                error_msg = "OCM share with secret {} not found.".format(shared_secret)
                logger.error(error_msg)
                error_result_not_found['validationErrors'][0]['name'] = 'sharedSecret'
                return Response(error_result_not_found, status=400)

            if share.provider_id != provider_id:
                error_msg = "OCM share with provider id {} not found.".format(provider_id)
                logger.error(error_msg)
                error_result_not_found['validationErrors'][0]['name'] = 'providerID'
                return Response(error_result_not_found, status=400)

            share.delete()

        # {'notification': {'message': 'Recipient declined the share',
        #                   'sharedSecret': 'ODQyOWZhMGUtMmYxNi00NjMxLWFkZTMtNjE2NzBkYjU5ZDE5Oi8='},
        #  'notificationType': 'SHARE_DECLINED',
        #  'providerId': '71687320-6219-47af-82f3-32012707a5ae',
        #  'resourceType': 'file'}
        if notification_type == 'SHARE_DECLINED':

            try:
                share = Shares.objects.get(shared_secret=shared_secret)
            except Shares.DoesNotExist:
                error_msg = "OCM share with secret {} not found.".format(shared_secret)
                logger.error(error_msg)
                error_result_not_found['validationErrors']['name'] = 'sharedSecret'
                return Response(error_result_not_found, status=400)

            if share.provider_id != provider_id:
                error_msg = "OCM share with provider id {} not found.".format(provider_id)
                logger.error(error_msg)
                error_result_not_found['validationErrors'][0]['name'] = 'providerID'
                return Response(error_result_not_found, status=400)

            share.accepted = False
            share.save()

        # {'notification': {'message': 'Recipient accept the share',
        #                   'sharedSecret': 'ODQyOWZhMGUtMmYxNi00NjMxLWFkZTMtNjE2NzBkYjU5ZDE5Oi8='},
        #  'notificationType': 'SHARE_ACCEPTED',
        #  'providerId': '71687320-6219-47af-82f3-32012707a5ae',
        #  'resourceType': 'file'}
        if notification_type == 'SHARE_ACCEPTED':

            try:
                share = Shares.objects.get(shared_secret=shared_secret)
            except Shares.DoesNotExist:
                error_msg = "OCM share with secret {} not found.".format(shared_secret)
                logger.error(error_msg)
                error_result_not_found['validationErrors']['name'] = 'sharedSecret'
                return Response(error_result_not_found, status=400)

            if share.provider_id != provider_id:
                error_msg = "OCM share with provider id {} not found.".format(provider_id)
                logger.error(error_msg)
                error_result_not_found['validationErrors'][0]['name'] = 'providerID'
                return Response(error_result_not_found, status=400)

            share.accepted = True
            share.save()

        return Response({'success': True}, status=status.HTTP_201_CREATED)


class ShareToNextcloud(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        List shares to Nextcloud server.
        """

        if not ENABLE_OCM_VIA_WEBDAV:
            error_msg = 'OCM via webdav feature is not enabled.'
            logger.error(error_msg)
            return api_error(501, error_msg)

        # parameter check
        repo_id = request.GET.get('repo_id')
        if not repo_id:
            error_msg = 'repo_id invalid.'
            logger.error(error_msg)
            return api_error(400, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            logger.error(error_msg)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('path')
        if not path:
            error_msg = 'path invalid.'
            logger.error(error_msg)
            return api_error(400, error_msg)

        if not seafile_api.get_file_id_by_path(repo_id, path):
            error_msg = 'File %s not found.' % path
            logger.error(error_msg)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_repo_owner(request, repo_id, username):
            error_msg = 'Permission denied.'
            logger.error(error_msg)
            return api_error(403, error_msg)

        params = {
            "repo_id": repo_id,
            "path": path,
        }
        shares = Shares.objects.filter(**params)

        ocm_share_list = []
        for share in shares:

            ocm_info = {}

            share_with = share.share_with
            to_server_url = share_with.split('@')[-1]
            to_user = share_with.split('@' + to_server_url)[0]

            ocm_info['id'] = share.id
            ocm_info['to_server_url'] = to_server_url
            ocm_info['to_user'] = to_user

            ocm_info['accepte_status'] = ''
            if share.accepted is None:
                ocm_info['accepte_status'] = 'waiting'
            elif share.accepted:
                ocm_info['accepte_status'] = 'accepted'
            else:
                ocm_info['accepte_status'] = 'not accepted'

            ocm_info['repo_id'] = share.repo_id
            ocm_info['path'] = share.path
            ocm_info['shared_secret'] = share.shared_secret

            ocm_share_list.append(ocm_info)

        return Response({'data': ocm_share_list})

    def post(self, request):
        """
        Share library to Nextcloud server.
        """

        if not ENABLE_OCM_VIA_WEBDAV:
            error_msg = 'OCM via webdav feature is not enabled.'
            logger.error(error_msg)
            return api_error(501, error_msg)

        # parameter check
        to_server_url = request.data.get('to_server_url')
        if not to_server_url or \
                to_server_url not in [item.get('server_url') for item in
                                      OCM_VIA_WEBDAV_REMOTE_SERVERS]:
            error_msg = 'to_server_url invalid.'
            logger.error(error_msg)
            return api_error(400, error_msg)

        to_user = request.data.get('to_user')
        if not to_user:
            error_msg = 'to_user invalid.'
            logger.error(error_msg)
            return api_error(400, error_msg)

        repo_id = request.data.get('repo_id')
        if not repo_id:
            error_msg = 'repo_id invalid.'
            logger.error(error_msg)
            return api_error(400, error_msg)

        path = request.data.get('path')
        if not path:
            error_msg = 'path invalid.'
            logger.error(error_msg)
            return api_error(400, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            logger.error(error_msg)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_file_id_by_path(repo_id, path):
            error_msg = 'File %s not found.' % path
            logger.error(error_msg)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        params = {
            "repo_id": repo_id,
            "path": path,
        }
        if Shares.objects.filter(**params):
            error_msg = f'Share for repo_id: {repo_id} path: {path} already exists.'
            logger.error(error_msg)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_repo_owner(request, repo_id, username):
            error_msg = 'Permission denied.'
            logger.error(error_msg)
            return api_error(403, error_msg)

        # send request to remote service
        post_data_description = ''
        filename = os.path.basename(path)
        post_data_name = filename

        # '{}@{}'.format(username, config.SERVICE_URL),
        post_data_owner = f'{email2contact_email(username)}@test.seafile.com'
        post_data_owner_display_name = email2nickname(username)

        post_data_protocol_name = 'webdav'
        post_data_permissions = "{http://open-cloud-mesh.org/ns}share-permissions"

        # TODO
        share_info = f"{repo_id}:{path}"
        post_data_shared_secret = base64.b64encode(share_info.encode('utf-8')).decode('utf-8')

        post_data_resource_type = 'file'
        post_data_share_type = 'user'
        post_data_share_with = '{}@{}'.format(to_user, to_server_url)
        post_data_share_with = '{}@{}'.format(to_user, 'nextcloud.seafile.top')

        # data = {
        #     "shareWith": "51dc30ddc473d43a6011e9ebba6ca770@geant.org",
        #     "name": "resource.txt",
        #     "description": (
        #         "This is the Open API Specification file (in YAML format) of the Open\n"
        #         "Cloud Mesh API.\n"
        #     ),
        #     "providerId": "7c084226-d9a1-11e6-bf26-cec0c932ce01",
        #     "owner": "6358b71804dfa8ab069cf05ed1b0ed2a@apiwise.nl",
        #     "sender": "527bd5b5d689e2c32ae974c6229ff785@apiwise.nl",
        #     "ownerDisplayName": "Dimitri",
        #     "senderDisplayName": "John Doe",
        #     "shareType": "user",
        #     "resourceType": "file",
        #     "expiration": 0,
        #     "protocol": {
        #         "singleProtocolLegacy": {
        #             "name": "webdav",
        #             "options": {
        #                 "sharedSecret": "hfiuhworzwnur98d3wjiwhr",
        #                 "permissions": "some permissions scheme"
        #             }
        #         },
        #         "singleProtocolNew": {
        #             "name": "webdav",
        #             "options": {
        #                 "sharedSecret": "hfiuhworzwnur98d3wjiwhr"
        #             },
        #             "webdav": {
        #                 "sharedSecret": "hfiuhworzwnur98d3wjiwhr",
        #                 "permissions": [
        #                     "read",
        #                     "write"
        #                 ],
        #                 "uri": (
        #                     "https://open-cloud-mesh.org/remote/dav/ocm/"
        #                     "7c084226-d9a1-11e6-bf26-cec0c932ce01/path/to/resource.txt"
        #                 )
        #             }
        #         },
        #         "multipleProtocols": {
        #             "name": "multi",
        #             "options": None,
        #             "webdav": {
        #                 "sharedSecret": "hfiuhworzwnur98d3wjiwhr",
        #                 "permissions": [
        #                     "read",
        #                     "mfa-enforced"
        #                 ],
        #                 "uri": (
        #                     "https://open-cloud-mesh.org/remote/dav/ocm/"
        #                     "7c084226-d9a1-11e6-bf26-cec0c932ce01/path/to/resource.txt"
        #                 )
        #             },
        #             "webapp": {
        #                 "sharedSecret": "hfiuhworzwnur98d3wjiwhr",
        #                 "uriTemplate": (
        #                     "https://open-cloud-mesh.org/app/ocm/"
        #                     "7c084226-d9a1-11e6-bf26-cec0c932ce01/{relative-path-to-shared-resource}"
        #                 ),
        #                 "viewMode": "read"
        #             },
        #             "datatx": {
        #                 "sharedSecret": "hfiuhworzwnur98d3wjiwhr",
        #                 "srcUri": (
        #                     "https://open-cloud-mesh.org/remote/dav/ocm/"
        #                     "7c084226-d9a1-11e6-bf26-cec0c932ce01/path/to/resource.txt"
        #                 ),
        #                 "size": 100000
        #             }
        #         }
        #     }
        # }

        post_data = {
            'shareWith': post_data_share_with,
            'name': post_data_name,
            'description': post_data_description,
            'providerId': OCM_VIA_WEBDAV_PROVIDER_ID,
            'owner': post_data_owner,
            'sender': post_data_owner,
            'ownerDisplayName': post_data_owner_display_name,
            'senderDisplayName': post_data_owner_display_name,
            'shareType': post_data_share_type,
            'resourceType': 'file',  # post_data_resource_type,
            'expiration': 0,
            'protocol': {
                'name': post_data_protocol_name,
                'options': {'permissions': post_data_permissions,
                            'sharedSecret': post_data_shared_secret}},
            # "protocol": {
            #     "singleProtocolLegacy": {
            #         "name": "webdav",
            #         "options": {
            #             "sharedSecret": post_data_shared_secret,
            #             "permissions": ["read"]
            #         }
            #     },
            #     "singleProtocolNew": {
            #         "name": "webdav",
            #         "options": {
            #             "sharedSecret": post_data_shared_secret
            #         },
            #         "webdav": {
            #             "sharedSecret": post_data_shared_secret,
            #             "permissions": ["read"],
            #             "uri": (
            #                 "https://test.seafile.com/seafdav/lian%20lib%20on%20test.seafile.com/789.md"
            #             )
            #         }
            #     },
            # },
            'sharedBy': post_data_owner,
            'sharedByDisplayName': post_data_owner_display_name
        }

        remote_ocm_endpoint = get_remote_ocm_endpoint(to_server_url)
        url = '{}/shares'.format(remote_ocm_endpoint.rstrip('/'))

        resp = requests.post(url, json=post_data)

        if resp.status_code != 201:
            logger.error(url)
            logger.error(post_data)
            logger.error(resp.content)
            error_msg = 'Internal Server Error'
            return api_error(501, error_msg)

        share = Shares(description=post_data_description,
                       name=post_data_name,
                       owner=post_data_owner,
                       owner_display_name=post_data_owner_display_name,
                       protocol_name=post_data_protocol_name,
                       shared_secret=post_data_shared_secret,
                       permissions=post_data_permissions,
                       provider_id=OCM_VIA_WEBDAV_PROVIDER_ID,
                       resource_type=post_data_resource_type,
                       share_type=post_data_share_type,
                       share_with=post_data_share_with,
                       shared_by=post_data_owner,
                       shared_by_display_name=post_data_owner_display_name,
                       repo_id=repo_id,
                       path=path)
        share.save()

        ocm_info = {}
        ocm_info['id'] = share.id
        ocm_info['to_server_url'] = to_server_url
        ocm_info['to_user'] = to_user

        ocm_info['accepte_status'] = ''
        if share.accepted is None:
            ocm_info['accepte_status'] = 'waiting'
        elif share.accepted:
            ocm_info['accepte_status'] = 'accepted'
        else:
            ocm_info['accepte_status'] = 'not accepted'

        ocm_info['to_server_name'] = ''
        for name_domain_dict in OCM_VIA_WEBDAV_REMOTE_SERVERS:
            if name_domain_dict['server_url'] == to_server_url:
                ocm_info['to_server_name'] = name_domain_dict['server_name']

        return Response(ocm_info, status=status.HTTP_201_CREATED)

    def delete(self, request):
        """
        Delete share to Nextcloud server.
        """

        if not ENABLE_OCM_VIA_WEBDAV:
            error_msg = 'OCM via webdav feature is not enabled.'
            logger.error(error_msg)
            return api_error(501, error_msg)

        # parameter check
        share_id = request.data.get('share_id')
        if not share_id:
            error_msg = 'share_id invalid.'
            logger.error(error_msg)
            return api_error(400, error_msg)

        # resource check
        try:
            share = Shares.objects.get(id=share_id)
        except Shares.DoesNotExist:
            error_msg = 'Share %s not found.' % share_id
            logger.error(error_msg)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        repo_id = share.repo_id
        if not is_repo_owner(request, repo_id, username):
            error_msg = 'Permission denied.'
            logger.error(error_msg)
            return api_error(403, error_msg)

        # get remote server endpoint
        remote_domain = share.share_with.split('@')[-1]
        ocm_endpoint = get_remote_ocm_endpoint(f"https://{remote_domain}")
        if not ocm_endpoint:
            error_msg = 'Internal Server Error'
            logger.error(error_msg)
            return api_error(501, error_msg)

        notifications_url = urljoin(ocm_endpoint, OCM_VIA_WEBDAV_NOTIFICATIONS_URI.lstrip('/'))

        # send SHARE_UNSHARED notification
        data = {
            "notification": {
                "message": "file is no longer shared with you",
                "sharedSecret": share.shared_secret
            },
            "notificationType": "SHARE_UNSHARED",
            "providerId": OCM_VIA_WEBDAV_PROVIDER_ID,
            "resourceType": share.resource_type
        }

        resp = requests.post(notifications_url, json=data)
        if resp.status_code != 201:
            logger.error('Error occurred when send notification to {}'.format(notifications_url))
            logger.error(resp.content)

        share.delete()
        return Response({'success': True})
