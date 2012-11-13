# encoding: utf-8
import os
import simplejson as json
from django.core.mail import send_mail
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.contrib.sites.models import RequestSite
from django.http import HttpResponse, HttpResponseRedirect, Http404, \
    HttpResponseBadRequest
from django.shortcuts import render_to_response, redirect
from django.template import Context, loader, RequestContext
from django.template.loader import render_to_string
from django.utils.http import urlquote
from django.utils.translation import ugettext as _
from django.utils.translation import ungettext
from django.views.generic.base import TemplateResponseMixin
from django.views.generic.edit import BaseFormView, FormMixin

from auth.decorators import login_required
from seaserv import ccnet_rpc, ccnet_threaded_rpc, seafserv_threaded_rpc, \
    get_repo, get_group_repos, check_group_staff, get_commits, is_group_user, \
    get_personal_groups_by_user, get_group, get_group_members, \
    get_personal_groups, create_org_repo, get_org_group_repos, \
    get_org_groups_by_user, check_permission
from pysearpc import SearpcError

from decorators import group_staff_required
from models import GroupMessage, MessageReply, MessageAttachment, BusinessGroup
from forms import MessageForm, MessageReplyForm, GroupRecommendForm, \
    GroupAddForm, GroupJoinMsgForm
from signals import grpmsg_added, grpmsg_reply_added
from base.decorators import ctx_switch_required
from base.mixins import LoginRequiredMixin
from seahub.contacts.models import Contact
from seahub.contacts.signals import mail_sended
from seahub.notifications.models import UserNotification
from seahub.profile.models import Profile
from seahub.settings import SITE_ROOT, SITE_NAME
from seahub.shortcuts import get_first_object_or_none
from seahub.utils import render_error, render_permission_error, \
    validate_group_name, string2list, check_and_get_org_by_group, \
    check_and_get_org_by_repo
from seahub.views import is_registered_user
from seahub.forms import RepoCreateForm, SharedRepoCreateForm

class GroupMixin(object):
    def get_username(self):
        return self.request.user.username

    def ajax_form_valid(self):
        return HttpResponse(json.dumps({'success': True}),
                            content_type='application/json; charset=utf-8')

    def ajax_form_invalid(self, form):
        return HttpResponseBadRequest(
            json.dumps(form.errors),
            content_type='application/json; charset=utf-8')

    def is_dept_group(self, group_id):
        try:
            BusinessGroup.objects.get(group_id=group_id, group_type='dept')
            ret = True
        except BusinessGroup.DoesNotExist:
            ret = False
        return ret

    def is_proj_group(self, group_id):
        try:
            BusinessGroup.objects.get(group_id=group_id, group_type='proj')
            ret = True
        except BusinessGroup.DoesNotExist:
            ret = False
        return ret

class GroupListView(LoginRequiredMixin, GroupMixin, TemplateResponseMixin,
                    BaseFormView):
    template_name = 'group/groups.html'
    form_class = GroupAddForm

    def form_valid(self, form):
        group_name = form.cleaned_data['group_name']
        username = self.get_username()
        result = {}
        
        if self.request.cloud_mode:
            # Check whether group name is duplicated in groups he joined and
            # created.
            checked_groups = get_personal_groups_by_user(username)
        else:
            # Check whether group name is duplicated in all groups.
            checked_groups = get_personal_groups(-1, -1)
        for g in checked_groups:
            if g.group_name == group_name:
                result['error'] = _(u'There is already a group with that name.')
                return HttpResponse(json.dumps(result), status=400,
                                    content_type='application/json; charset=utf-8')

        try:
            group_id = ccnet_threaded_rpc.create_group(
                group_name.encode('utf-8'), username)
        except SearpcError, e:
            result['error'] = _(e.msg)
            return HttpResponse(json.dumps(result), status=500,
                                content_type='application/json; charset=utf-8')
        
        if self.request.is_ajax():
            return self.ajax_form_valid()
        else:
            return FormMixin.form_valid(self, form)

    def form_invalid(self, form):
        if self.request.is_ajax():
            return self.ajax_form_invalid(form)
        else:
            return FormMixin.form_invalid(self, form)

    def get_context_data(self, **kwargs):
        kwargs['joined_groups'] = get_personal_groups_by_user(self.get_username())
        return kwargs

