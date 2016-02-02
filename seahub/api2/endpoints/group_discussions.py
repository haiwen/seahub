import json

from django.core.paginator import EmptyPage, InvalidPage
from django.http import HttpResponse
from django.utils.dateformat import DateFormat

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsGroupMember
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.group.models import GroupMessage
from seahub.utils.paginator import Paginator
from .utils import api_check_group

json_content_type = 'application/json; charset=utf-8'

class GroupDiscussions(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsGroupMember)
    throttle_classes = (UserRateThrottle, )

    @api_check_group
    def get(self, request, group_id, format=None):
        """List all group discussions. Only group members can perform this op.
        """
        # 1 <= page, defaults to 1
        try:
            page = int(request.GET.get('page', '1'))
        except ValueError:
            page = 1
        if page < 0:
            page = 1

        # 1 <= per_page <= 100, defaults to 20
        try:
            per_page = int(request.GET.get('per_page', '20'))
        except ValueError:
            per_page = 20
        if per_page < 1 or per_page > 100:
            per_page = 20

        paginator = Paginator(GroupMessage.objects.filter(
            group_id=group_id).order_by('-timestamp'), per_page)

        try:
            group_msgs = paginator.page(page)
        except (EmptyPage, InvalidPage):
            group_msgs = paginator.page(paginator.num_pages)

        msgs = []
        for e in group_msgs:
            msgs.append({
                "group_id": group_id,
                "discussion_id": e.pk,
                "user": e.from_email,
                "content": e.message,
                "created_at": e.timestamp.strftime("%Y-%m-%dT%H:%M:%S") + DateFormat(e.timestamp).format('O'),
            })

        return HttpResponse(json.dumps(msgs), status=200,
                            content_type=json_content_type)

    @api_check_group
    def post(self, request, group_id, format=None):
        """Post a group discussions. Only group members can perform this op.
        """
        content = request.data.get('content', '')
        if not content:
            return api_error(status.HTTP_400_BAD_REQUEST, 'content can not be empty')

        username = request.user.username
        discuss = GroupMessage.objects.create(group_id=group_id,
                                              from_email=username,
                                              message=content)

        return Response({
            "group_id": group_id,
            "discussion_id": discuss.pk,
            "user": username,
            "content": discuss.message,
            "created_at": discuss.timestamp.strftime("%Y-%m-%dT%H:%M:%S") + DateFormat(discuss.timestamp).format('O'),
        }, status=201)
