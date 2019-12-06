import logging
import random
import string
import requests
import json
from constance import config

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seaserv import seafile_api, ccnet_api

from seahub.utils.repo import get_available_repo_perms, get_repo_owner
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE
from seahub.ocm.models import OCMShareReceived, OCMShare
from seahub.ocm.settings import ENABLE_OCM, SUPPORTED_OCM_PROTOCOLS, \
    OCM_SEAFILE_PROTOCOL, OCM_RESOURCE_TYPE_LIBRARY, OCM_API_VERSION, \
    OCM_SHARE_TYPES, OCM_ENDPOINT, OCM_PROVIDER_ID, OCM_NOTIFICATION_TYPE_LIST, \
    OCM_NOTIFICATION_SHARE_UNSHARED, OCM_NOTIFICATION_SHARE_DECLINED, OCM_PROTOCOL_URL, \
    OCM_NOTIFICATION_URL, OCM_CREATE_SHARE_URL

logger = logging.getLogger(__name__)

# Convert seafile permission to ocm protocol standard permission
SEAFILE_PERMISSION2OCM_PERMISSION = {
    PERMISSION_READ: ['read'],
    PERMISSION_READ_WRITE: ['read', 'write'],
}


def gen_shared_secret(length=23):
    return ''.join(random.choice(string.ascii_lowercase + string.digits) for i in range(length))


def get_remote_protocol(url):
    response = requests.get(url)
    return json.loads(response.text)


def is_valid_url(url):
    if not url.startswith('https://') and not url.startswith('http://'):
        return False
    if not url.endswith('/'):
        return False
    return True


def check_url_slash(url):
    if not url.endswith('/'):
        url += '/'
    return url


