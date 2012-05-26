# encoding: utf-8
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext

from auth.decorators import login_required
from seaserv import ccnet_rpc, seafserv_threaded_rpc, get_repo, \
    get_group_repoids
from pysearpc import SearpcError

from seahub.contacts.models import Contact
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
            ccnet_rpc.create_group(group_name.encode('utf-8'),
                                   request.user.username)
        except SearpcError, e:
            error_msg = e.msg
            return go_error(request, error_msg)
    
    groups = ccnet_rpc.get_groups(request.user.username);
    
    return render_to_response("group/groups.html", {
            "groups": groups,
            }, context_instance=RequestContext(request))

@login_required
def group_operations(request, group_id):
    op = request.GET.get('op', '')
    if op == 'delete':
        return group_remove(request, group_id)
    elif op == 'quit':
        return group_quit(request, group_id)
    else:
        return group_info(request, group_id )

@login_required
def group_remove(request, group_id):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    # Check whether user is the group staff or admin
    if not ccnet_rpc.check_group_staff(group_id_int, request.user.username) \
            and not request.user.is_staff:
        return go_permission_error(request, u'只有小组管理员有权解散小组')
    
    try:
        ccnet_rpc.remove_group(group_id_int, request.user.username)
        seafserv_threaded_rpc.remove_repo_group(group_id_int, None)
    except SearpcError, e:
        return go_error(request, e.msg)

    if request.GET.get('src', '') == 'groupadmin':
        return HttpResponseRedirect(request.META['HTTP_REFERER'])
    else:
        return HttpResponseRedirect(reverse('group_list', args=[]))

@login_required
def group_quit(request, group_id):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return go_error(request, u'group id 不是有效参数')
    
    try:
        ccnet_rpc.quit_group(group_id_int, request.user.username)
        seafserv_threaded_rpc.remove_repo_group(group_id_int,
                                                request.user.username)
    except SearpcError, e:
        return go_error(request, e.msg)
        
    return HttpResponseRedirect(reverse('group_list', args=[]))

@login_required
def group_info(request, group_id):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    # Check whether user belong to the group or admin
    joined = False
    groups = ccnet_rpc.get_groups(request.user.username)
    for group in groups:
        if group.id == group_id_int:
            joined = True
    if not joined and not request.user.is_staff:
        return go_error(request, u'未加入该小组')
    
    group = ccnet_rpc.get_group(group_id_int)
    if not group:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    if ccnet_rpc.check_group_staff(group.props.id, request.user.username):
        is_staff = True
    else:
        is_staff = False
        
    members = ccnet_rpc.get_group_members(group_id_int)
    managers = []
    common_members = []
    for member in members:
        member.short_username = member.user_name.split('@')[0]
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
        if request.user.username == repo.share_from:
            repo.share_from_me = True
        else:
            repo.share_from_me = False
        repos.append(repo)

    return render_to_response("group/group_info.html", {
            "managers": managers,
            "common_members": common_members,
            "repos": repos,
            "group_id": group_id,
            "group" : group,
            "is_staff": is_staff,
            "is_join": joined,
            }, context_instance=RequestContext(request));

@login_required
def group_members(request, group_id):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return go_error(request, u'group id 不是有效参数')        

    # Check whether user is the group staff
    if not ccnet_rpc.check_group_staff(group_id_int, request.user.username):
        return go_permission_error(request, u'只有小组管理员有权管理小组')

    group = ccnet_rpc.get_group(group_id_int)
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

        for member_name in member_name_dict.keys():
            if not validate_emailuser(member_name):
                err_msg = u'用户 %s 不存在' % member_name
                return go_error(request, err_msg)
            else:
                try:
                    ccnet_rpc.group_add_member(group_id_int,
                                               request.user.username,
                                               member_name)
                except SearpcError, e:
                    return go_error(request, e.msg)
            
    members = ccnet_rpc.get_group_members(group_id_int)
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
    
    # Check whether user is the group staff
    if not ccnet_rpc.check_group_staff(group_id_int, request.user.username):
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
            ccnet_rpc.group_remove_member(group_id_int, request.user.username,
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
    group = ccnet_rpc.get_group(group_id)
    if not group:
        return go_error(request, u'共享失败:小组不存在')
    
    # Check whether user belong to the group
    joined = False
    groups = ccnet_rpc.get_groups(request.user.username)
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
    group = ccnet_rpc.get_group(group_id)
    if not group:
        return go_error(request, u'共享失败:小组不存在')
    
    # Check whether user belong to the group
    joined = False
    groups = ccnet_rpc.get_groups(from_email)
    for group in groups:
        if group.props.id == group_id:
            joined = True
    if not joined:
        return go_error(request, u'共享失败:未加入该小组')

    # Check whether user is group staff or the one share the repo
    if not ccnet_rpc.check_group_staff(group_id, from_email) and \
            seafserv_threaded_rpc.get_group_repo_share_from(repo_id) != from_email:
        return go_permission_error(request, u'取消共享失败:只有小组管理员或共享目录发布者有权取消共享')
        
    if seafserv_threaded_rpc.group_unshare_repo(repo_id, group_id, from_email) != 0:
        return go_error(request, u'共享失败:内部错误')
