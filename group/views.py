# -*- coding: utf-8 -*-
import logging
import os
import stat
import simplejson as json
import urllib2
from django.core.mail import send_mail
from django.core.paginator import EmptyPage, InvalidPage
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.contrib.sites.models import RequestSite
from django.http import HttpResponse, HttpResponseRedirect, Http404, \
    HttpResponseBadRequest
from django.shortcuts import render_to_response, redirect
from django.template import Context, loader, RequestContext
from django.template.loader import render_to_string
from django.utils.hashcompat import md5_constructor
from django.utils.http import urlquote
from django.utils.translation import ugettext as _
from django.utils.translation import ungettext
from django.views.generic.base import TemplateResponseMixin
from django.views.generic.edit import BaseFormView, FormMixin

from auth.decorators import login_required
import seaserv
from seaserv import ccnet_rpc, ccnet_threaded_rpc, seafserv_threaded_rpc, \
    seafserv_rpc, web_get_access_token, \
    get_repo, get_group_repos, get_commits, is_group_user, \
    get_personal_groups_by_user, get_group, get_group_members, create_repo, \
    get_personal_groups, create_org_repo, get_org_group_repos, \
    get_org_groups_by_user, check_permission, is_passwd_set, remove_repo, \
    unshare_group_repo, get_file_id_by_path, post_empty_file, del_file
from pysearpc import SearpcError

from decorators import group_staff_required
from models import GroupMessage, MessageReply, MessageAttachment, GroupWiki, \
    PublicGroup
from forms import MessageForm, MessageReplyForm, GroupRecommendForm, \
    GroupAddForm, GroupJoinMsgForm, WikiCreateForm
from signals import grpmsg_added, grpmsg_reply_added
from settings import GROUP_MEMBERS_DEFAULT_DISPLAY
from base.decorators import sys_staff_required
from base.mixins import LoginRequiredMixin
from seahub.contacts.models import Contact
from seahub.contacts.signals import mail_sended
from seahub.notifications.models import UserNotification
from seahub.profile.models import Profile
from seahub.settings import SITE_ROOT, SITE_NAME, MEDIA_URL
from seahub.shortcuts import get_first_object_or_none
from seahub.utils import render_error, render_permission_error, \
    validate_group_name, string2list, check_and_get_org_by_group, \
    check_and_get_org_by_repo, gen_file_get_url, get_file_type_and_ext, \
    get_file_contributors
from seahub.utils.paginator import Paginator
from seahub.utils.slugify import slugify
from seahub.utils.file_types import IMAGE
from seahub.views import is_registered_user
from seahub.forms import RepoCreateForm, SharedRepoCreateForm

# Get an instance of a logger
logger = logging.getLogger(__name__)


def is_group_staff(group, user):
    if user.is_anonymous():
        return False
    return seaserv.check_group_staff(group.id, user.username)


def group_check(func):
    """
    Decorator for initial group permission check tasks

    un-login user & group not pub --> public info page
    un-login user & group pub --> view_perm = "pub"
    login user & non group member & group not pub --> public info page
    login user & non group member & group pub --> view_perm = "pub"
    group member --> view_perm = "joined"
    sys admin --> view_perm = "sys_admin"
    """
    def _decorated(request, group_id, *args, **kwargs):
        group_id_int = int(group_id) # Checked by URL Conf
        group = get_group(group_id_int)
        if not group:
            return HttpResponseRedirect(reverse('group_list', args=[]))
        group.is_staff = False

        if not request.user.is_authenticated():
            if not PublicGroup.objects.filter(group_id=group_id_int):
                return render_to_response('group/group_pubinfo.html', {
                        'group': group,
                        }, context_instance=RequestContext(request))
            else:
                group.view_perm = "pub"
                return func(request, group, *args, **kwargs)

        joined = is_group_user(group_id_int, request.user.username)
        if joined:
            group.view_perm = "joined"
            group.is_staff = is_group_staff(group, request.user)
            return func(request, group, *args, **kwargs)
        if request.user.is_staff:
            # viewed by system admin
            group.view_perm = "sys_admin"
            return func(request, group, *args, **kwargs)

        pub = PublicGroup.objects.filter(group_id=group_id_int)
        if pub:
            group.view_perm = "pub"
            return func(request, group, *args, **kwargs)
            
        # Return group public info page.
        return render_to_response('group/group_pubinfo.html', {
                'group': group,
                }, context_instance=RequestContext(request))

    return _decorated


@login_required
def group_list(request):
    username = request.user.username

    if request.method == 'POST':
        """
        Add a new group.
        """
        result = {}
        content_type = 'application/json; charset=utf-8'

        form = GroupAddForm(request.POST)
        if form.is_valid():
            group_name = form.cleaned_data['group_name']

            # Check whether group name is duplicated.
            if request.cloud_mode:
                checked_groups = get_personal_groups_by_user(username)
            else:
                checked_groups = get_personal_groups(-1, -1)
            for g in checked_groups:
                if g.group_name == group_name:
                    result['error'] = _(u'There is already a group with that name.')
                    return HttpResponse(json.dumps(result), status=400,
                                    content_type=content_type)

            # Group name is valid, create that group.
            try:
                ccnet_threaded_rpc.create_group(group_name.encode('utf-8'),
                                                username)
                return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)
            except SearpcError, e:
                result['error'] = _(e.msg)
                return HttpResponse(json.dumps(result), status=500,
                                content_type=content_type)
        else:
            return HttpResponseBadRequest(json.dumps(form.errors),
                                          content_type=content_type)

    ### GET ###
    joined_groups = get_personal_groups_by_user(username)

    return render_to_response('group/groups.html', {
            'joined_groups': joined_groups,
            }, context_instance=RequestContext(request))
    
