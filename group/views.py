# encoding: utf-8
import simplejson as json
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext

from auth.decorators import login_required
from seaserv import ccnet_rpc, ccnet_threaded_rpc, seafserv_threaded_rpc, get_repo, \
    get_group_repoids, check_group_staff, get_commits
from pysearpc import SearpcError

from models import GroupMessage, MessageReply
from forms import MessageForm, MessageReplyForm
from signals import grpmsg_added, grpmsg_reply_added
from seahub.contacts.models import Contact
from seahub.notifications.models import UserNotification
from seahub.profile.models import Profile
from seahub.utils import go_error, go_permission_error, validate_group_name
from seahub.views import validate_emailuser

@login_required
def group_list(request):
    error_msg = None
    if request.method == 'POST':
        """
        Add new group.
        """
        group_name = request.POST.get('group_name')
        if not validate_group_name(group_name):
            return go_error(request, u'小组名称只能包含中英文字符，数字及下划线')
        
        try:
            group_id = ccnet_threaded_rpc.create_group(group_name.encode('utf-8'),
                                   request.user.username)
            # TODO: transaction?
            if request.user.org and group_id > 0:
                ccnet_threaded_rpc.add_org_group(request.user.org.org_id,
                                        group_id)
        except SearpcError, e:
            error_msg = e.msg
            return go_error(request, error_msg)
    
    groups = ccnet_threaded_rpc.get_groups(request.user.username);
    
    return render_to_response("group/groups.html", {
            "groups": groups,
            }, context_instance=RequestContext(request))

@login_required
def group_remove(request, group_id):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    # Check whether user is the group staff or admin
    if not ccnet_threaded_rpc.check_group_staff(group_id_int, request.user.username) \
            and not request.user.is_staff:
        return go_permission_error(request, u'只有小组管理员有权解散小组')
    
    try:
        ccnet_threaded_rpc.remove_group(group_id_int, request.user.username)
        seafserv_threaded_rpc.remove_repo_group(group_id_int, None)

        if request.user.org:
            ccnet_threaded_rpc.remove_org_group(request.user.org.org_id,
                                       group_id_int)
    except SearpcError, e:
        return go_error(request, e.msg)

    if request.GET.get('src', '') == 'orggroupadmin':
        return HttpResponseRedirect(reverse('org_group_admin'))
    elif request.GET.get('src', '') == 'sysgroupadmin':
        return HttpResponseRedirect(reverse('sys_group_admin'))
    else:
        return HttpResponseRedirect(reverse('group_list', args=[]))

@login_required
def group_quit(request, group_id):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return go_error(request, u'group id 不是有效参数')
    
    try:
        ccnet_threaded_rpc.quit_group(group_id_int, request.user.username)
        seafserv_threaded_rpc.remove_repo_group(group_id_int,
                                                request.user.username)
    except SearpcError, e:
        return go_error(request, e.msg)
        
    return HttpResponseRedirect(reverse('group_list', args=[]))

def render_group_info(request, group_id, form):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    # Check whether user belong to the group or admin
    joined = False
    groups = ccnet_threaded_rpc.get_groups(request.user.username)
    for group in groups:
        if group.id == group_id_int:
            joined = True
    if not joined and not request.user.is_staff:
        return go_error(request, u'未加入该小组')
    
    group = ccnet_threaded_rpc.get_group(group_id_int)
    if not group:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    if check_group_staff(group.id, request.user):
        is_staff = True
    else:
        is_staff = False
        
    members = ccnet_threaded_rpc.get_group_members(group_id_int)
    managers = []
    common_members = []
    for member in members:
