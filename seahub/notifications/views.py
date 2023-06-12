# Copyright (c) 2012-2016 Seafile Ltd.
import json
import logging

from django.conf import settings
from django.urls import reverse
from django.contrib import messages
from django.http import HttpResponseRedirect, Http404, HttpResponse
from django.shortcuts import render
from django.template.loader import render_to_string
from django.utils.translation import gettext as _

from seahub.auth.decorators import login_required, login_required_ajax
from seahub.notifications.models import Notification, NotificationForm, \
    UserNotification
from seahub.notifications.utils import refresh_cache
from seahub.avatar.util import get_default_avatar_url

# Get an instance of a logger
logger = logging.getLogger(__name__)

########## user notifications
@login_required
def user_notification_list(request):
    return render(request, "notifications/user_notification_list_react.html", {
        })

def add_notice_from_info(notices):
    '''Add 'msg_from' or 'default_avatar_url' to notice.
        
    '''
    default_avatar_url = get_default_avatar_url()
    for notice in notices:
        notice.default_avatar_url = default_avatar_url

        if notice.is_user_message():
            d = notice.user_message_detail_to_dict()
            if d.get('msg_from') is not None:
                notice.msg_from = d.get('msg_from')

        elif notice.is_repo_share_msg():
            try:
                d = json.loads(notice.detail)
                notice.msg_from = d['share_from']
            except Exception as e:
                logger.error(e)

        elif notice.is_repo_share_to_group_msg():
            try:
                d = json.loads(notice.detail)
                notice.msg_from = d['share_from']
            except Exception as e:
                logger.error(e)

        elif notice.is_group_join_request():
            try:
                d = json.loads(notice.detail)
                notice.msg_from = d['username']
            except Exception as e:
                logger.error(e)

        elif notice.is_add_user_to_group():
            try:
                d = json.loads(notice.detail)
                notice.msg_from = d['group_staff']
            except Exception as e:
                logger.error(e)

        elif notice.is_file_comment_msg():
            try:
                d = json.loads(notice.detail)
                notice.msg_from = d['author']
            except Exception as e:
                logger.error(e)

        elif notice.is_draft_comment_msg():
            try:
                d = json.loads(notice.detail)
                notice.msg_from = d['author']
            except Exception as e:
                logger.error(e)

        elif notice.is_draft_reviewer_msg():
            try:
                d = json.loads(notice.detail)
                notice.msg_from = d['from_user']
            except Exception as e:
                logger.error(e)

    return notices