@login_required
@sys_staff_required
def group_remove(request, group_id):
    """
    Remove group from groupadmin page. Only system admin can perform this
    operation.
    """
    # Request header may missing HTTP_REFERER, we need to handle that case.
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT

    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(next)

    try:
        ccnet_threaded_rpc.remove_group(group_id_int, request.user.username)
        seafserv_threaded_rpc.remove_repo_group(group_id_int, None)
    except SearpcError, e:
        return render_error(request, _(e.msg))

    return HttpResponseRedirect(next)

@login_required
@group_staff_required
def group_dismiss(request, group_id):
    """
    Dismiss a group, only group staff can perform this operation.
    """
    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    group = get_group(group_id_int)
    if not group:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    username = request.user.username
    try:
        ccnet_threaded_rpc.remove_group(group.id, username)
        seafserv_threaded_rpc.remove_repo_group(group.id, None)

        if request.user.org:
            org_id = request.user.org['org_id']
            url_prefix = request.user.org['url_prefix']
            ccnet_threaded_rpc.remove_org_group(org_id, group_id_int)
            return HttpResponseRedirect(reverse('org_groups',
                                                args=[url_prefix]))

    except SearpcError, e:
        return render_error(request, _(e.msg))
    
    return HttpResponseRedirect(reverse('group_list'))

@login_required
def group_make_public(request, group_id):
    """
    Make a group public, only group staff can perform this operation.
    """
    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    group = get_group(group_id_int)
    if not group:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    # Check whether user is group staff
    if not is_group_staff(group, request.user):
        return render_permission_error(request, _(u'Only administrators can make the group public'))

    p = PublicGroup(group_id=group.id)
    p.save()
    return HttpResponseRedirect(reverse('group_manage', args=[group_id]))

@login_required
def group_revoke_public(request, group_id):
    """
    Revoke a group from public, only group staff can perform this operation.
    """
    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    group = get_group(group_id_int)
    if not group:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    # Check whether user is group staff
    if not is_group_staff(group, request.user):
        return render_permission_error(request, _(u'Only administrators can make the group public'))

    try:
        p = PublicGroup.objects.get(group_id=group.id)
        p.delete()
    except:
        pass

    return HttpResponseRedirect(reverse('group_manage', args=[group_id]))


@login_required
def group_quit(request, group_id):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    try:
        ccnet_threaded_rpc.quit_group(group_id_int, request.user.username)
        seafserv_threaded_rpc.remove_repo_group(group_id_int,
                                                request.user.username)
    except SearpcError, e:
        return render_error(request, _(e.msg))
        
    return HttpResponseRedirect(reverse('group_list', args=[]))

@login_required
def group_message_remove(request, group_id, msg_id):
    """
    Remove group message and all message replies and attachments.
    """
    # Checked by URL Conf
    group_id_int = int(group_id)
    msg_id = int(msg_id)
    group = get_group(group_id_int)
    if not group:
        raise Http404

    # Test whether user is in the group
    if not is_group_user(group_id_int, request.user.username):
        raise Http404

    try:
        gm = GroupMessage.objects.get(id=msg_id)
    except GroupMessage.DoesNotExist:
        return HttpResponse(json.dumps({'success': False, 'err_msg':_(u"The message doesn't exist")}),
                                   content_type='application/json; charset=utf-8')
    else:
        # Test whether user is group admin or message owner.
        if seaserv.check_group_staff(group_id, request.user.username) or \
                gm.from_email == request.user.username:
            gm.delete()
            return HttpResponse(json.dumps({'success': True}),
                                        content_type='application/json; charset=utf-8')
        else:
            return HttpResponse(json.dumps({'success': False, 'err_msg': _(u"You don't have the permission.")}),
                                        content_type='application/json; charset=utf-8')

@login_required
def msg_reply(request, msg_id):
    """Show group message replies, and process message reply in ajax"""
    
    content_type = 'application/json; charset=utf-8'
    if request.is_ajax():
        ctx = {}
        try:
            group_msg = GroupMessage.objects.get(id=msg_id)
        except GroupMessage.DoesNotExist:
            return HttpResponseBadRequest(content_type=content_type)

        if request.method == 'POST':
            form = MessageReplyForm(request.POST)
            # TODO: invalid form
            if form.is_valid():
                msg = form.cleaned_data['message']

                msg_reply = MessageReply()
                msg_reply.reply_to = group_msg
                msg_reply.from_email = request.user.username
                msg_reply.message = msg
                msg_reply.save()

                # send signal if reply other's message
                if group_msg.from_email != request.user.username:
                    grpmsg_reply_added.send(sender=MessageReply,
                                            msg_id=msg_id,
                                            from_email=request.user.username)
                replies = MessageReply.objects.filter(reply_to=group_msg)
                r_num = len(replies)
                if r_num < 4:
                    ctx['replies'] = replies
                else:
                    ctx['replies'] = replies[r_num - 3:]
                html = render_to_string("group/group_reply_list.html", ctx)
                serialized_data = json.dumps({"r_num": r_num, "html": html})
                return HttpResponse(serialized_data, content_type=content_type)

        else:
            replies = MessageReply.objects.filter(reply_to=group_msg)
            r_num = len(replies)
            ctx['replies'] = replies
            html = render_to_string("group/group_reply_list.html", ctx)
            serialized_data = json.dumps({"r_num": r_num, "html": html})
            return HttpResponse(serialized_data, content_type=content_type)
    else:
        return HttpResponseBadRequest(content_type=content_type)