# class DeptGroupListView(GroupListView):
#     template_name = 'group/dept_groups.html'

#     def form_valid(self, form):
#         group_name = form.cleaned_data['group_name']
#         username = self.get_username()
#         try:
#             group_id = ccnet_threaded_rpc.create_group(
#                 group_name.encode('utf-8'), username)
#             bg = BusinessGroup()
#             bg.group_id = group_id
#             bg.group_type = 'dept'
#             bg.save()
#         except SearpcError, e:
#             result = {}
#             result['error'] = _(e.msg)
#             return HttpResponse(json.dumps(result),
#                                 content_type='application/json; charset=utf-8')
        
#         if self.request.is_ajax():
#             return self.ajax_form_valid()
#         else:
#             return FormMixin.form_valid(self, form)

#     def get_context_data(self, **kwargs):
#         groups = [ g for g in get_personal_groups_by_user(self.get_username()) \
#                        if self.is_dept_group(g.id)]
#         kwargs['groups'] = groups
#         return kwargs

# class ProjGroupListView(GroupListView):
#     template_name = 'group/proj_groups.html'

#     def form_valid(self, form):
#         group_name = form.cleaned_data['group_name']
#         username = self.get_username()
#         try:
#             group_id = ccnet_threaded_rpc.create_group(
#                 group_name.encode('utf-8'), username)
#             bg = BusinessGroup()
#             bg.group_id = group_id
#             bg.group_type = 'proj'
#             bg.save()
#         except SearpcError, e:
#             result = {}
#             result['error'] = _(e.msg)
#             return HttpResponse(json.dumps(result),
#                                 content_type='application/json; charset=utf-8')
        
#         if self.request.is_ajax():
#             return self.ajax_form_valid()
#         else:
#             return FormMixin.form_valid(self, form)

#     def get_context_data(self, **kwargs):
#         groups = [ g for g in get_personal_groups_by_user(self.get_username()) \
#                        if self.is_proj_group(g.id)]
#         kwargs['groups'] = groups
#         return kwargs

@login_required
def group_remove(request, group_id):
    """
    Remove group from groupadmin page. Only system admin can perform this
    operation.
    """
    # Check whether user is system admin.
    if not request.user.is_staff:
        return render_permission_error(request, _(u'Only administrators can delete the group.'))
        
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
        return render_error(request, e.msg)

    return HttpResponseRedirect(next)

@login_required
def group_dismiss(request, group_id):
    """
    Dismiss a group, only group staff can perform this operation.
    """
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT

    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(next)

    # Check whether user is group staff
    user = request.user.username
    if not ccnet_threaded_rpc.check_group_staff(group_id_int, user):
        return render_permission_error(request, _(u'Only administrators can dismiss the group'))

    try:
        ccnet_threaded_rpc.remove_group(group_id_int, user)
        seafserv_threaded_rpc.remove_repo_group(group_id_int, None)

        if request.user.org:
            org_id = request.user.org['org_id']
            url_prefix = request.user.org['url_prefix']
            ccnet_threaded_rpc.remove_org_group(org_id, group_id_int)
            return HttpResponseRedirect(reverse('org_groups',
                                                args=[url_prefix]))

    except SearpcError, e:
        return render_error(request, e.msg)
    
    return HttpResponseRedirect(reverse('group_list'))

@login_required
def group_quit(request, group_id):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return render_error(request, _(u'group id  is not a valid argument.'))
    
    try:
        ccnet_threaded_rpc.quit_group(group_id_int, request.user.username)
        seafserv_threaded_rpc.remove_repo_group(group_id_int,
                                                request.user.username)
    except SearpcError, e:
        return render_error(request, e.msg)
        
    return HttpResponseRedirect(reverse('group_list', args=[]))

