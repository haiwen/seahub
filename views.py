from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.contrib.auth.models import User

from seaserv import cclient, ccnet_rpc, get_groups, get_users, get_repos, \
    get_repo, get_commits, get_branches, \
    seafserv_threaded_rpc

from seahub.profile.models import UserProfile
from seahub.share.models import GroupShare, UserShare
from seahub.share.forms import GroupAddRepoForm
from forms import AddUserForm

@login_required
def root(request):
    return HttpResponseRedirect(reverse(myhome))

def peers(request):
    peer_type = request.REQUEST.get('type', 'all')
    peer_ids = ccnet_rpc.list_peers()
    peers = []
    for peer_id in peer_ids.split("\n"):
        # too handle the ending '\n'
        if peer_id == '':
            continue
        peer = ccnet_rpc.get_peer(peer_id)
        if peer_type == 'all':
            peers.append(peer)
        if peer_type == 'mypeer':
            if peer.props.role_list.find('MyPeer') != -1:
                peers.append(peer)

    users = get_users()
    return render_to_response('peers.html', { 
            'peers': peers,
            'users': users,
            }, context_instance=RequestContext(request))


def groups(request):
    groups = get_groups()
    return render_to_response('groups.html', { 
            'groups': groups,
            }, context_instance=RequestContext(request))


def group(request, group_id):
    """Show a group.

    Login is not required, but permission check based on token should
    be added later.
    """

    group = get_group(group_id)
    shared_repos = GroupShare.objects.filter(group_id=group_id)
    return render_to_response('group.html', {
            'group': group, 'shared_repos': shared_repos,
            }, context_instance=RequestContext(request))


def group_add_repo(request, group_id):
    """Add a repo to a group"""

    group = get_group(group_id)
    if not group:
        raise Http404

    if request.method == 'POST':
        form = GroupAddRepoForm(request.POST)
        if form.is_valid():
            group_repo = GroupShare()
            group_repo.group_id = group_id
            group_repo.repo_id = form.cleaned_data['repo_id']
            try:
                group_repo.save()
            except IntegrityError:
                # catch the case repo added to group before
                pass
            return HttpResponseRedirect(reverse('view_group', args=[group_id]))
    else:
        form = GroupAddRepoForm()
    
    return render_to_response("group_add_repo.html",  {
            'form': form, 'group': group
            }, context_instance=RequestContext(request))



def repo(request, repo_id):
    # TODO: check permission
    repo = get_repo(repo_id)
    commits = get_commits(repo_id, 0, 1000)
    branches = get_branches(repo_id)

    token = ""
    is_owner = False
    if request.user.is_authenticated():
        cid = request.user.user_id
        if seafserv_threaded_rpc.is_repo_owner(cid, repo_id):
            is_owner = True
            token = seafserv_threaded_rpc.get_repo_token(repo_id)

    return render_to_response('repo.html', {
            "repo": repo,
            "commits": commits,
            "branches": branches,
            "is_owner": is_owner,
            "token": token,
            }, context_instance=RequestContext(request))

@login_required
def repo_share(request, repo_id):
    return render_to_response('repo_share.html', {
            "repo": repo,
            "commits": commits,
            "branches": branches,
            }, context_instance=RequestContext(request))


@login_required
def modify_token(request, repo_id):
    cid = request.user.user_id
    if not seafserv_threaded_rpc.is_repo_owner(cid, repo_id):
        return HttpResponseRedirect(reverse(repo, args=[repo_id]))

    token = request.POST.get('token', '')
    if token:
        seafserv_threaded_rpc.set_repo_token(repo_id, token)

    return HttpResponseRedirect(reverse(repo, args=[repo_id]))


@login_required
def remove_repo(request, repo_id):
    cid = request.user.user_id
    if not seafserv_threaded_rpc.is_repo_owner(cid, repo_id) and not request.user.is_staff:
        return render_to_response('permission_error.html', {
            }, context_instance=RequestContext(request))

    seafserv_threaded_rpc.remove_repo(repo_id)
    return HttpResponseRedirect(request.META['HTTP_REFERER'])
    

@login_required
def myhome(request):
    owned_repos = []
    quota_usage = 0

    user_id = request.user.user_id
    if user_id:
        owned_repos = seafserv_threaded_rpc.list_owned_repos(user_id)
        quota_usage = seafserv_threaded_rpc.get_user_quota_usage(user_id)

    return render_to_response('myhome.html', {
            "owned_repos": owned_repos,
            "quota_usage": quota_usage,
            }, context_instance=RequestContext(request))


@login_required
def mypeers(request):
    cid = get_user_cid(request.user)


@login_required
def seafadmin(request):
    if not request.user.is_staff:
        raise Http404

    repos = seafserv_threaded_rpc.get_repo_list("", 1000)
    return render_to_response(
        'repos.html', {
            'repos': repos,
        },
        context_instance=RequestContext(request))

@login_required
def useradmin(request):
    if not request.user.is_staff:
        raise Http404

    users = User.objects.all()
    for user in users:
        try:
            user.profile = user.get_profile()
            user.ccnet_user = ccnet_rpc.get_user(user.profile.ccnet_user_id)
            user.role_list = user.ccnet_user.props.role_list.split(',')
        except:
            user.profile = None
            user.ccnet_user = None

    return render_to_response(
        'useradmin.html', {
            'users': users,
        },
        context_instance=RequestContext(request))


@login_required
def role_add(request, user_id):
    if not request.user.is_staff:
        raise Http404

    if request.method == 'POST':
        role = request.POST.get('role', '')
        if role and len(role) <= 16:
            ccnet_rpc.add_role(user_id, role)

    return HttpResponseRedirect(request.META['HTTP_REFERER'])


@login_required
def role_remove(request, user_id):
    if not request.user.is_staff:
        raise Http404

    role = request.REQUEST.get('role', '')
    if role and len(role) <= 16:
        ccnet_rpc.remove_role(user_id, role)

    return HttpResponseRedirect(request.META['HTTP_REFERER'])


@login_required
def activate_user(request, user_id):
    """The user id is django user id."""

    if not request.user.is_staff:
        raise Http404

    try:
        user = User.objects.get(pk=user_id)
        user.is_active = True
        user.save()
    except User.DoesNotExist:
        pass

    return HttpResponseRedirect(request.META['HTTP_REFERER'])


@login_required
def user_add(request):
    """Add a user"""

    if not request.user.is_staff:
        raise Http404

    if request.method == 'POST':
        form = AddUserForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            username = email
            password = form.cleaned_data['password1']
            new_user = User.objects.create_user(username, email, password)
            new_user.is_active = True
            new_user.save()
            return HttpResponseRedirect(reverse('useradmin', args=[]))
    else:
        form = AddUserForm()
    
    return render_to_response("add_user_form.html",  {
            'form': form, 
            }, context_instance=RequestContext(request))
