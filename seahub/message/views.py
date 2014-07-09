# -*- coding: utf-8 -*-
import os
import datetime
import json
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response
from django.template.loader import render_to_string
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.core.paginator import EmptyPage, InvalidPage
from django.utils.translation import ugettext as _

from models import UserMessage, UserMsgAttachment
from message import msg_info_list
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.base.accounts import User
from seahub.base.decorators import user_mods_check
from seahub.views import is_registered_user
from seahub.share.models import PrivateFileDirShare
from seahub.utils import is_valid_username
from seahub.utils.paginator import Paginator
from seahub.notifications.models import UserNotification

@login_required
@user_mods_check
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
@user_mods_check
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

        attachments = UserMsgAttachment.objects.list_attachments_by_user_msgs(msgs)
        for msg in msgs:
            msg.attachments = []
            for att in attachments:
                if att.user_msg != msg:
                    continue

                pfds = att.priv_file_dir_share
                if pfds is None: # in case that this attachment is unshared.
                    continue

                att.repo_id = pfds.repo_id
                att.path = pfds.path
                att.name = os.path.basename(pfds.path.rstrip('/'))
                att.token = pfds.token
                msg.attachments.append(att) 

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

    UserNotification.objects.seen_user_msg_notices(username, to_email)
    return render_to_response("message/user_msg_list.html", {
            "person_msgs": person_msgs,
            "to_email": to_email,
            }, context_instance=RequestContext(request))

@login_required_ajax
def user_msg_remove(request, msg_id):
    """Remove sent message.
    """
    json_ct = 'application/json; charset=utf-8'

    try:
        msg = UserMessage.objects.get(message_id=msg_id)
    except UserMessage.DoesNotExist:
        return HttpResponse(json.dumps({
                    'success': False,
                    'err_msg': _(u"The message doesn't exist")
                    }), content_type=json_ct)
    else:
        # Test whether user is admin or message owner.
        if msg.from_email == request.user.username:
            msg.sender_deleted_at = datetime.datetime.now()
            msg.save()
            return HttpResponse(json.dumps({'success': True}),
                                content_type=json_ct)
        else:
            return HttpResponse(json.dumps({
                        'success': False,
                        'err_msg': _(u"You don't have the permission.")
                        }), content_type=json_ct)

@login_required_ajax
def user_received_msg_remove(request, msg_id):
    """Remove received message.
    """
    json_ct = 'application/json; charset=utf-8'

    try:
        msg = UserMessage.objects.get(message_id=msg_id)
    except UserMessage.DoesNotExist:
        return HttpResponse(json.dumps({
                    'success': False,
                    'err_msg': _(u"The message doesn't exist"),
                    }), content_type=json_ct)
    else:
        # Test whether current user is the recipient of this msg.
        if msg.to_email == request.user.username:
            msg.recipient_deleted_at = datetime.datetime.now()
            msg.save()
            return HttpResponse(json.dumps({'success': True}),
                                content_type=json_ct)
        else:
            return HttpResponse(json.dumps({
                        'success': False,
                        'err_msg': _(u"You don't have the permission."),
                        }), content_type=json_ct)

@login_required_ajax
def message_send(request):
    """Handle POST request to send message to user(s).
    """

    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'
    result = {}

    username = request.user.username

    fr = request.GET.get('from')
    if not fr:
        result['error'] = [_(u'Argument missing')]
        return HttpResponse(json.dumps(result), content_type=content_type)

    mass_msg = request.POST.get('mass_msg')
    mass_emails = request.POST.getlist('mass_email') # e.g: [u'1@1.com, u'2@1.com']

    if not mass_msg:
        result['error'] = [_(u'message is required')]
        return HttpResponse(json.dumps(result), content_type=content_type)
    if not mass_emails:
        result['error'] = [_(u'contact is required')]
        return HttpResponse(json.dumps(result), content_type=content_type)

    # attachment
    selected = request.POST.getlist('selected') # selected files & dirs: [u'<repo_id><path>', ...] 
    attached_items = []
    if len(selected) > 0:
        for item in selected:
            if item[-1] == '/': # dir is not allowed, for now
                continue

            att = {}
            att['repo_id'] = item[0:36]
            att['path'] = item[36:]
            attached_items.append(att)

    email_sended = []
    errors = []
    msgs = []
    for to_email in mass_emails:
        to_email = to_email.strip()
        if not to_email or not is_valid_username(to_email):
            continue

        if to_email == username:
            errors.append(_(u'You can not send message to yourself.'))
            continue

        if not is_registered_user(to_email):
            errors.append(_(u'Failed to send message to %s, user not found.') % to_email)
            continue

        usermsg = UserMessage.objects.add_unread_message(username, to_email, mass_msg)
        usermsg.attachments = []
        if len(attached_items) > 0:
            for att_item in attached_items:
                repo_id = att_item['repo_id']
                path = att_item['path']
                pfds = PrivateFileDirShare.objects.add_read_only_priv_file_share(
                    username, to_email, repo_id, path)
                att = UserMsgAttachment.objects.add_user_msg_attachment(usermsg, pfds)

                att.repo_id = repo_id
                att.path = path
                att.name = os.path.basename(path.rstrip('/'))
                att.token = pfds.token
                usermsg.attachments.append(att)

        msgs.append(usermsg)
        email_sended.append(to_email)

    html = ''
    if email_sended:
        ctx = {}
        if fr == 'all': # from 'all_msg_list' page
            ctx['msgs'] = msg_info_list(msgs, username)
            html = render_to_string('message/all_msg.html', ctx)
        else:
            ctx['msg'] = msgs[0]   
            html = render_to_string('message/user_msg.html', ctx, context_instance=RequestContext(request))
        return HttpResponse(json.dumps({"html": html, "error": errors}), content_type=content_type)
    else:
        return HttpResponse(json.dumps({"html": html, "error": errors}), status=400, content_type=content_type)


@login_required_ajax
def msg_count(request):
    """Count user's unread message.
    """
    content_type = 'application/json; charset=utf-8'
    username = request.user.username
    
    count = UserMessage.objects.count_unread_messages_by_user(username)
    result = {}
    result['count'] = count
    return HttpResponse(json.dumps(result), content_type=content_type)