@login_required
def msg_reply_new(request):
    notes = UserNotification.objects.filter(to_user=request.user.username)
    grpmsg_reply_list = [ n.detail for n in notes if \
                              n.msg_type == 'grpmsg_reply']

    group_msgs = []
    for msg_id in grpmsg_reply_list:
        try:
            m = GroupMessage.objects.get(id=msg_id)
        except GroupMessage.DoesNotExist:
            continue
        else:
            # get group name
            group = get_group(m.group_id)
            if not group:
                continue
            m.group_name = group.group_name
            
            # get attachement
            attachment = get_first_object_or_none(m.messageattachment_set.all())
            if attachment:
                path = attachment.path
                if path == '/':
                    repo = get_repo(attachment.repo_id)
                    if not repo:
                        continue
                    attachment.name = repo.name
                else:
                    attachment.name = os.path.basename(path)
                m.attachment = attachment

            # get message replies
            reply_list = MessageReply.objects.filter(reply_to=m)
            m.reply_cnt = reply_list.count()
            if m.reply_cnt > 3:
                m.replies = reply_list[m.reply_cnt - 3:]
            else:
                m.replies = reply_list

            group_msgs.append(m)

    # remove new group msg reply notification
    UserNotification.objects.filter(to_user=request.user.username,
                                    msg_type='grpmsg_reply').delete()
    
    return render_to_response("group/new_msg_reply.html", {
            'group_msgs': group_msgs,
            }, context_instance=RequestContext(request))


def group_info_for_pub(request, group):
    return render_to_response("group/group_info_for_pub.html", {
            "repos": [],
            "group": group,
            }, context_instance=RequestContext(request))
    

@group_check
def group_info(request, group):

    if group.view_perm == "pub":
        return group_info_for_pub(request, group)

    # Get all group members.
    members = get_group_members(group.id)
        
    org = request.user.org
    if org:
        repos = get_org_group_repos(org['org_id'], group.id,
                                    request.user.username)
    else:
        repos = get_group_repos(group.id, request.user.username)

    recent_commits = []
    cmt_repo_dict = {}
    for repo in repos:
        repo.user_perm = check_permission(repo.props.id, request.user.username)
        cmmts = get_commits(repo.props.id, 0, 10)
        for c in cmmts:
            cmt_repo_dict[c.id] = repo
        recent_commits += cmmts

    recent_commits.sort(lambda x, y : cmp(y.props.ctime, x.props.ctime))
    recent_commits = recent_commits[:15]
    for cmt in recent_commits:
        cmt.repo = cmt_repo_dict[cmt.id]
        cmt.repo.password_set = is_passwd_set(cmt.props.repo_id,
                                              request.user.username)
        cmt.tp = cmt.props.desc.split(' ')[0]

    return render_to_response("group/group_info.html", {
            "members": members,
            "repos": repos,
            "recent_commits": recent_commits,
            "group" : group,
            "is_staff": group.is_staff,
            'create_shared_repo': True,
            'group_members_default_display': GROUP_MEMBERS_DEFAULT_DISPLAY,
            }, context_instance=RequestContext(request));

@group_check
def group_members(request, group):

    # Get all group members.
    members = get_group_members(group.id)

    user = request.user.username
    contacts = Contact.objects.filter(user_email=user)
    contact_emails = []
    for c in contacts:
        contact_emails.append(c.contact_email)
    for m in members:
        if m.user_name == user or m.user_name in contact_emails:
            m.can_be_contact = False
        else:
            m.can_be_contact = True

    return render_to_response("group/group_members.html", {
            "members": members,
            "group" : group,
            "is_staff": group.is_staff,
            }, context_instance=RequestContext(request));

