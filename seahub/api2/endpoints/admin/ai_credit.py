from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import ccnet_api

from seahub.ai.credits import AICreditSessionConflict, InsufficientAICredit, \
        adjust_org_additional_ai_credit, set_org_additional_ai_credit
from seahub.ai.utils import get_org_ai_credit_info
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsProVersion
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.settings import MULTI_TENANCY


class AdminOrganizationAICredit(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def _validate_org(self, request, org_id):
        if not MULTI_TENANCY:
            return None, api_error(status.HTTP_403_FORBIDDEN, 'Feature is not enabled.')

        if not request.user.admin_permissions.other_permission():
            return None, api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        org = ccnet_api.get_org_by_id(int(org_id))
        if not org:
            return None, api_error(status.HTTP_404_NOT_FOUND, 'Organization %s not found.' % org_id)

        return org, None

    def get(self, request, org_id):
        org, error = self._validate_org(request, org_id)
        if error:
            return error

        credit_info = get_org_ai_credit_info(request.user, org.org_id)
        credit_info['org_id'] = org.org_id
        return Response(credit_info)

    def put(self, request, org_id):
        org, error = self._validate_org(request, org_id)
        if error:
            return error

        try:
            set_org_additional_ai_credit(org.org_id, request.data.get('balance'), request.user.username)
        except ValueError as error:
            return api_error(status.HTTP_400_BAD_REQUEST, str(error))

        credit_info = get_org_ai_credit_info(request.user, org.org_id)
        credit_info['org_id'] = org.org_id
        return Response(credit_info)


class AdminOrganizationAICreditAdjustments(AdminOrganizationAICredit):
    http_method_names = ['post', 'options']

    def post(self, request, org_id):
        org, error = self._validate_org(request, org_id)
        if error:
            return error

        try:
            balance, already_processed = adjust_org_additional_ai_credit(
                org.org_id,
                request.data.get('delta'),
                request.user.username,
                stripe_session_id=request.data.get('stripe_session_id'),
            )
        except ValueError as error:
            return api_error(status.HTTP_400_BAD_REQUEST, str(error))
        except InsufficientAICredit:
            return api_error(status.HTTP_409_CONFLICT, 'Insufficient additional AI credits.')
        except AICreditSessionConflict:
            return api_error(status.HTTP_409_CONFLICT, 'stripe_session_id belongs to another organization.')

        return Response({
            'org_id': org.org_id,
            'additional_ai_credit': balance,
            'already_processed': already_processed,
        })
