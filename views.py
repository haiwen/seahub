from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.contrib.auth.decorators import login_required

from seaserv import cclient, ccnet_rpc, get_groups, get_users, get_repos, \
    get_repo, get_commits, get_branches

def root(request):
    if request.user.is_authenticated():
        return HttpResponseRedirect(reverse(myhome))
    else:
        return HttpResponseRedirect(reverse(home))


def home(request):
    return render_to_response('home.html', {
            }, context_instance=RequestContext(request))

def repos(request):
    repos = get_repos()
    return render_to_response('repos.html', {
            "repos": repos,
            }, context_instance=RequestContext(request))

def repo(request, repo_id):
    repo = get_repo(repo_id)
    commits = get_commits(repo_id)
    branches = get_branches(repo_id)
    return render_to_response('repo.html', {
            "repo": repo,
            "commits": commits,
            "branches": branches,
            }, context_instance=RequestContext(request))
    

def get_user_cid(user):
    try:
        profile = user.get_profile()
        return profile.ccnet_user_id
    except UserProfile.DoesNotExist:
        return None
    

@login_required
def myhome(request):
    ccnet_user_id = ""
    try:
        profile = request.user.get_profile()
        ccnet_user_id = profile.ccnet_user_id
    except UserProfile.DoesNotExist:
        pass
    
    return render_to_response('myhome.html', {
            "ccnet_user_id": ccnet_user_id,
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


@login_required
def myfiles(request):
    cid = get_user_cid(request.user)
    uploaded_items = []
    return render_to_response('myfiles.html', {
            'uploaded_items': uploaded_items,
            }, context_instance=RequestContext(request))