@login_required
@group_staff_required
def group_manage(request, group_id):
    group_id_int = int(group_id) # Checked by URL Conf
    group = get_group(group_id_int)
    if not group:
        return HttpResponseRedirect(reverse('group_list', args=[]))
    user = request.user.username
    
    if request.method == 'POST':
        """
        Add group members.
        """
        result = {}
        content_type = 'application/json; charset=utf-8'

        member_name_str = request.POST.get('user_name', '')
        member_list = string2list(member_name_str)

        # Add users to contacts.        
        for email in member_list:
            mail_sended.send(sender=None, user=user, email=email)

        mail_sended_list = []
        if request.cloud_mode:
            if request.user.org:
                # Can only invite org users to group.
                org_id = request.user.org['org_id']
                for email in member_list:
                    if not ccnet_threaded_rpc.org_user_exists(org_id, email):
                        err_msg = _(u'Failed to add, %s is not in current organization.') % email
                        result['error'] = err_msg
                        return HttpResponse(json.dumps(result), status=400,
                                            content_type=content_type)
                    else:
                        try:
                            ccnet_threaded_rpc.group_add_member(group.id,
                                                                user, email)
                        except SearpcError, e:
                            result['error'] = _(e.msg)
                            return HttpResponse(json.dumps(result), status=500,
                                                content_type=content_type)
            else:
                # Can invite unregistered user to group.
                for email in member_list:
                    if not is_registered_user(email):
                        use_https = request.is_secure()
                        domain = RequestSite(request).domain

                        t = loader.get_template('group/add_member_email.html')
                        c = {
                            'email': user,
                            'to_email': email,
                            'group': group,
                            'domain': domain,
                            'protocol': use_https and 'https' or 'http',
                            'site_name': SITE_NAME,
                            }
                    
                        try:
                            send_mail(_(u'Your friend added you to a group at Seafile.'),
                                      t.render(Context(c)), None, [email],
                                      fail_silently=False)
                            mail_sended_list.append(email)
                        except:
                            data = json.dumps({'error': _(u'Failed to send mail.')})
                            return HttpResponse(data, status=500,
                                                content_type=content_type)

                    # Add user to group, unregistered user will see the group
                    # when he logs in.
                    try:
                        ccnet_threaded_rpc.group_add_member(group.id,
                                                            user, email)
                    except SearpcError, e:
                        result['error'] = _(e.msg)
                        return HttpResponse(json.dumps(result), status=500,
                                            content_type=content_type)
        else:
            # Can only invite registered user to group if not in cloud mode.
            for email in member_list:
                if not is_registered_user(email):
                    err_msg = _(u'Failed to add, %s is not registerd.')
                    result['error'] = err_msg % email
                    return HttpResponse(json.dumps(result), status=400,
                                        content_type=content_type)
                # Add user to group.
                try:
                    ccnet_threaded_rpc.group_add_member(group.id,
                                               user, email)
                except SearpcError, e:
                    result['error'] = _(e.msg)
                    return HttpResponse(json.dumps(result), status=500,
                                        content_type=content_type)
        if mail_sended_list:
            msg = ungettext(
                'Successfully added. An email has been sent.',
                'Successfully added. %(count)s emails have been sent.',
            len(mail_sended_list)) % {
                'count': len(mail_sended_list),
            }
            messages.success(request, msg)

        else:
            messages.success(request, _(u'Successfully added.'))
        return HttpResponse(json.dumps('success'), status=200,
                            content_type=content_type)

    ### GET ###
    members_all = ccnet_threaded_rpc.get_group_members(group.id)
    admins = [ m for m in members_all if m.is_staff ]    

    contacts = Contact.objects.filter(user_email=user)

    if PublicGroup.objects.filter(group_id=group.id):
        is_pub = True
    else:
        is_pub = False

    return render_to_response('group/group_manage.html', {
            'group' : group,
            'members': members_all,
            'admins': admins,
            'contacts': contacts,
            'is_pub': is_pub,
            }, context_instance=RequestContext(request))

@login_required
@group_staff_required
def group_add_admin(request, group_id):
    """
    Add group admin.
    """
    group_id = int(group_id)    # Checked by URL Conf
    
    if request.method != 'POST' or not request.is_ajax():
        raise Http404

    result = {}
    content_type = 'application/json; charset=utf-8'

    member_name_str = request.POST.get('user_name', '')
    member_list = string2list(member_name_str)

    for member_name in member_list:
        # Add user to contacts.
        mail_sended.send(sender=None, user=request.user.username,
                         email=member_name)

        if not is_registered_user(member_name):
            err_msg = _(u'Failed to add, %s is not registrated.') % member_name
            result['error'] = err_msg
            return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)
        
        # Check whether user is in the group
        if is_group_user(group_id, member_name):
            try:
                ccnet_threaded_rpc.group_set_admin(group_id, member_name)
            except SearpcError, e:
                result['error'] = _(e.msg)
                return HttpResponse(json.dumps(result), status=500,
                                    content_type=content_type)
        else:
            try:
                ccnet_threaded_rpc.group_add_member(group_id,
                                                    request.user.username,
                                                    member_name)
                ccnet_threaded_rpc.group_set_admin(group_id, member_name)
            except SearpcError, e:
                result['error'] = _(e.msg)
                return HttpResponse(json.dumps(result), status=500,
                                    content_type=content_type)
        messages.success(request, _(u'Operation succeeded.'))
        return HttpResponse(json.dumps('success'), status=200,
                            content_type=content_type)

@login_required
@group_staff_required
def group_remove_admin(request, group_id):
    """
    Remove group admin, and becomes normal group member.
    """
    user = request.GET.get('u', '')
    try:
        ccnet_threaded_rpc.group_unset_admin(int(group_id), user)
        messages.success(request, _(u'Operation succeeded.'))
    except SearpcError, e:
        messages.error(request, _(e.msg))
    return HttpResponseRedirect(reverse('group_manage', args=[group_id]))
    
@login_required
def group_member_operations(request, group_id, user_name):
    if request.GET.get('op','') == 'delete':
        return group_remove_member(request, group_id, user_name)
    else:
        return HttpResponseRedirect(reverse('group_manage', args=[group_id]))

def group_remove_member(request, group_id, user_name):
    group_id_int = int(group_id) # Checked by URLConf

    group = get_group(group_id_int)
    if not group:
        raise Http404

    if not is_group_staff(group, request.user):
        raise Http404    

    try:
        ccnet_threaded_rpc.group_remove_member(group.id,
                                               request.user.username,
                                               user_name)
        seafserv_threaded_rpc.remove_repo_group(group.id, user_name)
        messages.success(request, _(u'Operation succeeded.'))
    except SearpcError, e:
        messages.error(request, _(u'Failed：%s') % _(e.msg))

    return HttpResponseRedirect(reverse('group_manage', args=[group_id]))

