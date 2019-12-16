import logging
from decimal import Decimal
from constance import config

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils import timezone

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle

from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.api2.utils import api_error
from termsandconditions.models import TermsAndConditions, UserTermsAndConditions

logger = logging.getLogger(__name__)


def check_enable_terms_and_conditions(func):
    def _decorated(view, request, *args, **kwargs):
        if not config.ENABLE_TERMS_AND_CONDITIONS:
            error_msg = 'terms and conditions not enabled.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        return func(view, request, *args, **kwargs)
    return _decorated


class AdminTermsAndConditions(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle,)

    @check_enable_terms_and_conditions
    def get(self, request):
        """
        list Terms and Conditions

        Permission checking:
        1.login and is admin user.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        terms_and_conditions = TermsAndConditions.objects.all().order_by('-date_created')

        info_list = []
        for term in terms_and_conditions:
            info = {}
            info['id'] = term.pk
            info['name'] = term.name
            info['version_number'] = term.version_number
            info['text'] = term.text
            info['ctime'] = datetime_to_isoformat_timestr(term.date_created)
            info['activate_time'] = datetime_to_isoformat_timestr(term.date_active) if term.date_active else ''
            info_list.append(info)

        return Response({'term_and_condition_list': info_list})

    @check_enable_terms_and_conditions
    def post(self, request):
        """
        Create a term and condition

        Permission checking:
        1.login and is admin user.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        name = request.data.get('name')
        if not name:
            error_msg = 'name invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        version_number = request.data.get('version_number')
        if not version_number:
            error_msg = 'version_number invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            version_number = Decimal(version_number)
        except Exception as e:
            logger.error(e)
            error_msg = 'version_number %s invalid' % version_number
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        text = request.data.get('text')
        if not text:
            error_msg = 'text invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_active = request.data.get('is_active')
        if not is_active:
            error_msg = 'is_active invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_active = is_active.lower()
        if is_active not in ('true', 'false'):
            error_msg = 'is_active %s invalid' % is_active
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        date_active = timezone.now() if is_active == 'true' else None
        term = TermsAndConditions.objects.create(
            name=name, version_number=version_number, text=text,
            date_active=date_active)

        info = {}
        info['id'] = term.pk
        info['name'] = term.name
        info['version_number'] = term.version_number
        info['text'] = term.text
        info['ctime'] = datetime_to_isoformat_timestr(term.date_created)
        info['activate_time'] = datetime_to_isoformat_timestr(term.date_active) if term.date_active else ''

        return Response(info)


class AdminTermAndCondition(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle,)

    @check_enable_terms_and_conditions
    def put(self, request, term_id):
        """
        Update Term and Condition

        Permission checking:
        1.login and is admin user.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        name = request.data.get('name')

        version_number = request.data.get('version_number')
        if version_number:
            try:
                version_number = Decimal(version_number)
            except Exception as e:
                logger.error(e)
                error_msg = 'version_number %s invalid' % version_number
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        text = request.data.get('text')

        is_active = request.data.get('is_active')
        if is_active:
            is_active = is_active.lower()
            if is_active not in ('true', 'false'):
                error_msg = 'is_active %s invalid' % is_active
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            term = TermsAndConditions.objects.get(pk=term_id)
        except TermsAndConditions.DoesNotExist:
            error_msg = 'term %s not found' % term_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if text:
            term.text = text

        if name:
            term.name = name

        if version_number and version_number != term.version_number:
            term.version_number = version_number
            if is_active == 'true':
                term.date_active = timezone.now()

        if is_active == 'true' and not term.date_active:
            term.date_active = timezone.now()

        if is_active == 'false':
            term.date_active = None

        term.save()

        info = {}
        info['id'] = term.pk
        info['name'] = term.name
        info['version_number'] = term.version_number
        info['text'] = term.text
        info['ctime'] = datetime_to_isoformat_timestr(term.date_created)
        info['activate_time'] = datetime_to_isoformat_timestr(term.date_active) if term.date_active else ''

        return Response(info)

    @check_enable_terms_and_conditions
    def delete(self, request, term_id):
        """
        Delete Term and Condition

        Permission checking:
        1.login and is admin user.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            term = TermsAndConditions.objects.get(pk=term_id)
        except TermsAndConditions.DoesNotExist:
            error_msg = 'term %s not found' % term_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            term.delete()
            UserTermsAndConditions.objects.filter(terms_id=term_id).delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