class OCMProtocolView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        return ocm protocol info to remote server
        """
        # TODO
        # currently if ENABLE_OCM is False, return 404 as if ocm protocol is not implemented
        # ocm protocol is not clear about this, https://github.com/GEANT/OCM-API/pull/37
        if not ENABLE_OCM:
            error_msg = 'feature not enabled.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
        return Response(result)


class OCMSharesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """
        create ocm in consumer server
        """

        # argument check
        share_with = request.data.get('shareWith', '')
        if not share_with:
            error_msg = 'shareWith invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # curently only support repo share
        repo_name = request.data.get('name', '')
        if not repo_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        sender = request.data.get('sender', '')
        if not sender:
            error_msg = 'sender invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        share_type = request.data.get('shareType', '')
        if share_type not in OCM_SHARE_TYPES:
            error_msg = 'shareType %s invalid.' % share_type
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        resource_type = request.data.get('resourceType', '')
        if resource_type != OCM_RESOURCE_TYPE_LIBRARY:
            error_msg = 'resourceType %s invalid.' % resource_type
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        provider_id = request.data.get('providerId', '')
        if not provider_id:
            error_msg = 'providerId invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)


        """
        other ocm protocol fields currently not used

        description = request.data.get('description', '')
        owner = request.data.get('owner', '')
        ownerDisplayName = request.data.get('ownerDisplayName', '')
        senderDisplayName = request.data.get('senderDisplayName', '')
        """

        protocol = request.data.get('protocol', '')
        if not protocol:
            error_msg = 'protocol invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if 'name' not in protocol.keys():
            error_msg = 'protocol.name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if protocol['name'] not in SUPPORTED_OCM_PROTOCOLS:
            error_msg = 'protocol %s not support.' % protocol['name']
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if 'options' not in protocol.keys():
            error_msg = 'protocol.options invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if 'sharedSecret' not in protocol['options'].keys():
            error_msg = 'protocol.options.sharedSecret invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if 'permissions' not in protocol['options'].keys():
            error_msg = 'protocol.options.permissions invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if protocol['name'] == OCM_SEAFILE_PROTOCOL:
            if 'repoId' not in protocol['options'].keys():
                error_msg = 'protocol.options.repoId invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if 'seafileServiceURL' not in protocol['options'].keys():
                error_msg = 'protocol.options.seafileServiceURL invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if protocol['name'] == OCM_SEAFILE_PROTOCOL:
            shared_secret = protocol['options']['sharedSecret']
            permissions = protocol['options']['permissions']
            repo_id = protocol['options']['repoId']
            from_server_url = protocol['options']['seafileServiceURL']

        if 'write' in permissions:
            permission = PERMISSION_READ_WRITE
        else:
            permission = PERMISSION_READ

        OCMShareReceived.objects.add(
            shared_secret=shared_secret,
            from_user=sender,
            to_user=share_with,
            from_server_url=from_server_url,
            repo_id=repo_id,
            repo_name=repo_name,
            permission=permission,
            provider_id=provider_id,
        )

        return Response(request.data)


class OCMNotificationsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """ Handle notifications from remote server
        """
        notification_type = request.data.get('notificationType', '')
        if not notification_type:
            error_msg = 'notificationType %s invalid.' % notification_type
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if notification_type not in OCM_NOTIFICATION_TYPE_LIST:
            error_msg = 'notificationType %s not supportd.' % notification_type
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        resource_type = request.data.get('resourceType', '')
        if resource_type != OCM_RESOURCE_TYPE_LIBRARY:
            error_msg = 'resourceType %s invalid.' % resource_type
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        notification = request.data.get('notification', '')
        if not notification:
            error_msg = 'notification invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        shared_secret = notification.get('sharedSecret', '')
        if not shared_secret:
            error_msg = 'sharedSecret invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if notification_type == OCM_NOTIFICATION_SHARE_UNSHARED:
            """
            Provider unshared, then delete ocm_share_received record on Consumer
            """
            try:
                ocm_share_received = OCMShareReceived.objects.get(shared_secret=shared_secret)
            except OCMShareReceived.DoesNotExist:
                return Response(request.data)

            if ocm_share_received:
                try:
                    ocm_share_received.delete()
                except Exception as e:
                    logger.error(e)
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Invernal Server Error')

        elif notification_type == OCM_NOTIFICATION_SHARE_DECLINED:
            """
            Consumer declined share, then delete ocm_share record on Provider
            """
            try:
                ocm_share = OCMShare.objects.get(shared_secret=shared_secret)
            except OCMShareReceived.DoesNotExist:
                return Response(request.data)

            if ocm_share:
                try:
                    ocm_share.delete()
                except Exception as e:
                    logger.error(e)
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Invernal Server Error')

        return Response(request.data)


class OCMSharesPrepareView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        list ocm shares of request user, filt by repo_id
        """
        repo_id = request.GET.get('repo_id', '')
        if repo_id:
            ocm_shares = OCMShare.objects.filter(repo_id=repo_id, from_user=request.user.username)
        else:
            ocm_shares = OCMShare.objects.filter(from_user=request.user.username)

        ocm_share_list = []
        for ocm_share in ocm_shares:
            ocm_share_list.append(ocm_share.to_dict())
        return Response({'ocm_share_list': ocm_share_list})

    def post(self, request):
        """
        prepare provider server info for ocm, and send post request to consumer
        three step:
        1. send get request to remote server, ask if support ocm, and get other info
        2. send post request to remote server, remote server create a recored in remote
        ocm_share_received table
        3. store a recored in local ocm_share table
        """

        # argument check
        to_user = request.data.get('to_user', '')
        if not to_user:
            error_msg = 'to_user invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        to_server_url = request.data.get('to_server_url', '').lower().strip()
        if not to_server_url or not is_valid_url(to_server_url):
            error_msg = 'to_server_url %s invalid.' % to_server_url
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo_id = request.data.get('repo_id', '')
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        path = request.data.get('path', '/')

        # TODO
        # 1. folder check
        # 2. encrypted repo check
        #
        # if seafile_api.get_dir_id_by_path(repo.id, path) is None:
        #     return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)
        #
        # if repo.encrypted and path != '/':
        #     return api_error(status.HTTP_400_BAD_REQUEST, 'Folder invalid.')

        permission = request.data.get('permission', PERMISSION_READ)
        if permission not in get_available_repo_perms():
            return api_error(status.HTTP_400_BAD_REQUEST, 'permission invalid.')

        username = request.user.username
        repo_owner = get_repo_owner(request, repo_id)
        if repo_owner != username:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        consumer_protocol = get_remote_protocol(to_server_url + OCM_PROTOCOL_URL)

        shared_secret = gen_shared_secret()
        from_user = username
        post_data = {
            'shareWith': to_user,
            'name': repo.repo_name,
            'description': '',
            'providerId': OCM_PROVIDER_ID,
            'owner': repo_owner,
            'sender': from_user,
            'ownerDisplayName': email2nickname(repo_owner),
            'senderDisplayName': email2nickname(from_user),
            'shareType': consumer_protocol['resourceTypes']['shareTypes'][0],                # currently only support user type
            'resourceType': consumer_protocol['resourceTypes']['name'],    # currently only support repo
            'protocol': {
                'name': OCM_SEAFILE_PROTOCOL,
                'options': {
                    'sharedSecret': shared_secret,
                    'permissions': SEAFILE_PERMISSION2OCM_PERMISSION[permission],
                    'repoId': repo_id,
                    'seafileServiceURL': check_url_slash(config.SERVICE_URL),
                },
            },
        }
        url = consumer_protocol['endPoint'] + OCM_CREATE_SHARE_URL
        try:
            requests.post(url, json=post_data)
        except Exception as e:
            logging.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        ocm_share = OCMShare.objects.add(
            shared_secret=shared_secret,
            from_user=request.user.username,
            to_user=to_user,
            to_server_url=to_server_url,
            repo_id=repo_id,
            repo_name=repo.repo_name,
            path=path,
            permission=permission,
        )

        return Response(ocm_share.to_dict())


