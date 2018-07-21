# Copyright (c) 2012-2016 Seafile Ltd.

import os
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from seahub.base.templatetags.seahub_tags import translate_seahub_time, \
        email2contact_email
from seahub.utils import EVENTS_ENABLED, is_org_context, \
        get_user_activities
from seahub.utils.timeutils import utc_to_local
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.avatar.templatetags.avatar_tags import api_avatar_url

logger = logging.getLogger(__name__)

class ActivitiesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        if not EVENTS_ENABLED:
            events = None
            return api_error(status.HTTP_404_NOT_FOUND, 'Events not enabled.')

        try:
            page = int(request.GET.get('page', ''))
        except ValueError:
            page = 1

        try:
            per_page = int(request.GET.get('per_page', ''))
        except ValueError:
            per_page = 25

        start = (page - 1) * per_page
        count = per_page

        email = request.user.username

        events = get_user_activities(email, start, count)

        events_list = []
        for e in events:
            d = dict(op_type=e.op_type)
            d['repo_id'] = e.repo_id
            d['repo_name'] = e.repo_name
            d['obj_type'] = e.obj_type
            d['commit_id'] = e.commit_id
            d['path'] = e.path
            d['name'] = '' if e.path == '/' else os.path.basename(e.path)
            d['author_email'] = e.op_user
            d['author_name'] = email2nickname(e.op_user)
            d['author_contact_email'] = email2contact_email(e.op_user)

            try:
                size = int(request.GET.get('size', 36))
            except ValueError as e:
                size = 36

            url, is_default, date_uploaded = api_avatar_url(e.op_user, size)
            d['avatar_url'] = request.build_absolute_uri(url)
            d['time_relative'] = translate_seahub_time(utc_to_local(e.timestamp))

            if e.op_type == 'clean-up-trash':
                d['days'] = e.days
            elif e.op_type == 'rename' and e.obj_type == 'repo':
                d['old_repo_name'] = e.old_repo_name
            elif e.op_type == 'move' and e.obj_type in ['dir', 'file']:
                d['old_path'] = e.old_path
            elif e.op_type == 'rename' and e.obj_type in ['dir', 'file']:
                d['old_path'] = e.old_path
                d['old_name'] = os.path.basename(e.old_path)

            events_list.append(d)

        ret = {
            'events': events_list
            }

        return Response(ret)
