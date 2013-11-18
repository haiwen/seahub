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
from django.shortcuts import render_to_response
from django.template import Context, loader, RequestContext
from django.template.loader import render_to_string
from django.utils.encoding import smart_str
from django.utils import datetime_safe
from django.utils.translation import ugettext as _
from django.utils.translation import ungettext

from seahub.auth.decorators import login_required
import seaserv
from seaserv import ccnet_threaded_rpc, seafserv_threaded_rpc, seafserv_rpc, \
    web_get_access_token, seafile_api, \
    get_repo, get_group_repos, get_commits, is_group_user, \
    get_personal_groups_by_user, get_group, get_group_members, create_repo, \
    get_personal_groups, create_org_repo, get_org_group_repos, \
    check_permission, is_passwd_set, remove_repo, \
    unshare_group_repo, get_file_id_by_path, post_empty_file, del_file
from seaserv import seafile_api
from pysearpc import SearpcError

from decorators import group_staff_required
from models import GroupMessage, MessageReply, MessageAttachment, PublicGroup
from forms import MessageForm, MessageReplyForm, GroupRecommendForm, \
    GroupAddForm, GroupJoinMsgForm, WikiCreateForm
from signals import grpmsg_added, grpmsg_reply_added
from settings import GROUP_MEMBERS_DEFAULT_DISPLAY
from seahub.base.decorators import sys_staff_required
from seahub.base.models import FileDiscuss
from seahub.contacts.models import Contact
from seahub.contacts.signals import mail_sended
from seahub.notifications.models import UserNotification
from seahub.wiki import get_group_wiki_repo, get_group_wiki_page, convert_wiki_link,\
    get_wiki_pages
from seahub.wiki.models import WikiDoesNotExist, WikiPageMissing, GroupWiki
from seahub.wiki.utils import clean_page_name, get_wiki_dirent
from seahub.settings import SITE_ROOT, SITE_NAME, MEDIA_URL
from seahub.shortcuts import get_first_object_or_none
from seahub.utils import render_error, render_permission_error, string2list, \
    check_and_get_org_by_group, gen_file_get_url, get_file_type_and_ext, \
    get_file_contributors, is_valid_email, calc_file_path_hash
from seahub.utils.file_types import IMAGE
from seahub.utils.paginator import Paginator
from seahub.views import is_registered_user
from seahub.views.modules import get_enabled_mods_by_group, MOD_GROUP_WIKI,\
    enable_mod_for_group, disable_mod_for_group, get_available_mods_by_group
from seahub.forms import SharedRepoCreateForm

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
        if PublicGroup.objects.filter(group_id=group.id):
            group.is_pub = True
        else:
            group.is_pub = False

        if not request.user.is_authenticated():
            if not group.is_pub:
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

        if group.is_pub:
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

        # check plan
        num_of_groups = getattr(request.user, 'num_of_groups', -1)
        if num_of_groups > 0:
            current_groups = len(get_personal_groups_by_user(username))
            if current_groups > num_of_groups:
                result['error'] = _(u'You can only create %d groups.<a href="http://seafile.com/">Upgrade account.</a>') % num_of_groups
                return HttpResponse(json.dumps(result), status=500,
                                    content_type=content_type)
        
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
@group_staff_required
def group_transfer(request, group_id):
    """Change group creator.
    """
    if request.method != 'POST':
        raise Http404

    group_id = int(group_id)
    username = request.user.username
    email = request.POST.get('email', '')
    if email != username:
        if not is_group_user(group_id, email):
            ccnet_threaded_rpc.group_add_member(group_id, username, email)
            
        ccnet_threaded_rpc.set_group_creator(group_id, email)

    next = reverse('group_list', args=[])
    return HttpResponseRedirect(next)

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
            r_status = request.GET.get('r_status')
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
                if r_num < 4 or r_status == 'show':
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

    # get available modules(wiki, etc)
    mods_available = get_available_mods_by_group(group.id)
    mods_enabled = get_enabled_mods_by_group(group.id)

    return render_to_response("group/group_info.html", {
            "members": members,
            "repos": repos,
            "recent_commits": recent_commits,
            "group" : group,
            "is_staff": group.is_staff,
            'create_shared_repo': True,
            'group_members_default_display': GROUP_MEMBERS_DEFAULT_DISPLAY,
            "mods_enabled": mods_enabled,
            "mods_available": mods_available,
            }, context_instance=RequestContext(request))

