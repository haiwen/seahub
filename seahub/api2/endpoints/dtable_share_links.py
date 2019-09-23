from dateutil.relativedelta import relativedelta
from django.utils import timezone
from django.utils.translation import ugettext as _
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import CanGenerateShareLink
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.dtable.models import DTables, ShareDTableLink
from seahub.settings import SHARE_LINK_EXPIRE_DAYS_MAX, \
    SHARE_LINK_EXPIRE_DAYS_MIN, SHARE_LINK_EXPIRE_DAYS_DEFAULT, SHARE_LINK_PASSWORD_MIN_LENGTH
from seahub.utils import gen_share_dtable_link


def check_permission(request):
    permission = request.data.get('permission')
    if not permission:
        return ShareDTableLink.READ_ONLY
    for perm, _ in ShareDTableLink.PERMISSION_CHOICES:
        if perm == permission:
            return perm
    return ShareDTableLink.READ_ONLY


def get_share_dtable_link_info(sdl, dtable):
    data = {
        'username': sdl.username,
        'permission': sdl.permission,
        'token': sdl.token,
        'link': gen_share_dtable_link(sdl.token),
        'dtable': dtable.name,
        'dtable_id': dtable.id,
        'workspace': dtable.workspace.name,
        'workspace_id': dtable.workspace_id,
    }

    return data


class ShareDTableLinkView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        # data check
        workspace_id = request.data.get('workspace_id')
        if not workspace_id:
            error_msg = 'workspace_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        table_name = request.data.get('table_name')
        if not table_name:
            error_msg = 'table_name invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        password = request.data.get('password')
        if password and len(password) < SHARE_LINK_PASSWORD_MIN_LENGTH:
            error_msg = _('Password is too short.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            expire_days = int(request.data.get('expire_days'))
        except ValueError:
            return api_error(status.HTTP_400_BAD_REQUEST, 'expire_days invalid')

        if expire_days <= 0:
            if SHARE_LINK_EXPIRE_DAYS_DEFAULT > 0:
                expire_days = SHARE_LINK_EXPIRE_DAYS_DEFAULT

        if SHARE_LINK_EXPIRE_DAYS_MIN > 0:
            if expire_days < SHARE_LINK_EXPIRE_DAYS_MIN:
                error_msg = _('Expire days should be greater or equal to %s') % \
                        SHARE_LINK_EXPIRE_DAYS_MIN
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if SHARE_LINK_EXPIRE_DAYS_MAX > 0:
            if expire_days > SHARE_LINK_EXPIRE_DAYS_MAX:
                error_msg = _('Expire days should be less than or equal to %s') % \
                        SHARE_LINK_EXPIRE_DAYS_MAX
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if expire_days <= 0:
            expire_date = None
        else:
            expire_date = timezone.now() + relativedelta(days=expire_days)

        permission = check_permission(request)

        # dtable check
        dtable = DTables.objects.get_dtable(workspace_id, table_name)
        if not dtable:
            error_msg = _('DTable: %(table_name)s not found.' % {'table_name': table_name})
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        username = request.user.username
        sdl = ShareDTableLink.objects.filter(username=username, dtable=dtable.id).first()
        if sdl:
            error_msg = _('Share link %(token)s already exists.' % {'token': sdl.token})
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        sdl = ShareDTableLink.objects.create_link(dtable.id, username,
                                                  password=password,
                                                  expire_date=expire_date,
                                                  permission=permission)
        data = get_share_dtable_link_info(sdl, dtable)
        return Response(data)