def group_share_repo(request, repo_id, group_id, from_email, permission):
    """
    Share a repo to a group.
    
    """
    # Check whether group exists
    group = get_group(group_id)
    if not group:
        return render_error(request, _(u"Failed to share: the group doesn't exist."))
    
    if seafserv_threaded_rpc.group_share_repo(repo_id, group_id, from_email, permission) != 0:
        return render_error(request, _(u"Failed to share: internal error."))

def group_unshare_repo(request, repo_id, group_id, from_email):
    """
    Unshare a repo in group.
    
    """
    # Check whether group exists
    group = get_group(group_id)
    if not group:
        return render_error(request, _(u"Failed to unshare: the group doesn't exist."))

    # Check whether user is group staff or the one share the repo
    if not seaserv.check_group_staff(group_id, from_email) and \
            seafserv_threaded_rpc.get_group_repo_owner(repo_id) != from_email:
        return render_permission_error(request, _(u"Operation failed: only administrators and the owner of the library can unshare it."))
        
    if unshare_group_repo(repo_id, group_id, from_email) != 0:
        return render_error(request, _(u"Failed to unshare: internal error."))

@login_required
def group_recommend(request):
    """
    Recommend a file or directory to a group.
    now changed to 'post a discussion'
    """
    if request.method != 'POST':
        raise Http404

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT
    
    form = GroupRecommendForm(request.POST)
    if form.is_valid():
        repo_id = form.cleaned_data['repo_id']
        attach_type = form.cleaned_data['attach_type']
        path = form.cleaned_data['path']
        message = form.cleaned_data['message']
        groups = request.POST.getlist('groups') # groups is a group_id list, e.g. [u'1', u'7']
        username = request.user.username

        # Check group id format
        for group_id in groups:
            try:
                group_id = int(group_id)
            except ValueError:
                messages.error(request, _(u'Error: wrong group id'))
                return HttpResponseRedirect(next)

            # Get that group
            group = get_group(group_id)

            # TODO: Check whether repo is in the group and Im in the group
            if not is_group_user(group_id, username):
                err_msg = _(u'Error: you are not in group %s.')
                messages.error(request, err_msg %  group.group_name)
                continue

            # save message to group
            gm = GroupMessage(group_id=group_id, from_email=username,
                              message=message)
            gm.save()

            # send signal
            grpmsg_added.send(sender=GroupMessage, group_id=group_id,
                              from_email=request.user.username)
                    
            # save attachment
            ma = MessageAttachment(group_message=gm, repo_id=repo_id,
                                   attach_type=attach_type, path=path,
                                   src='recommend')
            ma.save()

            group_url = reverse('group_discuss', args=[group_id])
            msg = _(u'Successfully posted to <a href="%(url)s" target="_blank">%(name)s</a>.') %\
                {'url':group_url, 'name':group.group_name}
            messages.add_message(request, messages.INFO, msg)

    else:
        messages.add_message(request, messages.ERROR, _(u'Failed.'))
    return HttpResponseRedirect(next)

@login_required
def create_group_repo(request, group_id):
    """Create a repo and share it to current group"""

    content_type = 'application/json; charset=utf-8'

    def json_error(err_msg):
        result = {'error': [err_msg]}
        return HttpResponseBadRequest(json.dumps(result),
                                      content_type=content_type)
    group_id = int(group_id)
    group = get_group(group_id)
    if not group:
        return json_error(_(u'Failed to create: the group does not exist.'))

    # Check whether user belongs to the group.
    if not is_group_user(group_id, request.user.username):
        return json_error(_(u'Failed to create: you are not in the group.'))

    form = SharedRepoCreateForm(request.POST)
    if not form.is_valid():
        return json_error(form.errors)
    else:
        repo_name = form.cleaned_data['repo_name']
        repo_desc = form.cleaned_data['repo_desc']
        permission = form.cleaned_data['permission']
        encrypted = form.cleaned_data['encryption']
        passwd = form.cleaned_data['passwd']
        user = request.user.username

        org, base_template = check_and_get_org_by_group(group.id, user)
        if org:
            # create group repo in org context
            try:
                repo_id = create_org_repo(repo_name, repo_desc, user, passwd,
                                          org.org_id)
            except:
                repo_id = None
            if not repo_id:
                return json_error(_(u'Failed to create'))

            try:
                status = seafserv_threaded_rpc.add_org_group_repo(repo_id,
                                                                  org.org_id,
                                                                  group.id,
                                                                  user,
                                                                  permission)
            except SearpcError, e:
                status = -1
                
            # if share failed, remove the newly created repo
            if status != 0:
                remove_repo(repo_id)
                return json_error(_(u'Failed to create: internal error.'))
            else:
                result = {'success': True}
                return HttpResponse(json.dumps(result),
                                    content_type=content_type)
        else:
            # create group repo in user context
            repo_id = create_repo(repo_name, repo_desc, user, passwd)
            if not repo_id:
                return json_error(_(u'Failed to create'))

            try:
                status = seafserv_threaded_rpc.group_share_repo(repo_id,
                                                                group.id,
                                                                user,
                                                                permission)
            except SearpcError, e:
                status = -1
                
            # if share failed, remove the newly created repo
            if status != 0:
                remove_repo(repo_id)
                return json_error(_(u'Failed to create: internal error.'))
            else:
                result = {'success': True}
                return HttpResponse(json.dumps(result),
                                    content_type=content_type)

