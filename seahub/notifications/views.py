import datetime
import simplejson as json
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.http import HttpResponseRedirect, Http404, HttpResponse
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.template.loader import render_to_string
from django.utils.translation import ugettext as _

import seaserv

from seahub.auth.decorators import login_required
from seahub.notifications.models import Notification, NotificationForm, \
    UserNotification
from seahub.notifications.utils import refresh_cache

@login_required
def notification_list(request):
    if not request.user.is_staff:
        raise Http404
    notes = Notification.objects.all().order_by('-id')

    return render_to_response('notifications/notification_list.html', {
            'notes': notes,
            }, context_instance=RequestContext(request))

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
    notices_more = True if len(notices) == count else False

    return render_to_response("notifications/user_notification_list.html", {
            'notices': notices,
            'start': count,
            'limit': limit,
            'notices_more': notices_more,
            }, context_instance=RequestContext(request))

@login_required
def user_notification_more(request):
    """Fetch next ``limit`` notifications starts from ``start``.
    
    Arguments:
    - `request`:
    - `start`:
    - `limit`:
    """
    if not request.is_ajax():
        return Http404
    
    username = request.user.username
    start = int(request.GET.get('start', 0))
    limit = int(request.GET.get('limit', 0))

    notices = UserNotification.objects.get_user_notifications(username)[
        start: start+limit]
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

        
    