#        member.short_username = member.user_name.split('@')[0]
        if member.is_staff == 1:
            managers.append(member)
        else:
            common_members.append(member)
    
    repos = []
    repo_ids = get_group_repoids(group_id=group_id_int)
    for repo_id in repo_ids:
        if not repo_id:
            continue
        repo = get_repo(repo_id)
        if not repo:
            continue
        
        repo.share_from = seafserv_threaded_rpc.get_group_repo_share_from(repo_id)
        repo.share_from_me = True if request.user.username == repo.share_from else False:

        try:
            repo.latest_modify = get_commits(repo.id, 0, 1)[0].ctime
        except:
            repo.latest_modify = None

        repos.append(repo)
    repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))

    # remove user notifications
    UserNotification.objects.filter(to_user=request.user.username,
                                    msg_type='group_msg',
                                    detail=str(group_id)).delete()
    
    """group messages"""
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '15'))
    except ValueError:
        current_page = 1
        per_page = 15

    msgs_plus_one = GroupMessage.objects.filter(group_id=group_id).order_by('-timestamp')[per_page*(current_page-1) : per_page*current_page+1]

    if len(msgs_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    group_msgs = msgs_plus_one[:per_page]
    for msg in group_msgs:
        msg.reply_list = MessageReply.objects.filter(reply_to=msg)
        msg.reply_cnt = len(msg.reply_list)

    return render_to_response("group/group_info.html", {
            "managers": managers,
            "common_members": common_members,
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
            }, context_instance=RequestContext(request));

@login_required
def msg_reply(request, msg_id):
    """Show group message replies, and process message reply in ajax"""
    if request.is_ajax():
        if request.method == 'POST':
            form = MessageReplyForm(request.POST)

            # TODO: invalid form
            if form.is_valid():
                msg = form.cleaned_data['message']
                try:
                    group_msg = GroupMessage.objects.get(id=msg_id)
                except GroupMessage.DoesNotExist:
                    return HttpResponse(status=400)
            
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
                
            
        content_type = 'application/json; charset=utf-8'
        
        try:
            msg = GroupMessage.objects.get(id=msg_id)
        except GroupMessage.DoesNotExist:
            raise HttpResponse(status=400)

        l = []
        replies = MessageReply.objects.filter(reply_to=msg)        
        for e in replies:
            try:
                p = Profile.objects.get(user=e.from_email)
                e.nickname = p.nickname
            except Profile.DoesNotExist:
                e.nickname = e.from_email
                
            d = {}
            d['from_email'] = e.from_email
            d['nickname'] = e.nickname
            d['message'] = e.message
            l.append(d)
                
        return HttpResponse(json.dumps(l), content_type=content_type)
    else:
        return HttpResponse(status=400)

@login_required
def msg_reply_new(request):
    grpmsg_reply_list = []
    notes = UserNotification.objects.filter(to_user=request.user.username)
    for n in notes:
        if n.msg_type == 'grpmsg_reply':
            grpmsg_reply_list.append(n.detail)

    group_msgs = []
    for msg_id in grpmsg_reply_list:
        try:
            m = GroupMessage.objects.get(id=msg_id)
            # get group name
            group = ccnet_threaded_rpc.get_group(int(m.group_id))
            m.group_name = group.group_name
            
            # get message replies
            reply_list = MessageReply.objects.filter(reply_to=m)
            # get nickname
            for reply in reply_list:
                try:
                    p = Profile.objects.get(user=reply.from_email)
                    reply.nickname = p.nickname
                except Profile.DoesNotExist:
                    reply.nickname = reply.from_email

            m.reply_list = reply_list
            group_msgs.append(m)
        except GroupMessage.DoesNotExist:
            continue

    # remove new group msg reply notification
    UserNotification.objects.filter(to_user=request.user.username,
                                    msg_type='grpmsg_reply').delete()
    
    return render_to_response("group/new_msg_reply.html", {
            'group_msgs': group_msgs,
            }, context_instance=RequestContext(request))

@login_required
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

            # clear form data
            form = MessageForm()

            # send signal
            grpmsg_added.send(sender=GroupMessage, group_id=group_id,
                              from_email=request.user.username)
    else:
        form = MessageForm()
        
        op = request.GET.get('op', '')
        if op == 'delete':
            return group_remove(request, group_id)
        elif op == 'quit':
            return group_quit(request, group_id)

    return render_group_info(request, group_id, form)

@login_required
def group_members(request, group_id):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return go_error(request, u'group id 不是有效参数')        

    if not check_group_staff(group_id_int, request.user):
        return go_permission_error(request, u'只有小组管理员有权管理小组')

    group = ccnet_threaded_rpc.get_group(group_id_int)
    if not group:
        return HttpResponseRedirect(reverse('group_list', args=[]))
    
    if request.method == 'POST':
        """
        Add group members.
        """
        member_name_str = request.POST.get('user_name', '')
        # Handle the diffent separator
        member_name_str = member_name_str.replace('\n',',')
        member_name_str = member_name_str.replace('\r',',')
        member_name_list = member_name_str.split(',')

        # Remove same member name
        member_name_dict = {}
        for member_name in member_name_list:
            member_name = member_name.strip(' ')
            if not member_name:
                continue
            member_name_dict[member_name] = member_name

        if request.user.org:
            for member_name in member_name_dict.keys():
                if not ccnet_threaded_rpc.org_user_exists(request.user.org.org_id,
                                                 member_name):
                    err_msg = u'当前企业不存在 %s 用户' % member_name
                    return go_error(request, err_msg)
                else:
                    try:
                        ccnet_threaded_rpc.group_add_member(group_id_int,
                                                   request.user.username,
                                                   member_name)
                    except SearpcError, e:
                        return go_error(request, e.msg)
        else:
            for member_name in member_name_dict.keys():
                if not validate_emailuser(member_name):
                    err_msg = u'用户 %s 不存在' % member_name
                    return go_error(request, err_msg)
                else:
                    try:
                        ccnet_threaded_rpc.group_add_member(group_id_int,
                                                   request.user.username,
                                                   member_name)
                    except SearpcError, e:
                        return go_error(request, e.msg)
            
    members = ccnet_threaded_rpc.get_group_members(group_id_int)
    contacts = Contact.objects.filter(user_email=request.user.username)
    
    return render_to_response('group/group_manage.html', {
            'group' : group,
            'members': members,
            'contacts': contacts,
            }, context_instance=RequestContext(request))
    
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
        return go_error(request, u'group id 不是有效参数')        
    
    if not check_group_staff(group_id_int, request.user):
        return go_permission_error(request, u'只有小组管理员有权删除成员')
    
    if not validate_emailuser(user_name):
        err_msg = u'用户不存在'
        return go_error(request, err_msg)
    else:
        try:
            group_id_int = int(group_id)
        except ValueError:
            return go_error(request, u'group id 不是有效参数')
        try:
            ccnet_threaded_rpc.group_remove_member(group_id_int, request.user.username,
                                          user_name)
            seafserv_threaded_rpc.remove_repo_group(group_id_int, user_name)
        except SearpcError, e:
            return go_error(request, e.msg)

    return HttpResponseRedirect(reverse('group_members', args=[group_id]))
    
def group_share_repo(request, repo_id, group_id, from_email):
    """
    Share a repo to a group.
    
    """
    # Check whether group exists
    group = ccnet_threaded_rpc.get_group(group_id)
    if not group:
        return go_error(request, u'共享失败:小组不存在')
    
    # Check whether user belong to the group
    joined = False
    groups = ccnet_threaded_rpc.get_groups(request.user.username)
    for group in groups:
        if group.props.id == group_id:
            joined = True
    if not joined:
        return go_error(request, u'共享失败:未加入该小组')
    
    if seafserv_threaded_rpc.group_share_repo(repo_id, group_id, from_email, 'rw') != 0:
        return go_error(request, u'共享失败:内部错误')

def group_unshare_repo(request, repo_id, group_id, from_email):
    """
    unshare a repo to a group
    
    """
    # Check whether group exists
    group = ccnet_threaded_rpc.get_group(group_id)
    if not group:
        return go_error(request, u'共享失败:小组不存在')
    
    # Check whether user belong to the group
    joined = False
    groups = ccnet_threaded_rpc.get_groups(from_email)
    for group in groups:
        if group.props.id == group_id:
            joined = True
    if not joined:
        return go_error(request, u'共享失败:未加入该小组')

    # Check whether user is group staff or the one share the repo
    if not check_group_staff(group_id, from_email) and \
            seafserv_threaded_rpc.get_group_repo_share_from(repo_id) != from_email:
        return go_permission_error(request, u'取消共享失败:只有小组管理员或共享目录发布者有权取消共享')
        
    if seafserv_threaded_rpc.group_unshare_repo(repo_id, group_id, from_email) != 0:
        return go_error(request, u'共享失败:内部错误')