@login_required
def group_joinrequest(request, group_id):
    """
    Handle post request to join a group.
    """
    if not request.is_ajax() or request.method != 'POST':
        raise Http404

    result = {}
    content_type = 'application/json; charset=utf-8'

    group_id = int(group_id)
    group = get_group(group_id) 
    if not group:
        raise Http404

    user = request.user.username
    # TODO: Group creator is group staff now, but may changed in future.
    staff = group.creator_name
    if is_group_user(group_id, user):
        # Already in the group. Normally, this case should not happen.
        err = _(u'You are already in the group.')
        return HttpResponseBadRequest(json.dumps({'error': err}),
                                      content_type=content_type)
    else:
        form = GroupJoinMsgForm(request.POST)
        if form.is_valid():
            group_join_msg = form.cleaned_data['group_join_msg']
            # Send the message to group staff.
            use_https = request.is_secure()
            domain = RequestSite(request).domain
            t = loader.get_template('group/group_join_email.html')
            c = {
                'staff': staff,
                'user': user,
                'group_name': group.group_name,
                'group_join_msg': group_join_msg,
                'site_name': SITE_NAME,
                }
            try:
                send_mail(_(u'apply to join the group'), t.render(Context(c)), None, [staff],
                          fail_silently=False)
                messages.success(request, _(u'Sent successfully, the group admin will handle it.'))
                return HttpResponse(json.dumps('success'),
                                    content_type=content_type)
            except:
                err = _(u'Failed to send. You can try it again later.')
                return HttpResponse(json.dumps({'error': err}), status=500,
                                    content_type=content_type)
        else:
            return HttpResponseBadRequest(json.dumps(form.errors),
                                          content_type=content_type)
        
def attention(request):
    """
    Handle ajax request to query group members used in autocomplete.
    """
    if not request.is_ajax():
        raise Http404

    user = request.user.username
    name_str =  request.GET.get('name_startsWith')
    gids = request.GET.get('gids', '')
    result = []

    members = []
    for gid in gids.split('_'):
        try:
            gid = int(gid)
        except ValueError:
            continue

        if not is_group_user(gid, user):
            continue

        # Get all group users
        members += get_group_members(gid)

    member_names = []
    for m in members:
        if len(result) == 10:   # Return at most 10 results.
            break
        
        if m.user_name == user:
            continue
        
        if m.user_name in member_names:
            # Remove duplicated member names
            continue
        else:
            member_names.append(m.user_name)

        from base.templatetags.seahub_tags import email2nickname, char2pinyin
        nickname = email2nickname(m.user_name)
        pinyin = char2pinyin(nickname)
        if nickname.startswith(name_str) or pinyin.startswith(name_str):
            result.append({'contact_name': nickname})

    content_type = 'application/json; charset=utf-8'
    
    return HttpResponse(json.dumps(result), content_type=content_type)
    

@group_check
def group_discuss(request, group):
    username = request.user.username
    if request.method == 'POST':
        # only login user can post to public group
        if group.view_perm == "pub" and not request.user.is_authenticated():
            raise Http404

        form = MessageForm(request.POST)

        if form.is_valid():
            msg = form.cleaned_data['message']
            message = GroupMessage()
            message.group_id = group.id
            message.from_email = request.user.username
            message.message = msg
            message.save()

            # send signal
            grpmsg_added.send(sender=GroupMessage, group_id=group.id,
                              from_email=username)
            # Always return an HttpResponseRedirect after successfully dealing
            # with POST data.
            return HttpResponseRedirect(reverse('group_discuss', args=[group.id]))
    else:
        form = MessageForm()
        
    # remove user notifications
    UserNotification.objects.filter(to_user=username, msg_type='group_msg',
                                    detail=str(group.id)).delete()
    
    # Get all group members.
    members = get_group_members(group.id)
        
    """group messages"""
    # Show 15 group messages per page.
    paginator = Paginator(GroupMessage.objects.filter(
            group_id=group.id).order_by('-timestamp'), 15)

    # Make sure page request is an int. If not, deliver first page.
    try:
        page = int(request.GET.get('page', '1'))
    except ValueError:
        page = 1

    # If page request (9999) is out of range, deliver last page of results.
    try:
        group_msgs = paginator.page(page)
    except (EmptyPage, InvalidPage):
        group_msgs = paginator.page(paginator.num_pages)

    group_msgs.page_range = paginator.get_page_range(group_msgs.number)

    # Force evaluate queryset to fix some database error for mysql.        
    group_msgs.object_list = list(group_msgs.object_list) 

    attachments = MessageAttachment.objects.filter(group_message__in=group_msgs.object_list)

    msg_replies = MessageReply.objects.filter(reply_to__in=group_msgs.object_list)
    reply_to_list = [ r.reply_to_id for r in msg_replies ]
    
    for msg in group_msgs.object_list:
        msg.reply_cnt = reply_to_list.count(msg.id)
        msg.replies = []
        for r in msg_replies:
            if msg.id == r.reply_to_id:
                msg.replies.append(r)
        msg.replies = msg.replies[-3:]
            
        for att in attachments:
            if att.group_message_id != msg.id:
                continue

            # Attachment name is file name or directory name.
            # If is top directory, use repo name instead.
            path = att.path
            if path == '/':
                repo = get_repo(att.repo_id)
                if not repo:
                    # TODO: what should we do here, tell user the repo
                    # is no longer exists?
                    continue
                att.name = repo.name
            else:
                path = path.rstrip('/') # cut out last '/' if possible
                att.name = os.path.basename(path)

            # Load to discuss page if attachment is a image and from recommend.
            if att.attach_type == 'file' and att.src == 'recommend':
                att.filetype, att.fileext = get_file_type_and_ext(att.name)
                if att.filetype == IMAGE:
                    att.obj_id = get_file_id_by_path(att.repo_id, path)
                    if not att.obj_id:
                        att.err = _(u'File does not exist')
                    else:
                        att.token = web_get_access_token(att.repo_id, att.obj_id,
                                                         'view', username)
                        att.img_url = gen_file_get_url(att.token, att.name)

            msg.attachment = att

    return render_to_response("group/group_discuss.html", {
            "members": members,
            "group" : group,
            "is_staff": group.is_staff,
            "group_msgs": group_msgs,
            "form": form,
            'group_members_default_display': GROUP_MEMBERS_DEFAULT_DISPLAY,
            }, context_instance=RequestContext(request));


