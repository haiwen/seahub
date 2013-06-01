# -*- coding: utf-8 -*-
import simplejson as json
from django.http import HttpResponse, HttpResponseBadRequest, \
    HttpResponseRedirect , Http404
from django.shortcuts import render_to_response, Http404
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.core.paginator import EmptyPage, InvalidPage
from django.contrib import messages
from django.db.models import Q
from django.utils.translation import ugettext as _
from django.views.decorators.http import require_POST

from models import UserMessage
from message import msg_info_list
from seahub.auth.decorators import login_required
from seahub.base.accounts import User
from seahub.views import is_registered_user
from seahub.contacts.models import Contact
from seahub.utils.paginator import Paginator
from seahub.settings import SITE_ROOT

@login_required
def message_list(request):
    """List and group messages related to the user, including he/she send to
    others and others send to he/she.
    """
    username = request.user.username

    messages = UserMessage.objects.get_messages_related_to_user(username)
    msgs = msg_info_list(messages, username)

    total_unread = 0
    for msg in msgs:
        total_unread += msg[1]['not_read']

    return render_to_response('message/all_msg_list.html', {
            'msgs': msgs,
            'total_unread': total_unread,
        }, context_instance=RequestContext(request))

@login_required
def user_msg_list(request, id_or_email):
    """List messages related to a certain person.
    """
    try:
        uid = int(id_or_email)
        try:
            user = User.objects.get(id=uid)
        except User.DoesNotExist:
            user = None
        if not user:
            return render_to_response("user_404.html",{},
                                      context_instance=RequestContext(request))
        to_email = user.email
    except ValueError:
        to_email = id_or_email

    username = request.user.username
    if username == to_email:
        return HttpResponseRedirect(reverse('edit_profile'))

    msgs = UserMessage.objects.get_messages_between_users(username, to_email)
    if msgs:
        # update ``ifread`` field of messages
        UserMessage.objects.update_unread_messages(to_email, username)

    '''paginate'''
    paginator = Paginator(msgs, 15)
    # Make sure page request is an int. If not, deliver first page.
    try:
        page = int(request.GET.get('page', '1'))
    except ValueError:
        page = 1

    # If page request (9999) is out of range, deliver last page of results.
    try:
        person_msgs = paginator.page(page)
    except (EmptyPage, InvalidPage):
        person_msgs = paginator.page(paginator.num_pages)
    person_msgs.page_range = paginator.get_page_range(person_msgs.number)
    person_msgs.object_list = list(person_msgs.object_list)

    c = Contact.objects.get_contact_by_user(username, to_email)
    add_to_contacts = True if c is None else False

    return render_to_response("message/user_msg_list.html", {
            "person_msgs": person_msgs,
            "to_email": to_email,
            "add_to_contacts": add_to_contacts,
            }, context_instance=RequestContext(request))

@login_required
@require_POST
def message_send(request):
    """Handle POST request to send message to user(s).
    """
    username = request.user.username

    next = request.META.get('HTTP_REFERER', None)
    if next is None:
        next = SITE_ROOT
    
    mass_msg = request.POST.get('mass_msg')
    mass_emails = request.POST.getlist('mass_email') # e.g: [u'1@1.com, u'2@1.com']
    if not mass_msg:
        messages.error(request, _(u'message is required'))
        return HttpResponseRedirect(next)
    if not mass_emails:
        messages.error(request, _(u'contact is required'))
        return HttpResponseRedirect(next)

    email_sended = []
    for to_email in mass_emails:
        to_email = to_email.strip()
        if not to_email:
            continue

        if to_email == username:
            messages.error(request, _(u'You can not send message to yourself.'))
            continue

        if not is_registered_user(to_email):
            messages.error(request, _(u'Failed to send message to %s, user not found.') % to_email)
            continue

        UserMessage.objects.add_unread_message(username, to_email, mass_msg)
        email_sended.append(to_email)

    if email_sended:
        messages.success(request, _(u'Message sent successfully.'))
    return HttpResponseRedirect(next)

@login_required
def msg_count(request):
    """Count user's unread message.
    """
    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'
    username = request.user.username
    
    count = UserMessage.objects.count_unread_messages_by_user(username)
    result = {}
    result['count'] = count
    return HttpResponse(json.dumps(result), content_type=content_type)
