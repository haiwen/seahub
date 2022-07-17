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

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.base.templatetags.seahub_tags import email2nickname

from seahub.ocm_via_webdav.settings import ENABLE_OCM_VIA_WEBDAV, \
        OCM_VIA_WEBDAV_OCM_ENDPOINT, OCM_VIA_WEBDAV_OCM_PROVIDER_URI, \
        OCM_VIA_WEBDAV_NOTIFICATIONS_URI
from seahub.ocm_via_webdav.models import ReceivedShares

from seahub.ocm.settings import ENABLE_OCM, OCM_SEAFILE_PROTOCOL, \
        OCM_RESOURCE_TYPE_LIBRARY, OCM_API_VERSION, OCM_SHARE_TYPES, \
        OCM_ENDPOINT

logger = logging.getLogger(__name__)


def get_remote_domain_by_shared_by(shared_by):

    return shared_by.split('@')[-1]


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
                'endPoint': config.SERVICE_URL + '/' + OCM_ENDPOINT,
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
                'endPoint': urljoin(config.SERVICE_URL, OCM_VIA_WEBDAV_OCM_ENDPOINT),
                'resourceTypes': {
                    'name': 'file',
                    'protocols': {'webdav': 'TODO'},
                    'shareTypes': ['user'],
                }
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
            return api_error(501, error_msg)

        # {'description': '',
        #  'name': 'file-3-in-nextcloud-folder.md',
        #  'owner': 'lian@https://nextcloud.seafile.top/',
        #  'ownerDisplayName': 'lian',
        #  'protocol': {'name': 'webdav',
        #               'options': {'permissions': '{http://open-cloud-mesh.org/ns}share-permissions',
        #                           'sharedSecret': 'HdjKpI4o6lamWwN'}},
        #  'providerId': 9,
        #  'resourceType': 'file',
        #  'shareType': 'user',
        #  'shareWith': 'lian@lian.com@https://demo.seafile.top',  # or 'lian@https://demo.seafile.top',
        #  'sharedBy': 'lian@https://nextcloud.seafile.top/',
        #  'sharedByDisplayName': 'lian'}

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
                               share_with=share_with,
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
            return api_error(501, error_msg)

        path = request.GET.get('path')
        if not path:
            error_msg = 'path invalid.'
            return api_error(400, error_msg)

        try:
            share = ReceivedShares.objects.get(id=share_id)
        except ReceivedShares.DoesNotExist:
            error_msg = "OCM share {} not found.".format(share_id)
            return api_error(404, error_msg)

        username = request.user.username
        if share.share_with != username:
            error_msg = 'Permission denied.'
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
            return api_error(501, error_msg)

        try:
            share = ReceivedShares.objects.get(id=share_id)
        except ReceivedShares.DoesNotExist:
            error_msg = "OCM share {} not found.".format(share_id)
            return api_error(404, error_msg)

        username = request.user.username
        if share.share_with != username:
            error_msg = 'Permission denied.'
            return api_error(403, error_msg)

        # get remote server endpoint
        remote_domain = get_remote_domain_by_shared_by(share.shared_by)
        ocm_endpoint = get_remote_ocm_endpoint(remote_domain)
        if not ocm_endpoint:
            error_msg = 'Internal Server Error'
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
            return api_error(501, error_msg)

        # parameter check
        share_id = request.GET.get('share_id')
        if not share_id:
            error_msg = 'share_id invalid.'
            return api_error(400, error_msg)

        try:
            share_id = int(share_id)
        except ValueError as e:
            logger.error(e)
            error_msg = 'share_id invalid.'
            return api_error(400, error_msg)

        path = request.GET.get('path')
        if not path:
            error_msg = 'path invalid.'
            return api_error(400, error_msg)

        # resource check
        try:
            share = ReceivedShares.objects.get(id=share_id)
        except ReceivedShares.DoesNotExist:
            error_msg = "OCM share {} not found.".format(share_id)
            return api_error(404, error_msg)

        username = request.user.username
        if share.share_with != username:
            error_msg = 'Permission denied.'
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
            return api_error(501, error_msg)

        # {'notification': {'messgage': 'file is no longer shared with you',
        #                   'sharedSecret': 'QoVQuBhqphvVYvz'},
        #  'notificationType': 'SHARE_UNSHARED',
        #  'providerId': '13',
        #  'resourceType': 'file'}

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

        if notification_type == 'SHARE_UNSHARED':

            try:
                share = ReceivedShares.objects.get(shared_secret=shared_secret)
            except ReceivedShares.DoesNotExist:
                error_msg = "OCM share with secret {} not found.".format(shared_secret)
                error_result_not_found['validationErrors']['name'] = 'sharedSecret'
                return Response(error_result_not_found, status=400)

            if share.provider_id != provider_id:
                error_msg = "OCM share with provider id {} not found.".format(provider_id)
                error_result_not_found['validationErrors'][0]['name'] = 'providerID'
                return Response(error_result_not_found, status=400)

            share.delete()

        return Response({'success': True}, status=status.HTTP_201_CREATED)