class WikiDoesNotExist(Exception):
    pass

class WikiPageMissing(Exception):
    pass

def find_wiki_repo(request, group):
    try:
        groupwiki = GroupWiki.objects.get(group_id=group.id)
        repos = get_group_repos(group.id, request.user.username)
        for repo in repos:
            if repo.id == groupwiki.repo_id:
                return repo
        return None
    except GroupWiki.DoesNotExist:
        return None

def get_file_url(repo_id, path, filename):
    obj_id = get_file_id_by_path(repo_id, path)
    if not obj_id:
        raise WikiPageMissing
    access_token = seafserv_rpc.web_get_access_token(repo_id, obj_id,
                                                     'view', '')
    url = gen_file_get_url(access_token, filename)
    return url, obj_id

def get_wiki_page(request, group, page_name):
    repo = find_wiki_repo(request, group)
    if not repo:
        raise WikiDoesNotExist
    path = "/" + page_name + ".md"
    filename = page_name + ".md"
    url, obj_id = get_file_url(repo.id, path, filename)
    file_response = urllib2.urlopen(url)
    content = file_response.read()
    return content, repo.id, obj_id

def convert_wiki_link(content, group, repo_id, username):
    import re

    def repl(matchobj):
        if matchobj.group(2):   # return origin string in backquotes
            return matchobj.group(2)

        linkname = matchobj.group(1).strip()
        filetype, fileext = get_file_type_and_ext(linkname)
        if fileext == '':
            # convert linkname that extension is missing to a markdown page
            filename = linkname + ".md"
            path = "/" + filename
            if get_file_id_by_path(repo_id, path):
                a_tag = "<a href='%s'>%s</a>"
                return a_tag % (reverse('group_wiki', args=[group.id, linkname]), linkname)                                
            else:
                a_tag = '''<a class="wiki-page-missing" href='%s'>%s</a>'''
                return a_tag % (reverse('group_wiki', args=[group.id, linkname.replace('/', '-')]), linkname)                                
        elif filetype == IMAGE:
            # load image to wiki page
            path = "/" + linkname
            filename = os.path.basename(path)
            obj_id = get_file_id_by_path(repo_id, path)
            if not obj_id:
                # Replace '/' in linkname to '-', since wiki name can not
                # contain '/'.
                return '''<a class="wiki-page-missing" href='%s'>%s</a>''' % \
                    (reverse('group_wiki', args=[group.id, linkname.replace('/', '-')]), linkname)

            token = web_get_access_token(repo_id, obj_id, 'view', username)
            return '<img src="%s" alt="%s" />' % (gen_file_get_url(token, filename), filename)
        else:
            from base.templatetags.seahub_tags import file_icon_filter
            
            # convert other types of filelinks to clickable links
            path = "/" + linkname
            icon = file_icon_filter(linkname)
            s = reverse('repo_view_file', args=[repo_id]) + '?p=' + path
            a_tag = '''<img src="%simg/file/%s" alt="%s" class="vam" /> <a href='%s' target='_blank' class="vam">%s</a>'''
            return a_tag % (MEDIA_URL, icon, icon, s, linkname)

    return re.sub(r'\[\[(.+)\]\]|(`.+`)', repl, content)
    

@group_check
def group_wiki(request, group, page_name="home"):
    username = request.user.username
    content = ''
    wiki_exists = True
    last_modified, latest_contributor = None, None
    try:
        content, repo_id, obj_id = get_wiki_page(request, group, page_name)
    except WikiDoesNotExist:
        wiki_exists = False
    except WikiPageMissing:
        '''create that page for user'''
        repo = find_wiki_repo(request, group)
        # No need to check whether repo is none, since repo is already created
        
        filename = normalize_page_name(page_name) + '.md'
        if not post_empty_file(repo.id, "/", filename, username):
            return render_error(request, _("Failed to create wiki page. Please retry later."))
        return HttpResponseRedirect(reverse('group_wiki', args=[group.id, page_name]))
    else:
        content = convert_wiki_link(content, group, repo_id, username)
        
        # fetch file latest contributor and last modified
        path = '/' + page_name + '.md'
        file_path_hash = md5_constructor(urllib2.quote(path.encode('utf-8'))).hexdigest()[:12]            
        contributors, last_modified, last_commit_id = get_file_contributors(\
            repo_id, path.encode('utf-8'), file_path_hash, obj_id)
        latest_contributor = contributors[0] if contributors else None

    return render_to_response("group/group_wiki.html", {
            "group_id": group.id,
            "group" : group,
            "is_staff": group.is_staff,
            "content": content,
            "page": page_name,
            "wiki_exists": wiki_exists,
            "last_modified": last_modified,
            "latest_contributor": latest_contributor,
            }, context_instance=RequestContext(request))


