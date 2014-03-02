# -*- coding: utf-8 -*-
import os
import simplejson as json
from django.http import HttpResponse, HttpResponseBadRequest, \
    HttpResponseRedirect , Http404
from django.shortcuts import render_to_response, Http404
from django.template.loader import render_to_string
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.core.paginator import EmptyPage, InvalidPage
from django.contrib import messages
from django.db.models import Q
from django.utils.translation import ugettext as _
from django.views.decorators.http import require_POST

from models import UserMessage, UserMsgAttachment
from seahub.group.models import GroupMessage, MessageAttachment
from seahub.group.signals import grpmsg_added
from message import user_msg_info_list, group_msg_info_list
from seaserv import get_repo, get_group, is_group_user, get_personal_groups_by_user
from seahub.auth.decorators import login_required
from seahub.base.accounts import User
from seahub.views import is_registered_user
from seahub.contacts.models import Contact
from seahub.share.models import PrivateFileDirShare
from seahub.utils import is_valid_username
from seahub.utils.paginator import Paginator
from seahub.settings import SITE_ROOT

@login_required
def message_list(request):
    """List and group messages related to the user, including he/she send to
    others and others send to he/she.
    """
    username = request.user.username

    related_user_msgs = UserMessage.objects.get_messages_related_to_user(username)
    user_msgs = user_msg_info_list(related_user_msgs, username)
    total_unread = 0
    for msg in user_msgs.items():
        total_unread += msg[1]['not_read']

    joined_groups = get_personal_groups_by_user(username)
    group_msgs = group_msg_info_list(joined_groups, username)

    msgs = sorted(user_msgs.items() + group_msgs.items(), key=lambda x: x[1]['last_time'], reverse=True)
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

    return render_to_response("message/user_msg_list.html", {
            "person_msgs": person_msgs,
            "to_email": to_email,
            }, context_instance=RequestContext(request))

@login_required
@require_POST
def message_send(request):
    """Handle POST request to send message to user(s)/group(s).
    """

    if not request.is_ajax() or request.method != 'POST':
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
    mass_group_ids = [int(x) for x in request.POST.getlist('mass_group')]

    if not mass_msg:
        result['error'] = [_(u'message is required')]
        return HttpResponse(json.dumps(result), content_type=content_type)
    if not mass_emails and not mass_group_ids:
        result['error'] = [_(u'contact/group is required')]
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

    email_sent = []
    group_sent = []
    errors = []
    user_msgs = []
    group_msgs = []
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

        user_msg = UserMessage.objects.add_unread_message(username, to_email, mass_msg)
        user_msgs.append(user_msg)
        if len(attached_items) > 0:
            for att_item in attached_items:
                repo_id = att_item['repo_id']
                path = att_item['path']
                pfds = PrivateFileDirShare.objects.add_read_only_priv_file_share(
                    username, to_email, repo_id, path)
                UserMsgAttachment.objects.add_user_msg_attachment(user_msg, pfds)

        email_sent.append(to_email)

    joined_groups = []
    for group_id in mass_group_ids:
        group = get_group(group_id)
        if not group:
            continue
        joined_groups.append(group)

        if not is_group_user(group_id, username):
            errors.append(_(u'You can not send message to group %s, you didn\'t join in.') % group.name)
            continue

        group_msg = GroupMessage(group_id=group_id, from_email=username, message=mass_msg)
        group_msg.save()
        grpmsg_added.send(sender=GroupMessage, group_id=group_id, from_email=username)
        group_msgs.append(group_msg)
        if len(attached_items) > 0:
            for att_item in attached_items:
                repo_id = att_item['repo_id']
                path = att_item['path']
                ma = MessageAttachment(group_message=group_msg, repo_id=repo_id,
                                    attach_type='file', path=path,
                                    src='recommend')
                ma.save()

        group_sent.append(group_id)

    html = ''
    if email_sent or group_sent:
        ctx = {}
        if fr == 'all': # from 'all_msg_list' page
            user_msgs = user_msg_info_list(user_msgs, username)
            group_msgs = group_msg_info_list(joined_groups, username)
            ctx['msgs'] = sorted(user_msgs.items() + group_msgs.items(), key=lambda x: x[1]['last_time'], reverse=True)
            html = render_to_string('message/all_msg.html', ctx, context_instance=RequestContext(request))
        else:
            ctx['msg'] = user_msgs[0]
            html = render_to_string('message/user_msg.html', ctx)
        return HttpResponse(json.dumps({"html": html, "error": errors}), content_type=content_type)
    else:
        return HttpResponse(json.dumps({"html": html, "error": errors}), status=400, content_type=content_type)


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
