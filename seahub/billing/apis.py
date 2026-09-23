import logging
import math
from urllib.parse import urlparse

import jwt
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import ccnet_api

from seahub.ai.credits import AICreditTransactionConflict, adjust_org_additional_ai_credit, \
        get_org_additional_ai_credit
from seahub.api2.utils import api_error
from seahub.billing.settings import BILLING_SERVICE_JWT_ALGORITHM, BILLING_SERVICE_JWT_SECRET_KEY, \
        BILLING_SERVICE_URL
from seahub.settings import MULTI_TENANCY
from seahub.utils import get_service_url
from seahub.utils.auth import AUTHORIZATION_PREFIX


logger = logging.getLogger(__name__)


class BillingOrganizationAICredit(APIView):
    def _validate_org(self, request, org_id):
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        if not auth or auth[0].lower() not in AUTHORIZATION_PREFIX or len(auth) != 2:
            return None, api_error(status.HTTP_403_FORBIDDEN, 'Invalid token header.')

        billing_url = urlparse(BILLING_SERVICE_URL)
        service_url = urlparse(get_service_url())
        try:
            jwt.decode(
                auth[1],
                BILLING_SERVICE_JWT_SECRET_KEY,
                algorithms=[BILLING_SERVICE_JWT_ALGORITHM],
                issuer=billing_url.netloc.split(':')[0],
                audience=service_url.netloc.split(':')[0],
                options={'require': ['exp', 'iss', 'aud', 'jti']},
            )
        except jwt.InvalidTokenError as error:
            logger.warning('Billing JWT validation failed: %s', error)
            return None, api_error(status.HTTP_403_FORBIDDEN, 'Invalid JWT token.')

        if not MULTI_TENANCY:
            return None, api_error(status.HTTP_403_FORBIDDEN, 'Feature is not enabled.')

        org = ccnet_api.get_org_by_id(int(org_id))
        if not org:
            return None, api_error(status.HTTP_404_NOT_FOUND, 'Organization %s not found.' % org_id)

        return org, None

    def post(self, request, org_id):
        org, error = self._validate_org(request, org_id)
        if error:
            return error

        credit_delta = request.data.get('credit_delta')
        transaction_id = request.data.get('transaction_id')
        try:
            credit_delta = float(credit_delta)
        except (TypeError, ValueError):
            return api_error(status.HTTP_400_BAD_REQUEST, 'credit_delta invalid.')

        if not math.isfinite(credit_delta) or credit_delta == 0:
            return api_error(status.HTTP_400_BAD_REQUEST, 'credit_delta invalid.')
        if not isinstance(transaction_id, str):
            return api_error(status.HTTP_400_BAD_REQUEST, 'transaction_id invalid.')
        transaction_id = transaction_id.strip()
        if not transaction_id or len(transaction_id) > 255:
            return api_error(status.HTTP_400_BAD_REQUEST, 'transaction_id invalid.')

        try:
            credit_transaction, already_processed = adjust_org_additional_ai_credit(
                org.org_id,
                credit_delta,
                transaction_id,
            )
        except AICreditTransactionConflict:
            return api_error(status.HTTP_409_CONFLICT, 'transaction_id conflicts with an existing transaction.')

        return Response({
            'success': True,
            'org_id': org.org_id,
            'credit_delta': credit_transaction.requested_delta,
            'applied_delta': credit_transaction.applied_delta,
            'additional_ai_credit': get_org_additional_ai_credit(org.org_id),
            'already_processed': already_processed,
        })