@group_check
def group_wiki_pages(request, group):
    """
    List wiki pages in group.
    """
    repo = find_wiki_repo(request, group)
    if not repo:
        return render_error(request, _('Wiki is not found.'))

    try:
        dir_id = seafserv_threaded_rpc.get_dir_id_by_path(repo.id, '/')
    except SearpcError, e:
        dir_id = None
    if not dir_id:
        return render_error(request, _('Wiki root path is missing.'))

    try:
        dirs = seafserv_threaded_rpc.list_dir(dir_id)
    except SearpcError, e:
        return render_error(request, _('Failed to list wiki directories.'))

    pages = []
    for e in dirs:
        if stat.S_ISDIR(e.mode):
            continue            # skip directories
        name, ext = os.path.splitext(e.obj_name)
        if ext == '.md':
            pages.append(name)

    return render_to_response("group/group_wiki_pages.html", {
            "group": group,
            "pages": pages,
            "is_staff": group.is_staff,
            }, context_instance=RequestContext(request))


@group_check
def group_wiki_create(request, group):
    if group.view_perm == "pub":
        raise Http404

    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    def json_error(err_msg, status=400):
        result = {'error': err_msg}
        return HttpResponse(json.dumps(result), status=status,
                            content_type=content_type)
    
    form = WikiCreateForm(request.POST)
    if not form.is_valid():
        return json_error(str(form.errors.values()[0]))

    # create group repo in user context
    repo_name = form.cleaned_data['repo_name']
    repo_desc = form.cleaned_data['repo_desc']
    user = request.user.username
    passwd = None
    permission = "rw"

    repo_id = create_repo(repo_name, repo_desc, user, passwd)
    if not repo_id:
        return json_error(_(u'Failed to create'), 500)
    
    try:
        status = seafserv_threaded_rpc.group_share_repo(repo_id,
                                                        group.id,
                                                        user,
                                                        permission)
    except SearpcError, e:
        remove_repo(repo_id)
        return json_error(_(u'Failed to create: internal error.'), 500)

    GroupWiki.objects.save_group_wiki(group_id=group.id, repo_id=repo_id)

    # create home page
    page_name = "home.md"
    if not post_empty_file(repo_id, "/", page_name, user):
        return json_error(_(u'Failed to create home page. Please retry later'), 500)

    next = reverse('group_wiki', args=[group.id])
    return HttpResponse(json.dumps({'href': next}), content_type=content_type)

def normalize_page_name(page_name):
    # Replace special characters to '-'.
    # Do not lower page name and spaces are allowed.
    return slugify(page_name, lower=False, spaces=True)


@group_check
def group_wiki_page_new(request, group, page_name="home"):
    if group.view_perm == "pub":
        raise Http404

    if request.method == 'POST':
        form = MessageForm(request.POST)

        page_name = request.POST.get('page_name', '')
        if not page_name:
            return HttpResponseRedirect(request.META.get('HTTP_REFERER'))
        page_name = normalize_page_name(page_name) # normalize page name

        repo = find_wiki_repo(request, group)
        if not repo:
            return render_error(request, _('Wiki is not found.'))
        
        filename = page_name + ".md"
        filepath = "/" + page_name + ".md"

        # check whether file exists
        if get_file_id_by_path(repo.id, filepath):
            return render_error(request, _('Page "%s" already exists.') % filename)

        if not post_empty_file(repo.id, "/", filename, request.user.username):
            return render_error(request, _('Failed to create wiki page. Please retry later.'))

        url = "%srepo/%s/file/edit/?p=%s&from=wiki_page_new&gid=%s" % \
            (SITE_ROOT, repo.id, filepath, group.id)
        return HttpResponseRedirect(url)


@group_check
def group_wiki_page_edit(request, group, page_name="home"):
    if group.view_perm == "pub":
        raise Http404

    repo = find_wiki_repo(request, group)
    if not repo:
        return render_error(request, _('Wiki is not found.'))

    filepath = "/" + page_name + ".md"
    url = "%srepo/%s/file/edit/?p=%s&from=wiki_page_edit&gid=%s" % \
        (SITE_ROOT, repo.id, filepath, group.id)
    return HttpResponseRedirect(url)


@group_check
def group_wiki_page_delete(request, group, page_name):
    if group.view_perm == "pub":
        raise Http404

    repo = find_wiki_repo(request, group)
    if not repo:
        return render_error(request, _('Wiki is not found.'))
    
    file_name = page_name + '.md'
    user = request.user.username
    if del_file(repo.id, '/', file_name, user):
        messages.success(request, 'Successfully deleted "%s".' % page_name)
    else:
        messages.error(request, 'Failed to delete "%s". Please retry later.' % page_name)

    return HttpResponseRedirect(reverse('group_wiki', args=[group.id]))
    
