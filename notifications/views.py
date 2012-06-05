import datetime
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect, Http404
from django.shortcuts import render_to_response
from django.template import RequestContext

from auth.decorators import login_required

from seahub.notifications.models import Notification, NotificationForm
from seahub.notifications.utils import refresh_cache

@login_required
def notification_close(request, note_id):
    note_id += ','
    topinfo_close = request.COOKIES.get('topinfo', '')
    topinfo_close += note_id
 
    next = request.GET.get('next', '/')
    res = HttpResponseRedirect(next)
    res.set_cookie("topinfo", topinfo_close, max_age=14*24*60*60)
 
    return res

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
    if not request.user.is_staff:
        raise Http404
    if request.method == 'POST':
        f = NotificationForm(request.POST)
        f.save()
        return HttpResponseRedirect(reverse('notification_list', args=[]))
    else:
        form = NotificationForm()

    return render_to_response("notifications/add_notification_form.html", {
            'form': form,
            }, context_instance=RequestContext(request))

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