def render_group_info(request, group_id, form):
    group_id_int = int(group_id) # Checkeb by URL Conf

    # remove user notifications
    UserNotification.objects.filter(to_user=request.user.username,
                                    msg_type='group_msg',
                                    detail=str(group_id)).delete()
    
    group = get_group(group_id_int)
    if not group:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    # Get all group members.
    members = get_group_members(group_id_int)
    
    # Check whether user belongs to the group.
    joined = is_group_user(group_id_int, request.user.username)
    if not joined and not request.user.is_staff:
        # Return group public info page.
        return render_to_response('group/group_pubinfo.html', {
                'members': members,
                'group': group,
                }, context_instance=RequestContext(request))

    is_staff = True if check_group_staff(group.id, request.user) else False
        
    managers = []
    common_members = []
    for member in members:
        if member.is_staff == 1:
            managers.append(member)
        else:
            common_members.append(member)

    org = request.user.org
    if org:
        repos = get_org_group_repos(org['org_id'], group_id_int,
                                    request.user.username)
    else:
        repos = get_group_repos(group_id_int, request.user.username)

    for repo in repos:
        repo.user_perm = check_permission(repo.props.id, request.user.username)

    """group messages"""
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '15'))
    except ValueError:
        current_page = 1
        per_page = 15

    msgs_plus_one = GroupMessage.objects.filter(\
        group_id=group_id).order_by(\
        '-timestamp')[per_page*(current_page-1) : per_page*current_page+1]

    if len(msgs_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    group_msgs = msgs_plus_one[:per_page]
    attachments = MessageAttachment.objects.filter(group_message__in=group_msgs)

    msg_replies = MessageReply.objects.filter(reply_to__in=group_msgs)
    reply_to_list = [ r.reply_to_id for r in msg_replies ]
    
    for msg in group_msgs:
        msg.reply_cnt = reply_to_list.count(msg.id)
            
        for att in attachments:
            if msg.id == att.group_message_id:
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
                    # cut out last '/'
                    if path[-1] == '/':
                        path = path[:-1]
                    att.name = os.path.basename(path)
                msg.attachment = att

    contacts = Contact.objects.filter(user_email=request.user.username)

    return render_to_response("group/group_info.html", {
            "managers": managers,
            "common_members": common_members,
            "members": members,
            "repos": repos,
            "group_id": group_id,
            "group" : group,
            "is_staff": is_staff,
            "is_join": joined,
            "group_msgs": group_msgs,
            "form": form,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'create_shared_repo': True,
            'contacts': contacts,
            }, context_instance=RequestContext(request));

@login_required
def group_message_remove(request, group_id, msg_id):
    """
    Remove group message and all message replies and attachments.
    """
    # Checked by URL Conf
    group_id = int(group_id)
    msg_id = int(msg_id)
    
    # Test whether user is in the group
    if not is_group_user(group_id, request.user.username):
        raise Http404

    try:
        gm = GroupMessage.objects.get(id=msg_id)
    except GroupMessage.DoesNotExist:
        return HttpResponse(json.dumps({'success': False, 'err_msg':_(u"The message doesn't exist")}),
                                   content_type='application/json; charset=utf-8')
    else:
        # Test whether user is group admin or message owner.
        if check_group_staff(group_id, request.user) or \
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
        if request.method == 'POST':
            form = MessageReplyForm(request.POST)

            # TODO: invalid form
            if form.is_valid():
                msg = form.cleaned_data['message']
                try:
                    group_msg = GroupMessage.objects.get(id=msg_id)
                except GroupMessage.DoesNotExist:
                    return HttpResponseBadRequest(content_type=content_type)
            
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

                ctx['reply'] = msg_reply
                html = render_to_string("group/group_reply_new.html", ctx)

        else:
            try:
                msg = GroupMessage.objects.get(id=msg_id)
            except GroupMessage.DoesNotExist:
                raise HttpResponse(status=400)

            replies = MessageReply.objects.filter(reply_to=msg)
            ctx['replies'] = replies
            html = render_to_string("group/group_reply_list.html", ctx)

        serialized_data = json.dumps({"html": html})
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

            m.reply_list = reply_list
            m.reply_cnt = reply_list.count()
            group_msgs.append(m)

    # remove new group msg reply notification
    UserNotification.objects.filter(to_user=request.user.username,
                                    msg_type='grpmsg_reply').delete()
    
    return render_to_response("group/new_msg_reply.html", {
            'group_msgs': group_msgs,
            }, context_instance=RequestContext(request))

@login_required
@ctx_switch_required
def group_info(request, group_id):
    if request.method == 'POST':
        form = MessageForm(request.POST)

        if form.is_valid():
            msg = form.cleaned_data['message']
            message = GroupMessage()
            message.group_id = group_id
            message.from_email = request.user.username
            message.message = msg
            message.save()

            # send signal
            grpmsg_added.send(sender=GroupMessage, group_id=group_id,
                              from_email=request.user.username)
            # Always return an HttpResponseRedirect after successfully dealing
            # with POST data.
            return HttpResponseRedirect(reverse('group_info', args=[group_id]))
    else:
        form = MessageForm()
        
        op = request.GET.get('op', '')
        if op == 'delete':
            return group_remove(request, group_id)
        elif op == 'dismiss':
            return group_dismiss(request, group_id)
        elif op == 'quit':
            return group_quit(request, group_id)

    return render_group_info(request, group_id, form)

@login_required
@ctx_switch_required
@group_staff_required
def group_manage(request, group_id):
    group_id = int(group_id)    # Checked by URL Conf

    group = get_group(group_id)
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
                            ccnet_threaded_rpc.group_add_member(group_id,
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
                            send_mail(_(u'Your friend added you to a group in SeaCloud.'),
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
                        ccnet_threaded_rpc.group_add_member(group_id,
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
                    ccnet_threaded_rpc.group_add_member(group_id,
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
    members_all = ccnet_threaded_rpc.get_group_members(group_id)
    admins = [ m for m in members_all if m.is_staff ]    

    contacts = Contact.objects.filter(user_email=user)

    return render_to_response('group/group_manage.html', {
            'group' : group,
            'members': members_all,
            'admins': admins,
            'contacts': contacts,
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
        messages.error(request, e.msg)
    return HttpResponseRedirect(reverse('group_members', args=[group_id]))
    
@login_required
def group_member_operations(request, group_id, user_name):
    if request.GET.get('op','') == 'delete':
        return group_remove_member(request, group_id, user_name)
    else:
        return HttpResponseRedirect(reverse('group_members', args=[group_id]))

@login_required
def group_remove_member(request, group_id, user_name):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return render_error(request, _(u'group id is not valid'))        
    
    if not check_group_staff(group_id_int, request.user):
        raise Http404

    try:
        ccnet_threaded_rpc.group_remove_member(group_id_int,
                                               request.user.username,
                                               user_name)
        seafserv_threaded_rpc.remove_repo_group(group_id_int, user_name)
        messages.success(request, _(u'Operation succeeded.'))
    except SearpcError, e:
        messages.error(request, _(u'Failed：%s') % e.msg)

    return HttpResponseRedirect(reverse('group_members', args=[group_id]))

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
    if not check_group_staff(group_id, from_email) and \
            seafserv_threaded_rpc.get_group_repo_owner(repo_id) != from_email:
        return render_permission_error(request, _(u"Operation failed: only administrators and the owner of the library can unshare it."))
        
    if seafserv_threaded_rpc.group_unshare_repo(repo_id, group_id, from_email) != 0:
        return render_error(request, _(u"Failed to unshare: internal error."))

@login_required
def group_recommend(request):
    """
    Recommend a file or directory to a group.
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

            group_url = reverse('group_info', args=[group_id])
            msg = _(u'Successfully recommended to <a href="%(url)s" target="_blank">%(name)s</a>.') %\
                {'url':group_url, 'name':group.group_name}
            messages.add_message(request, messages.INFO, msg)

    else:
        messages.add_message(request, messages.ERROR, _(u'Failed to recommend.'))
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
    if not get_group(group_id):
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

        org, base_template = check_and_get_org_by_group(group_id, user)
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
                                                                  group_id,
                                                                  user,
                                                                  permission)
            except SearpcError, e:
                status = -1
                
            # if share failed, remove the newly created repo
            if status != 0:
                seafserv_threaded_rpc.remove_repo(repo_id)
                return json_error(_(u'Failed to create: internal error.'))
            else:
                result = {'success': True}
                return HttpResponse(json.dumps(result),
                                    content_type=content_type)
        else:
            # create group repo in user context
            try:
                repo_id = seafserv_threaded_rpc.create_repo(repo_name,
                                                            repo_desc,
                                                            user, passwd)
            except:
                repo_id = None
            if not repo_id:
                return json_error(_(u'Failed to create'))

            try:
                status = seafserv_threaded_rpc.group_share_repo(repo_id,
                                                                group_id,
                                                                user,
                                                                permission)
            except SearpcError, e:
                status = -1
                
            # if share failed, remove the newly created repo
            if status != 0:
                seafserv_threaded_rpc.remove_repo(repo_id)
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
    group =get_group(group_id) 
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
    
