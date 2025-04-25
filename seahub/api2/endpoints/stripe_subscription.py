import logging
import requests

from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from django.utils.translation import gettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.subscription.utils import subscription_check, get_customer_id, \
    get_subscription_api_headers, subscription_permission_check, \
    handler_subscription_api_response
from seahub.subscription.settings import SUBSCRIPTION_SERVER_URL

logger = logging.getLogger(__name__)


class StripeSubscriptionView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """Get subscription
        """
        # check
        if not subscription_check():
            error_msg = _('Feature is not enabled.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not subscription_permission_check(request):
            error_msg = _('Permission denied.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # main
        try:
            customer_id = get_customer_id(request)
            headers = get_subscription_api_headers()

            data = {
                'customer_id': customer_id,
            }
            url = SUBSCRIPTION_SERVER_URL.rstrip('/') + '/api/seafile/subscription/'
            response = requests.get(url, params=data, headers=headers)
            response = handler_subscription_api_response(response)
        except Exception as e:
            logger.error(e)
            error_msg = _('Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(response.json(), status=response.status_code)


class StripeSubscriptionPlansView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """Get plans
        """
        # check
        if not subscription_check():
            error_msg = _('Feature is not enabled.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not subscription_permission_check(request):
            error_msg = _('Permission denied.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        payment_type = request.GET.get('payment_type')

        # main
        try:
            customer_id = get_customer_id(request)
            headers = get_subscription_api_headers()

            data = {
                'customer_id': customer_id,
                'payment_type': payment_type,
            }
            url = SUBSCRIPTION_SERVER_URL.rstrip(
                '/') + '/api/seafile/subscription/plans/'
            response = requests.get(url, params=data, headers=headers)
            response = handler_subscription_api_response(response)
        except Exception as e:
            logger.error(e)
            error_msg = _('Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(response.json(), status=response.status_code)


class StripeSubscriptionLogsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """Get subscription logs by paid
        """
        # check
        if not subscription_check():
            error_msg = _('Feature is not enabled.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not subscription_permission_check(request):
            error_msg = _('Permission denied.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # main
        try:
            customer_id = get_customer_id(request)
            headers = get_subscription_api_headers()

            data = {
                'customer_id': customer_id,
            }
            url = SUBSCRIPTION_SERVER_URL.rstrip(
                '/') + '/api/seafile/subscription/logs/'
            response = requests.get(url, params=data, headers=headers)
            response = handler_subscription_api_response(response)
        except Exception as e:
            logger.error(e)
            error_msg = _('Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(response.json(), status=response.status_code)
