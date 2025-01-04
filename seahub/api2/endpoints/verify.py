import re
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import SmsVerifyCodeRateThrottle

from seahub.utils.sms_clients import AliyunSmsClient
from seahub.utils.verify import get_random_code, set_sms_verify_code_cache

logger = logging.getLogger(__name__)


class SmsVerifyCodeView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (SmsVerifyCodeRateThrottle,)

    def post(self, request):

        sms_type = request.data.get('type')
        if not sms_type or sms_type not in ('bind_phone', 'unbind_phone'):
            error_msg = 'type invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        phone = request.data.get('phone')
        phone = phone.strip()
        if not phone or not re.match(r'^1[3456789]\d{9}$', phone):
            error_msg = 'phone invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # gen new code
        code = get_random_code()

        # send sms
        try:
            sms_client = AliyunSmsClient()
            sms_client.send_verify_code(phone, code)
        except Exception as e:
            logger.error('phone: %s send verify code: %s error: %s', phone, code, e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # cache the code
        set_sms_verify_code_cache(phone, sms_type, code)
        return Response({'success': True})
