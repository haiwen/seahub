import logging

from django.db import IntegrityError

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

from seahub.profile.models import Profile
from seahub.utils.verify import verify_sms_code

logger = logging.getLogger(__name__)


class BindPhoneView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):

        code = request.data.get('code')
        if not code:
            error_msg = 'code invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        phone = request.data.get('phone')
        if not phone:
            error_msg = 'phone invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # verify code
        if not verify_sms_code(phone, 'bind_phone', code):
            error_msg = 'verify code failed'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            users = Profile.objects.filter(user=request.user.username)
            if not users.exists():
                Profile.objects.create(user=request.user.username, phone=phone)
            else:
                users.update(phone=phone)
        except IntegrityError:
            error_msg = 'The phone has been bound.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        except Exception as e:
            logger.error('user: %s bind phone: %s code: %s error: %s',
                         request.user.username, phone, code, e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class UnbindPhoneView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):

        code = request.data.get('code')
        if not code:
            error_msg = 'code invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        phone = request.data.get('phone')
        if not phone:
            error_msg = 'phone invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # verify code
        if not verify_sms_code(phone, 'unbind_phone', code):
            error_msg = 'verify code failed'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            profile = Profile.objects.get(user=request.user.username)
        except Profile.DoesNotExist:
            error_msg = 'user %s not found.' % phone
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except Exception as e:
            logger.error('user: %s unbind phone: %s code: %s error: %s',
                         request.user.username, phone, code, e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if profile.phone != phone:
            error_msg = 'phone %s not found.' % phone
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        profile.phone = None
        profile.save()

        return Response({'success': True})
