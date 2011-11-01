from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError

from seaserv import cclient, ccnet_rpc, get_groups, get_users, get_repos, \
    get_repo, get_commits, get_branches, seafile_rpc, get_group

from seahub.profile.models import UserProfile
from seahub.group.models import GroupRepo
from seahub.group.forms import GroupAddRepoForm


def get_user_cid(user):
    try:
        profile = user.get_profile()
        return profile.ccnet_user_id
    except UserProfile.DoesNotExist:
        return None


def root(request):
    if request.user.is_authenticated():
        return HttpResponseRedirect(reverse(myhome))
    else:
        return HttpResponseRedirect(reverse(home))


def home(request):
    return render_to_response('home.html', {
            }, context_instance=RequestContext(request))


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
    shared_repos = GroupRepo.objects.filter(group_id=group_id)
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
            group_repo = GroupRepo()
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
    commits = get_commits(repo_id)
    branches = get_branches(repo_id)

    token = ""
    is_owner = False
    if request.user.is_authenticated():
        cid = get_user_cid(request.user)
        if seafile_rpc.is_repo_owner(cid, repo_id):
            is_owner = True
            token = seafile_rpc.get_repo_token(repo_id)

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
    cid = get_user_cid(request.user)
    if not seafile_rpc.is_repo_owner(cid, repo_id):
        return HttpResponseRedirect(reverse(repo, args=[repo_id]))

    token = request.POST.get('token', '')
    if token:
        seafile_rpc.set_repo_token(repo_id, token)

    return HttpResponseRedirect(reverse(repo, args=[repo_id]))


@login_required
def remove_repo(request, repo_id):
    cid = get_user_cid(request.user)
    if not seafile_rpc.is_repo_owner(cid, repo_id):
        return HttpResponseRedirect(reverse(repo, args=[repo_id]))

    seafile_rpc.remove_repo(repo_id)

    return HttpResponseRedirect(reverse(myhome))
    

@login_required
def myhome(request):
    owned_repos = []
    user_id = request.user.user_id
    quota_usage = 0
    if user_id:
        owned_repos = seafile_rpc.list_owned_repos(user_id)
        quota_usage = seafile_rpc.get_user_quota_usage(user_id)

    return render_to_response('myhome.html', {
            "owned_repos": owned_repos,
            "quota_usage": quota_usage,
            }, context_instance=RequestContext(request))


@login_required
def mypeers(request):
    cid = get_user_cid(request.user)
    


@login_required
def myrepos(request):
    cid = request.user.user_id
    owned_repos = seafile_rpc.list_owned_repos(cid)

    return render_to_response('myrepos.html', {
            'owned_repos': owned_repos,
            }, context_instance=RequestContext(request))
