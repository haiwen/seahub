import logging

from dateutil.relativedelta import relativedelta
from django.utils import timezone
from django.utils.translation import ugettext as _
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.dtable import WRITE_PERMISSION_TUPLE
from seahub.api2.permissions import CanGenerateShareLink
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.constants import PERMISSION_READ
from seahub.dtable.models import DTables, DTableShareLinks, Workspaces
from seahub.settings import SHARE_LINK_EXPIRE_DAYS_MAX, \
    SHARE_LINK_EXPIRE_DAYS_MIN, SHARE_LINK_EXPIRE_DAYS_DEFAULT, SHARE_LINK_PASSWORD_MIN_LENGTH
from seahub.dtable.utils import gen_share_dtable_link, check_dtable_permission

from seaserv import seafile_api

logger = logging.getLogger(__name__)


def get_share_dtable_link_info(sdl, dtable):
    data = {
        'username': sdl.username,
        'permission': sdl.permission,
        'token': sdl.token,
        'link': gen_share_dtable_link(sdl.token),
        'dtable': dtable.name,
        'dtable_id': dtable.id,
        'workspace_id': dtable.workspace_id,
        'expire_date': sdl.expire_date,
        'ctime': sdl.ctime,
    }

    return data


class DTableShareLinksView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        get dtable all share links of such user
        :param request:
        :return:
        """
        username = request.user.username
        workspace_id = request.GET.get('workspace_id')
        if not workspace_id:
            error_msg = _('workspace_id invalid.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        table_name = request.GET.get('table_name')
        if not table_name:
            error_msg = _('table_name invalid.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            error_msg = _('Workspace %(workspace)s not found' % {'workspace': workspace_id})
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        repo = seafile_api.get_repo(workspace.repo_id)
        if not repo:
            error_msg = _('Library %(workspace)s not found' % {'workspace': workspace_id})
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        dtable = DTables.objects.get_dtable(workspace_id, table_name)
        if not dtable:
            error_msg = _('DTable %(table)s not found' % {'table': table_name})
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # get table's all links of user
        dsls = DTableShareLinks.objects.filter(dtable=dtable, username=username)
        results = [get_share_dtable_link_info(item, dtable) for item in dsls]
        return Response({
            'dtable_share_links': results
        })

    def post(self, request):
        # argument check
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
            expire_days = int(request.data.get('expire_days', 0))
        except ValueError:
            return api_error(status.HTTP_400_BAD_REQUEST, _('expire_days invalid'))
        except TypeError:
            return api_error(status.HTTP_400_BAD_REQUEST, _('expire_days invalid'))

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

        link_permission = request.data.get('permission')
        if link_permission and link_permission not in [perm[0] for perm in DTableShareLinks.PERMISSION_CHOICES]:
            error_msg = _('Permission invalid')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        link_permission = link_permission if link_permission else PERMISSION_READ

        # resource check
        workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            error_msg = _('Workspace %(workspace)s not found' % {'workspace': workspace_id})
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        repo = seafile_api.get_repo(workspace.repo_id)
        if not repo:
            error_msg = _('Library %(workspace)s not found' % {'workspace': workspace_id})
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        dtable = DTables.objects.get_dtable(workspace_id, table_name)
        if not dtable:
            error_msg = _('DTable %(table)s not found' % {'table': table_name})
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_dtable_permission(request.user.username, dtable.workspace, dtable) not in WRITE_PERMISSION_TUPLE:
            error_msg = _('Permission denied.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        sdl = DTableShareLinks.objects.filter(username=username, dtable=dtable.id).first()
        if sdl:
            error_msg = _('Share link %(token)s already exists.' % {'token': sdl.token})
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            sdl = DTableShareLinks.objects.create_link(dtable.id, username,
                                                       password=password,
                                                       expire_date=expire_date,
                                                       permission=link_permission)
        except Exception as e:
            logger.error(e)
            error_msg = _('Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        data = get_share_dtable_link_info(sdl, dtable)
        return Response(data)


class DTableSharedLinkView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, token):
        dsl = DTableShareLinks.objects.filter(token=token).first()
        if not dsl:
            return Response({'success': True})

        username = request.user.username
        if not dsl.is_owner(username):
            error_msg = _('Permission denied.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            dsl.delete()
        except Exception as e:
            logger.error(e)
            error_msg = _('Internal server error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        return Response({'success': True})
