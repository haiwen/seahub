# Copyright (c) 2012-2016 Seafile Ltd.
import json
import logging

from django.conf import settings
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.http import HttpResponseRedirect, Http404, HttpResponse
from django.shortcuts import render
from django.template.loader import render_to_string
from django.utils.translation import ugettext as _

from seahub.auth.decorators import login_required, login_required_ajax
from seahub.notifications.models import Notification, NotificationForm, \
    UserNotification
from seahub.notifications.utils import refresh_cache
from seahub.avatar.util import get_default_avatar_url

# Get an instance of a logger
logger = logging.getLogger(__name__)

@login_required
def notification_list(request):
    if not request.user.is_staff:
        raise Http404
    notes = Notification.objects.all().order_by('-id')

    return render(request, 'notifications/notification_list.html', {
            'notes': notes,
            })

@login_required
def notification_add(request):
    if not request.user.is_staff or request.method != 'POST':
        raise Http404

    f = NotificationForm(request.POST)
    f.save()
    return HttpResponseRedirect(reverse('notification_list', args=[]))

@login_required
def notification_delete(request, nid):
    if not request.user.is_staff:
        raise Http404
    Notification.objects.filter(id=nid).delete()
    refresh_cache()

    return HttpResponseRedirect(reverse('notification_list', args=[]))

@login_required
def set_primary(request, nid):
    if not request.user.is_staff:
        raise Http404
    
    # TODO: use transaction?
    Notification.objects.filter(primary=1).update(primary=0)
    Notification.objects.filter(id=nid).update(primary=1)

    refresh_cache()
    
    return HttpResponseRedirect(reverse('notification_list', args=[]))

########## user notifications
@login_required
def user_notification_list(request):
    """
    
    Arguments:
    - `request`:
    """
    username = request.user.username
    count = 25                  # initial notification count
    limit = 25                   # next a mount of notifications fetched by AJAX
    
    notices = UserNotification.objects.get_user_notifications(username)[:count]

    # Add 'msg_from' or 'default_avatar_url' to notice.
    notices = add_notice_from_info(notices)

    notices_more = True if len(notices) == count else False

    return render(request, "notifications/user_notification_list.html", {
            'notices': notices,
            'start': count,
            'limit': limit,
            'notices_more': notices_more,
            })

@login_required_ajax
def user_notification_more(request):
    """Fetch next ``limit`` notifications starts from ``start``.
    
    Arguments:
    - `request`:
    - `start`:
    - `limit`:
    """
    username = request.user.username
    start = int(request.GET.get('start', 0))
    limit = int(request.GET.get('limit', 0))

    notices = UserNotification.objects.get_user_notifications(username)[
        start: start+limit]

    # Add 'msg_from' or 'default_avatar_url' to notice.
    notices = add_notice_from_info(notices)

    notices_more = True if len(notices) == limit else False
    new_start = start+limit

    ctx = {'notices': notices}
    html = render_to_string("notifications/user_notification_tr.html", ctx)

    ct = 'application/json; charset=utf-8'
    return HttpResponse(json.dumps({
                'html':html,
                'notices_more':notices_more,
                'new_start': new_start}), content_type=ct)
    
@login_required
def user_notification_remove(request):
    """
    
    Arguments:
    - `request`:
    """
    UserNotification.objects.remove_user_notifications(request.user.username)

    messages.success(request, _("Successfully cleared all notices."))
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = settings.SITE_ROOT
    return HttpResponseRedirect(next)

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

        elif notice.is_group_msg():
            d = notice.group_message_detail_to_dict()
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

        elif notice.is_review_comment_msg():
            try:
                d = json.loads(notice.detail)
                notice.msg_from = d['author']
            except Exception as e:
                logger.error(e)

        elif notice.is_request_reviewer_msg():
            try:
                d = json.loads(notice.detail)
                notice.msg_from = d['from_user']
            except Exception as e:
                logger.error(e)

        elif notice.is_update_review_msg():
            try:
                d = json.loads(notice.detail)
                notice.msg_from = d['from_user']
            except Exception as e:
                logger.error(e)

    return notices
