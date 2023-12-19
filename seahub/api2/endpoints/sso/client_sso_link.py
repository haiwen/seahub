# -*- coding: utf-8 -*-
import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.reverse import reverse
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from seahub.api2.throttling import AnonRateThrottle
from seahub.base.models import ClientSSOToken, STATUS_ERROR
from seahub.utils import get_service_url, gen_token
from seahub.api2.utils import api_error
from seahub.settings import CLIENT_SSO_TOKEN_EXPIRATION

logger = logging.getLogger(__name__)


class ClientSSOLink(APIView):
    throttle_classes = (AnonRateThrottle, )

    def get(self, request, token):
        # query SSO status
        t = get_object_or_404(ClientSSOToken, token=token)
        if not t.is_success():
            logger.error('{} client sso login status: not success status.'.format(token))
            return Response({'status': t.status})

        if not t.accessed_at:
            logger.error('{} client sso login error: no accessed_at info.'.format(token))
            return Response({'status': STATUS_ERROR})

        interval = (timezone.now() - t.accessed_at).total_seconds()
        if int(interval) >= CLIENT_SSO_TOKEN_EXPIRATION:
            logger.error('{} client sso login error: login timeout.'.format(token))
            return Response({'status': STATUS_ERROR})

        return Response({
            'status': t.status,
            'email': t.email,
            'apiToken': t.api_key
        })

    def post(self, request):
        # create SSO link
        token = gen_token(30) + gen_token(30)
        transaction.set_autocommit(False)
        try:
            t = ClientSSOToken(token=token)
            t.save()
            transaction.commit()
        except Exception as e:
            logger.error(e)
            transaction.rollback()
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        finally:
            transaction.set_autocommit(True)

        return Response({
            'link': get_service_url().rstrip('/') + reverse(
                'client_sso', args=[t.token])
        })
