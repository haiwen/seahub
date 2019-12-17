import logging
import requests
import json

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.ocm.models import OCMShareReceived
from seahub.ocm.settings import  VIA_REPO_TOKEN_URL


logger = logging.getLogger(__name__)


def send_get_request(url, params=None, headers=None):
    response = requests.get(url, params=params, headers=headers)
    return json.loads(response.text)


class OCMReposDirView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, provider_id, repo_id):
        """
        Send request to Provider to get repo item list
        """

        path = request.GET.get('path', '/')

        with_thumbnail = request.GET.get('with_thumbnail', 'false')
        if with_thumbnail not in ('true', 'false'):
            error_msg = 'with_thumbnail invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        ocm_share_received = OCMShareReceived.objects.filter(provider_id=provider_id, repo_id=repo_id).first()
        if not ocm_share_received:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        url = ocm_share_received.from_server_url + VIA_REPO_TOKEN_URL['DIR']
        params = {
            'path': path,
            'with_thumbnail': with_thumbnail,
        }
        headers = {'Authorization': 'token ' + ocm_share_received.shared_secret}
        try:
            resp = send_get_request(url, params=params, headers=headers)
        except Exception as e:
            logging.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response(resp)


class OCMReposDownloadLinkView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, provider_id, repo_id):
        """
        Send request to Provider to get download link
        """

        path = request.GET.get('path', '/')

        ocm_share_received = OCMShareReceived.objects.filter(provider_id=provider_id, repo_id=repo_id).first()
        if not ocm_share_received:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        url = ocm_share_received.from_server_url + VIA_REPO_TOKEN_URL['DOWNLOAD_LINK']
        params = {
            'path': path,
        }
        headers = {'Authorization': 'token ' + ocm_share_received.shared_secret}
        try:
            resp = send_get_request(url, params=params, headers=headers)
        except Exception as e:
            logging.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response(resp)


class OCMReposUploadLinkView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, provider_id, repo_id):
        """
        Send request to Provider to get upload link
        """

        path = request.GET.get('path', '/')

        ocm_share_received = OCMShareReceived.objects.filter(provider_id=provider_id, repo_id=repo_id).first()
        if not ocm_share_received:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        url = ocm_share_received.from_server_url + VIA_REPO_TOKEN_URL['UPLOAD_LINK']
        params = {
            'path': path,
            'from': 'web',
        }
        headers = {'Authorization': 'token ' + ocm_share_received.shared_secret}
        try:
            resp = send_get_request(url, params=params, headers=headers)
        except Exception as e:
            logging.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response(resp)
