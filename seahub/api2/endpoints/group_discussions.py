# Copyright (c) 2012-2016 Seafile Ltd.
import json

from django.core.paginator import EmptyPage, InvalidPage
from django.http import HttpResponse

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsGroupMember
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, get_user_common_info
from seahub.group.models import GroupMessage
from seahub.group.signals import grpmsg_added 
from seahub.utils.paginator import Paginator
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
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

        try:
            avatar_size = int(request.GET.get('avatar_size',
                    AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        msgs = []
        for msg in group_msgs:
            info = get_user_common_info(msg.from_email, avatar_size)
            isoformat_timestr = datetime_to_isoformat_timestr(msg.timestamp)
            msgs.append({
                "id": msg.pk,
                "group_id": group_id,
                "user_name": info["name"],
                "user_email": info["email"],
                "user_contact_email": info["contact_email"],
                "avatar_url": request.build_absolute_uri(info["avatar_url"]),
                "content": msg.message,
                "created_at": isoformat_timestr
            })

        return HttpResponse(json.dumps({
            "msgs": msgs,
            "current_page": page,
            "page_num": paginator.num_pages,
            }), status=200, content_type=json_content_type)

    @api_check_group
    def post(self, request, group_id, format=None):
        """Post a group discussion. Only group members can perform this op.
        """
        content = request.data.get('content', '')
        if not content:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Content can not be empty.')

        try:
            avatar_size = int(request.data.get('avatar_size',
                            AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        username = request.user.username
        msg = GroupMessage.objects.create(group_id=group_id,
                                              from_email=username,
                                              message=content)
        # send signal
        grpmsg_added.send(sender=GroupMessage, group_id=group_id,
                from_email=username, message=content)

        info = get_user_common_info(username, avatar_size)

        isoformat_timestr = datetime_to_isoformat_timestr(msg.timestamp)
        return Response({
            "id": msg.pk,
            "group_id": group_id,
            "user_name": info["name"],
            "user_email": info["email"],
            "user_contact_email": info["contact_email"],
            "avatar_url": request.build_absolute_uri(info["avatar_url"]),
            "content": msg.message,
            "created_at": isoformat_timestr
        }, status=201)
