import base64
import logging
import requests
from constance import config

from django.http import HttpResponse

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.base.templatetags.seahub_tags import email2nickname

from seahub.ocm_via_webdav.settings import ENABLE_OCM_VIA_WEBDAV, OCM_VIA_WEBDAV_ENDPOINT
from seahub.ocm_via_webdav.models import ReceivedShares

from seahub.ocm.settings import ENABLE_OCM, OCM_SEAFILE_PROTOCOL, \
        OCM_RESOURCE_TYPE_LIBRARY, OCM_API_VERSION, OCM_SHARE_TYPES, \
        OCM_ENDPOINT

logger = logging.getLogger(__name__)


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
                'endPoint': config.SERVICE_URL + '/' + OCM_VIA_WEBDAV_ENDPOINT,
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

        result = {
            "recipientDisplayName": email2nickname(share_with)
        }
        return Response(result, status=status.HTTP_201_CREATED)


class ReceivedSharesView(APIView):

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
            info['shared_by'] = share.shared_by

            info_list.append(info)

        result = {
            'received_share_list': info_list
        }
        return Response(result)


class ReceivedShareView(APIView):

    throttle_classes = (UserRateThrottle,)

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
        shared_by = share.shared_by
        remote_domain = shared_by.split('@')[-1]
        remote_domain = remote_domain.rstrip('/')

        ocm_provider_url = remote_domain + '/ocm-provider/'
        resp = requests.get(ocm_provider_url)
        end_point = resp.json().get('endPoint')

        if not end_point:
            logger.error('Can not get endPoint from {}'.format(ocm_provider_url))
            logger.error(resp.content)

        end_point = end_point.rstrip('/')

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

        notifications_url = end_point + '/notifications'
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

    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        Download received file.
        """

        if not ENABLE_OCM_VIA_WEBDAV:
            error_msg = 'OCM via webdav feature is not enabled.'
            return api_error(501, error_msg)

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

        try:
            share = ReceivedShares.objects.get(id=share_id)
        except ReceivedShares.DoesNotExist:
            error_msg = "OCM share {} not found.".format(share_id)
            return api_error(404, error_msg)

        # get remote server endpoint
        shared_by = share.shared_by
        remote_domain = shared_by.split('@')[-1]
        remote_domain = remote_domain.rstrip('/')

        ocm_provider_url = remote_domain + '/ocm-provider/'
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
            error_msg = 'Internal Server Error'
            return api_error(501, error_msg)

        protocols = resource_types[0].get('protocols')
        if not protocols:
            logger.error('Can not get protocols from {}'.format(ocm_provider_url))
            logger.error(resp.content)
            error_msg = 'Internal Server Error'
            return api_error(501, error_msg)

        webdav_url = protocols.get('webdav')
        if not webdav_url:
            logger.error('Can not get webdav url from {}'.format(ocm_provider_url))
            logger.error(resp.content)
            error_msg = 'Internal Server Error'
            return api_error(501, error_msg)

        # download file via webdav
        full_webdav_url = remote_domain + webdav_url

        def format_string(string):
            return string + (4 - len(string) % 4) * ':'

        shared_secret = share.shared_secret
        token = base64.b64encode('{}'.format(format_string(shared_secret)).encode('utf-8'))
        headers = {"Authorization": "Basic {}".format(token.decode('utf-8'))}
        download_file_resp = requests.get(full_webdav_url, headers=headers)

        response = HttpResponse(download_file_resp.content, content_type="application/octet-stream")
        response['Content-Disposition'] = 'attachment; filename={}'.format(share.name)

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

        notification_type = request.data.get('notificationType')
        notification_dict = request.data.get('notification')
        shared_secret = notification_dict.get('sharedSecret')
        provider_id = notification_dict.get('providerId')

        error_result_not_found = {
            "message": "RESOURCE_NOT_FOUND",
            "validationErrors": [
                {
                    "name": "",
                    "message": "NOT_FOUND"
                }
            ]
        }

        if notification_type == 'SHARE_UNSHARED':

            try:
                share = ReceivedShares.objects.get(shared_secret=shared_secret)
            except ReceivedShares.DoesNotExist:
                error_msg = "OCM share with secret {} not found.".format(shared_secret)
                error_result_not_found['validationErrors']['name'] = 'sharedSecret'
                return Response(error_result_not_found, status=400)

            if share.provider_id != provider_id:
                error_msg = "OCM share with provider id {} not found.".format(provider_id)
                error_result_not_found['validationErrors']['name'] = 'providerID'
                return Response(error_result_not_found, status=400)

            share.delete()

        return Response({}, status=status.HTTP_201_CREATED)