@group_check
def group_members(request, group):

    if group.view_perm == 'pub':
        raise Http404

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

    # get available modules(wiki, etc)
    mods_available = get_available_mods_by_group(group.id)
    mods_enabled = get_enabled_mods_by_group(group.id)
            
    return render_to_response("group/group_members.html", {
            "members": members,
            "group" : group,
            "is_staff": group.is_staff,
            "mods_enabled": mods_enabled,
            "mods_available": mods_available,
            }, context_instance=RequestContext(request))

@login_required
@group_staff_required
def group_manage(request, group_id):
    group_id_int = int(group_id) # Checked by URL Conf
    group = get_group(group_id_int)
    if not group:
        return HttpResponseRedirect(reverse('group_list', args=[]))
    username = request.user.username
    
    if request.method == 'POST':
        """
        Add group members.
        """
        result = {}
        content_type = 'application/json; charset=utf-8'

        member_name_str = request.POST.get('user_name', '')
        member_list = string2list(member_name_str)
        member_list = [x.lower() for x in member_list]

        # Add users to contacts.        
        for email in member_list:
            if not is_valid_email(email):
                continue
            mail_sended.send(sender=None, user=username, email=email)

        mail_sended_list = []
        if request.cloud_mode:
            # check plan
            group_members = getattr(request.user, 'group_members', -1)
            if group_members > 0:
                current_group_members = len(get_group_members(group.id))
                if current_group_members > group_members:
                    result['error'] = _(u'You can only invite %d members.<a href="http://seafile.com/">Upgrade account.</a>') % group_members
                    return HttpResponse(json.dumps(result), status=500,
                                        content_type=content_type)
                        
            # Can invite unregistered user to group.
            for email in member_list:
                if not is_valid_email(email):
                    continue

                if is_group_user(group.id, email):
                    continue
                
                if not is_registered_user(email):
                    use_https = request.is_secure()
                    domain = RequestSite(request).domain
                    t = loader.get_template('group/add_member_email.html')
                    c = {
                        'email': username,
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
                    except Exception, e:
                        logger.warn(e)

                # Add user to group, unregistered user will see the group
                # when he logs in.
                try:
                    ccnet_threaded_rpc.group_add_member(group.id,
                                                        username, email)
                except SearpcError, e:
                    result['error'] = _(e.msg)
                    return HttpResponse(json.dumps(result), status=500,
                                        content_type=content_type)
        else:
            # Can only invite registered user to group if not in cloud mode.
            for email in member_list:
                if not is_valid_email(email):
                    continue

                if is_group_user(group.id, email):
                    continue

                if not is_registered_user(email):
                    err_msg = _(u'Failed to add, %s is not registerd.')
                    result['error'] = err_msg % email
                    return HttpResponse(json.dumps(result), status=400,
                                        content_type=content_type)
                # Add user to group.
                try:
                    ccnet_threaded_rpc.group_add_member(group.id,
                                               username, email)
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

    contacts = Contact.objects.filter(user_email=username)

    if PublicGroup.objects.filter(group_id=group.id):
        group.is_pub = True
    else:
        group.is_pub = False

    # get available modules(wiki, etc)
    mods_available = get_available_mods_by_group(group.id)
    mods_enabled = get_enabled_mods_by_group(group.id)
        
    return render_to_response('group/group_manage.html', {
            'group' : group,
            'members': members_all,
            'admins': admins,
            'contacts': contacts,
            'is_staff': True,
            "mods_enabled": mods_enabled,
            "mods_available": mods_available,
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
    member_list = [x.lower() for x in member_list]

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
            # check plan
            group_members = getattr(request.user, 'group_members', -1)
            if group_members > 0:
                current_group_members = len(get_group_members(group_id))
                if current_group_members > group_members:
                    result['error'] = _(u'You can only invite %d members.<a href="http://seafile.com/">Upgrade account.</a>') % group_members
                    return HttpResponse(json.dumps(result), status=500,
                                        content_type=content_type)
            
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

# def add_group_repo(request, repo_id, group_id, from_email, permission):
#     """
#     Share a repo to a group.
    
#     """
#     # Check whether group exists
#     group = get_group(group_id)
#     if not group:
#         raise Exception, _(u"Failed to share: the group doesn't exist.")
    
#     seafserv_threaded_rpc.group_share_repo(repo_id, group_id, from_email,
#                                            permission)

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
    now changed to 'Discuss'
    for ajax post/get
    """
    content_type = 'application/json; charset=utf-8'
    result = {}
    if request.method == 'POST':

        form = GroupRecommendForm(request.POST)
        if form.is_valid():
            repo_id = form.cleaned_data['repo_id']
            attach_type = form.cleaned_data['attach_type']
            path = form.cleaned_data['path']
            message = form.cleaned_data['message']
            groups = request.POST.getlist('groups') # groups is a group_id list, e.g. [u'1', u'7']
            username = request.user.username

            groups_not_in = []
            groups_posted_to = []
            for group_id in groups:
                # Check group id format
                try:
                    group_id = int(group_id)
                except ValueError:
                    result['err'] = _(u'Error: wrong group id')
                    return HttpResponse(json.dumps(result), status=400, content_type=content_type)

                group = get_group(group_id)
                if not group:
                    result['err'] = _(u'Error: the group does not exist.')
                    return HttpResponse(json.dumps(result), status=400, content_type=content_type)

                # TODO: Check whether repo is in the group and Im in the group
                if not is_group_user(group_id, username):
                    groups_not_in.append(group.group_name)
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

                # save discussion
                fd = FileDiscuss(group_message=gm, repo_id=repo_id, path=path)
                fd.save()

                group_url = reverse('group_discuss', args=[group_id])
                groups_posted_to.append(u'<a href="%(url)s" target="_blank">%(name)s</a>' % \
                {'url':group_url, 'name':group.group_name})

            if len(groups_posted_to) > 0:
                result['success'] = _(u'Successfully posted to %(groups)s.') % {'groups': ', '.join(groups_posted_to)}

            if len(groups_not_in) > 0:
                result['err'] = _(u'Error: you are not in group %s.') % (', '.join(groups_not_in))

        else:
            result['err'] = str(form.errors)
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)
    
    # request.method == 'GET'
    else:
        repo_id = request.GET.get('repo_id')
        path = request.GET.get('path', None)
        repo = get_repo(repo_id)
        if not repo:
            result['err'] = _(u'Error: the library does not exist.')
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)
        if path is None:
            result['err'] = _(u'Error: no path.')
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)
    
    # get discussions & replies
    path_hash = calc_file_path_hash(path)
    discussions = FileDiscuss.objects.filter(path_hash=path_hash, repo_id=repo_id)
    msg_ids = [ e.group_message_id for e in discussions ]

    grp_msgs = GroupMessage.objects.filter(id__in=msg_ids).order_by('-timestamp')
    msg_replies = MessageReply.objects.filter(reply_to__in=grp_msgs)
    for msg in grp_msgs:
        msg.replies = []
        for reply in msg_replies:
            if msg.id == reply.reply_to_id:
                msg.replies.append(reply)
        msg.reply_cnt = len(msg.replies)
        msg.replies = msg.replies[-3:]

    ctx = {}
    ctx['messages'] = grp_msgs
    html = render_to_string("group/discussion_list.html", ctx)
    result['html'] = html
    return HttpResponse(json.dumps(result), content_type=content_type)


@login_required
def create_group_repo(request, group_id):
    """Create a repo and share it to current group"""

    content_type = 'application/json; charset=utf-8'

    def json_error(err_msg):
        result = {'error': err_msg}
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
        return json_error(str(form.errors.values()[0]))
    else:
        repo_name = form.cleaned_data['repo_name']
        repo_desc = form.cleaned_data['repo_desc']
        permission = form.cleaned_data['permission']
        encryption = int(form.cleaned_data['encryption'])

        uuid = form.cleaned_data['uuid']
        magic_str = form.cleaned_data['magic_str']
        encrypted_file_key = form.cleaned_data['encrypted_file_key']

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
            try: 
                if not encryption:
                    repo_id = seafile_api.create_repo(repo_name, repo_desc, user, None)
                else:
                    repo_id = seafile_api.create_enc_repo(uuid, repo_name, repo_desc, user, magic_str, encrypted_file_key, enc_version=2)

            except SearpcError, e:
                repo_id = None 

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

        from seahub.base.templatetags.seahub_tags import email2nickname, char2pinyin
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
    UserNotification.objects.remove_group_msg_notices(username, group.id)
    
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

    # get available modules(wiki, etc)
    mods_available = get_available_mods_by_group(group.id)
    mods_enabled = get_enabled_mods_by_group(group.id)
            
    return render_to_response("group/group_discuss.html", {
            "members": members,
            "group" : group,
            "is_staff": group.is_staff,
            "group_msgs": group_msgs,
            "form": form,
            'group_members_default_display': GROUP_MEMBERS_DEFAULT_DISPLAY,
            "mods_enabled": mods_enabled,
            "mods_available": mods_available,
            }, context_instance=RequestContext(request))

@group_staff_required
@group_check
def group_toggle_modules(request, group):
    """Enable or disable modules.
    """
    if request.method != 'POST':
        raise Http404

    referer = request.META.get('HTTP_REFERER', None)
    next = SITE_ROOT if referer is None else referer
    
    username = request.user.username
    group_wiki = request.POST.get('group_wiki', 'off')
    if group_wiki == 'on':
        enable_mod_for_group(group.id, MOD_GROUP_WIKI)
        messages.success(request, _('Successfully enable "Wiki".'))
    else:
        disable_mod_for_group(group.id, MOD_GROUP_WIKI)
        if referer.find('wiki') > 0:
            next = reverse('group_info', args=[group.id])
        messages.success(request, _('Successfully disable "Wiki".'))

    return HttpResponseRedirect(next)

    
########## wiki
@group_check
def group_wiki(request, group, page_name="home"):
    username = request.user.username
    
    # get available modules(wiki, etc)
    mods_available = get_available_mods_by_group(group.id)
    mods_enabled = get_enabled_mods_by_group(group.id)
    
    wiki_exists = True
    try:
        content, repo, dirent = get_group_wiki_page(username, group, page_name)
    except WikiDoesNotExist:
        wiki_exists = False
        return render_to_response("group/group_wiki.html", {
                "group" : group,
                "is_staff": group.is_staff,
                "wiki_exists": wiki_exists,
                "mods_enabled": mods_enabled,
                "mods_available": mods_available,
                }, context_instance=RequestContext(request))
    except WikiPageMissing:
        '''create that page for user if he/she is a group member'''
        if not is_group_user(group.id, username):
            raise Http404

        repo = get_group_wiki_repo(group, username)
        # No need to check whether repo is none, since repo is already created
        
        filename = clean_page_name(page_name) + '.md'
        if not post_empty_file(repo.id, "/", filename, username):
            return render_error(request, _("Failed to create wiki page. Please retry later."))
        return HttpResponseRedirect(reverse('group_wiki', args=[group.id, page_name]))
    else:
        url_prefix = reverse('group_wiki', args=[group.id])
        content = convert_wiki_link(content, url_prefix, repo.id, username)
        
        # fetch file latest contributor and last modified
        path = '/' + dirent.obj_name
        file_path_hash = calc_file_path_hash(path)
        contributors, last_modified, last_commit_id = get_file_contributors(
            repo.id, path.encode('utf-8'), file_path_hash, dirent.obj_id)
        latest_contributor = contributors[0] if contributors else None

        repo_perm = seafile_api.check_repo_access_permission(repo.id, username)
        return render_to_response("group/group_wiki.html", {
                "group" : group,
                "is_staff": group.is_staff,
                "wiki_exists": wiki_exists,
                "content": content,
                "page": os.path.splitext(dirent.obj_name)[0],
                "last_modified": last_modified,
                "latest_contributor": latest_contributor,
                "path": path,
                "repo_id": repo.id,
                "search_repo_id": repo.id,
                "search_wiki": True,
                "mods_enabled": mods_enabled,
                "mods_available": mods_available,
                "repo_perm": repo_perm,
                }, context_instance=RequestContext(request))

@group_check
def group_wiki_pages(request, group):
    """
    List wiki pages in group.
    """
    username = request.user.username
    try:
        repo = get_group_wiki_repo(group, username)
        pages = get_wiki_pages(repo)
    except SearpcError:
        return render_error(request, _('Internal Server Error'))
    except WikiDoesNotExist:
        return render_error(request, _('Wiki does not exists.'))

    repo_perm = seafile_api.check_repo_access_permission(repo.id, username)
    mods_available = get_available_mods_by_group(group.id)
    mods_enabled = get_enabled_mods_by_group(group.id)
    
    return render_to_response("group/group_wiki_pages.html", {
            "group": group,
            "pages": pages,
            "is_staff": group.is_staff,
            "repo_id": repo.id,
            "search_repo_id": repo.id,
            "search_wiki": True,
            "repo_perm": repo_perm,
            "mods_enabled": mods_enabled,
            "mods_available": mods_available,
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

@group_check
def group_wiki_page_new(request, group, page_name="home"):
    if group.view_perm == "pub":
        raise Http404

    if request.method == 'POST':
        form = MessageForm(request.POST)

        page_name = request.POST.get('page_name', '')
        if not page_name:
            return HttpResponseRedirect(request.META.get('HTTP_REFERER'))
        page_name = clean_page_name(page_name)

        try:
            repo = get_group_wiki_repo(group, request.user.username)
        except WikiDoesNotExist:
            return render_error(request, _('Wiki is not found.'))

        filename = page_name + ".md"
        filepath = "/" + page_name + ".md"

        # check whether file exists
        if get_file_id_by_path(repo.id, filepath):
            return render_error(request, _('Page "%s" already exists.') % filename)

        if not post_empty_file(repo.id, "/", filename, request.user.username):
            return render_error(request, _('Failed to create wiki page. Please retry later.'))

        url = "%s?p=%s&from=wiki_page_new&gid=%s" % (
            reverse('file_edit', args=[repo.id]),
            urllib2.quote(filepath.encode('utf-8')), group.id)
        return HttpResponseRedirect(url)


@group_check
def group_wiki_page_edit(request, group, page_name="home"):
    if group.view_perm == "pub":
        raise Http404

    try:
        repo = get_group_wiki_repo(group, request.user.username)
    except WikiDoesNotExist:
        return render_error(request, _('Wiki is not found.'))

    filepath = "/" + page_name + ".md"
    url = "%s?p=%s&from=wiki_page_edit&gid=%s" % (
            reverse('file_edit', args=[repo.id]),
            urllib2.quote(filepath.encode('utf-8')), group.id)

    return HttpResponseRedirect(url)


@group_check
def group_wiki_page_delete(request, group, page_name):
    if group.view_perm == "pub":
        raise Http404

    try:
        repo = get_group_wiki_repo(group, request.user.username)
    except WikiDoesNotExist:
        return render_error(request, _('Wiki is not found.'))
    
    file_name = page_name + '.md'
    user = request.user.username
    if del_file(repo.id, '/', file_name, user):
        messages.success(request, 'Successfully deleted "%s".' % page_name)
    else:
        messages.error(request, 'Failed to delete "%s". Please retry later.' % page_name)

    return HttpResponseRedirect(reverse('group_wiki', args=[group.id]))
    