class OCMSharePrepareView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, pk):
        """
        delete an share received record
        """
        try:
            ocm_share = OCMShare.objects.get(pk=pk)
        except OCMShareReceived.DoesNotExist:
            error_msg = 'OCMShare %s not found.' % pk
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        to_server_url = ocm_share.to_server_url
        shared_secret = ocm_share.shared_secret

        consumer_protocol = get_remote_protocol(to_server_url + OCM_PROTOCOL_URL)

        # send unshare notification to consumer
        post_data = {
            'notificationType': OCM_NOTIFICATION_SHARE_UNSHARED,
            'resourceType': OCM_RESOURCE_TYPE_LIBRARY,
            'providerId': OCM_PROVIDER_ID,
            'notification': {
                'sharedSecret': shared_secret,
                'message': '',
            },
        }

        url = consumer_protocol['endPoint'] + OCM_NOTIFICATION_URL
        try:
            requests.post(url, json=post_data)
        except Exception as e:
            logging.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        try:
            ocm_share.delete()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})


class OCMSharesReceivedView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        list ocm shares received
        """
        ocm_share_received_list = []
        ocm_shares_received = OCMShareReceived.objects.filter(to_user=request.user.username)
        for ocm_share_received in ocm_shares_received:
            ocm_share_received_list.append(ocm_share_received.to_dict())
        return Response({'ocm_share_received_list': ocm_share_received_list})


class OCMShareReceivedView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, pk):
        """
        delete an share received record
        """
        try:
            ocm_share_received = OCMShareReceived.objects.get(pk=pk)
        except OCMShareReceived.DoesNotExist:
            error_msg = 'OCMShareReceived %s not found.' % pk
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        from_server_url = ocm_share_received.from_server_url
        shared_secret = ocm_share_received.shared_secret

        provider_protocol = get_remote_protocol(from_server_url + OCM_PROTOCOL_URL)

        # send unshare notification to consumer
        post_data = {
            'notificationType': OCM_NOTIFICATION_SHARE_DECLINED,
            'resourceType': OCM_RESOURCE_TYPE_LIBRARY,
            'providerId': OCM_PROVIDER_ID,
            'notification': {
                'sharedSecret': shared_secret,
                'message': '',
            },
        }

        url = provider_protocol['endPoint'] + OCM_NOTIFICATION_URL
        try:
            requests.post(url, json=post_data)
        except Exception as e:
            logging.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        try:
            ocm_share_received.delete()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})
