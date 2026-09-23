import math

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import ccnet_api

from seahub.ai.credits import set_org_additional_ai_credit
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

        additional_credit = request.data.get('additional_ai_credit')
        try:
            additional_credit = float(additional_credit)
        except (TypeError, ValueError):
            return api_error(status.HTTP_400_BAD_REQUEST, 'additional_ai_credit invalid.')

        if not math.isfinite(additional_credit) or additional_credit < 0:
            return api_error(status.HTTP_400_BAD_REQUEST, 'additional_ai_credit invalid.')

        set_org_additional_ai_credit(
            org.org_id,
            additional_credit,
            operator=request.user.username,
        )

        credit_info = get_org_ai_credit_info(request.user, org.org_id)
        credit_info['org_id'] = org.org_id
        return Response(credit_info)
