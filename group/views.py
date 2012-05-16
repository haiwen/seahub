# encoding: utf-8

from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response, redirect
from django.core.urlresolvers import reverse
from django.template import RequestContext
from auth.decorators import login_required

from seaserv import ccnet_rpc, seafserv_threaded_rpc, get_repo, \
    get_group_repoids

from seahub.views import validate_emailuser
from seahub.utils import go_error, go_permission_error, validate_group_name

from pysearpc import SearpcError

@login_required
def group_list(request):
    groups = ccnet_rpc.get_groups(request.user.username);
    
    return render_to_response("group/groups.html", {
            "groups": groups,
            }, context_instance=RequestContext(request))

@login_required
def group_add(request):
    error_msg = None
    if request.method == 'POST':
        group_name = request.POST.get('group_name')
        if not validate_group_name(group_name):
            return go_error(request, u'小组名称只能包含中英文字符，数字及下划线')
        
        try:
            ccnet_rpc.create_group(group_name.encode('utf-8'), request.user.username)
        except SearpcError, e:
            error_msg = e.msg
            return go_error(request, error_msg)

    return HttpResponseRedirect(reverse('group_list', args=[]))

@login_required
def group_remove(request):
    group_id = request.GET.get('gid')

    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    # check whether use is the group staff
    if not ccnet_rpc.check_group_staff(group_id_int, request.user.username):
        return go_permission_error(request, u'只有小组管理员有权解散小组')
    
    try:
        ccnet_rpc.remove_group(group_id_int, request.user.username)
        seafserv_threaded_rpc.remove_repo_group(group_id_int, None)
    except SearpcError, e:
        return go_error(request, e.msg)

    return HttpResponseRedirect(reverse('group_list', args=[]))

@login_required
def group_info(request, group_id):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    # check whether user belong to the group
    joined = False
    groups = ccnet_rpc.get_groups(request.user.username)
    for group in groups:
        if group.id == group_id_int:
            joined = True
    if not joined:
        return go_error(request, u'未加入该小组')
    
    group = ccnet_rpc.get_group(group_id_int)
    if not group:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    if ccnet_rpc.check_group_staff(group.props.id, request.user.username):
        is_staff = True
    else:
        is_staff = False
        
    members = ccnet_rpc.get_group_members(group_id_int)
    for member in members:
        member.short_username = member.user_name.split('@')[0]
    
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
            "members": members,
            "repos": repos,
            "group_id": group_id,
            "is_staff": is_staff,
            }, context_instance=RequestContext(request));

@login_required
def group_add_member(request):
    if request.method == 'POST':
        group_id = request.POST.get('group_id')
        member_name = request.POST.get('user_name')
        if not validate_emailuser(member_name):
            err_msg = u'用户不存在'
            return go_error(request, err_msg)
        else:
            try:
                group_id_int = int(group_id)
            except ValueError:
                return go_error(request, u'group id 不是有效参数')
            try:
                ccnet_rpc.group_add_member(group_id_int, request.user.username,
                                           member_name)
            except SearpcError, e:
                return go_error(request, e.msg)

    return HttpResponseRedirect(reverse('group_info', args=[group_id]))

@login_required
def group_remove_member(request):
    if request.method == 'POST':
        group_id = request.POST.get('group_id')
        member_name = request.POST.get('user_name')
        if not validate_emailuser(member_name):
            err_msg = u'用户不存在'
            return go_error(request, err_msg)
        else:
            try:
                group_id_int = int(group_id)
            except ValueError:
                return go_error(request, u'group id 不是有效参数')
            try:
                ccnet_rpc.group_remove_member(group_id_int, request.user.username,
                                              member_name)
                seafserv_threaded_rpc.remove_repo_group(group_id_int, member_name)
            except SearpcError, e:
                return go_error(request, e.msg)

    return HttpResponseRedirect(reverse('group_manage', args=[group_id]))

@login_required
def group_quit(request):
    group_id = request.GET.get('gid')
    try:
        group_id_int = int(group_id)
    except ValueError:
        return go_error(request, u'group id 不是有效参数')
    
    try:
        ccnet_rpc.quit_group(group_id_int, request.user.username)
        seafserv_threaded_rpc.remove_repo_group(group_id_int, request.user.username)
    except SearpcError, e:
        return go_error(request, e.msg)
        
    return HttpResponseRedirect(reverse('group_list', args=[]))

@login_required
def group_manage(request, group_id):
    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(reverse('group_list', args=[]))

    # check whether user is the group staff
    if not ccnet_rpc.check_group_staff(group_id_int, request.user.username):
        return go_permission_error(request, u'只有小组管理员有权管理小组')

    members = ccnet_rpc.get_group_members(group_id_int)
    
    return render_to_response('group/group_manage.html', {
            'group_id': group_id_int,
            'members': members,
            }, context_instance=RequestContext(request))
    
def group_share_repo(request, repo_id, group_id, from_email):
    """
    share a repo to a group
    
    """
    # check whether group exists
    group = ccnet_rpc.get_group(group_id)
    if not group:
        return go_error(request, u'共享失败:小组不存在')
    
    # check whether user belong to the group
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
    # check whether group exists
    group = ccnet_rpc.get_group(group_id)
    if not group:
        return go_error(request, u'共享失败:小组不存在')
    
    # check whether user belong to the group
    joined = False
    groups = ccnet_rpc.get_groups(from_email)
    for group in groups:
        if group.props.id == group_id:
            joined = True
    if not joined:
        return go_error(request, u'共享失败:未加入该小组')

    # check whether user is group staff or the one share the repo
    if not ccnet_rpc.check_group_staff(group_id, from_email) and \
            seafserv_threaded_rpc.get_group_repo_share_from(repo_id) != from_email:
        return go_permission_error(request, u'取消共享失败:只有小组管理员或共享目录发布者有权取消共享')
        
    if seafserv_threaded_rpc.group_unshare_repo(repo_id, group_id, from_email) != 0:
        return go_error(request, u'共享失败:内部错误')
