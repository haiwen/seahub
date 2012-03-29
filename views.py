from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
from django.template import RequestContext
from auth.decorators import login_required
from django.db import IntegrityError
from auth.models import User
from django.views.decorators.csrf import csrf_protect
from auth.forms import AuthenticationForm, PasswordResetForm, SetPasswordForm, PasswordChangeForm

from seaserv import cclient, ccnet_rpc, get_groups, get_users, get_repos, \
    get_repo, get_commits, get_branches, \
    seafserv_threaded_rpc, seafserv_rpc, get_binding_userids, get_ccnetuser

from seahub.share.models import GroupShare, UserShare
from seahub.share.forms import GroupAddRepoForm
from seahub.base.accounts import CcnetUser
from forms import AddUserForm

import stat
import time
import settings

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

def validate_owner(request, repo_id):
    is_owner = False
    cid_list = request.user.userid_list
    for cid in cid_list:
        if seafserv_threaded_rpc.is_repo_owner(cid, repo_id):
            is_owner = True

    return is_owner

def repo(request, repo_id):
    # TODO: check permission
    repo = get_repo(repo_id)
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    commits_all = get_commits(repo_id, per_page * (current_page -1), per_page + 1)
    commits = commits_all[:per_page]

    if len(commits_all) == per_page + 1:
        page_next = True
    else:
        page_next = False


    branches = get_branches(repo_id)

    token = ""
    is_owner = False

    if request.user.is_authenticated():
        if validate_owner(request, repo_id):
            is_owner = True
            token = seafserv_threaded_rpc.get_repo_token(repo_id)
        if seafserv_threaded_rpc.repo_is_public(repo_id) > 0:
            is_public = True
        else:
            is_public = False

    return render_to_response('repo.html', {
            "repo": repo,
            "commits": commits,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            "branches": branches,
            "is_owner": is_owner,
            "is_public": is_public,
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
    if not validate_owner(request, repo_id):
        return HttpResponseRedirect(reverse(repo, args=[repo_id]))

    token = request.POST.get('token', '')
    if token:
        seafserv_threaded_rpc.set_repo_token(repo_id, token)

    return HttpResponseRedirect(reverse(repo, args=[repo_id]))


@login_required
def remove_repo(request, repo_id):
    if not validate_owner(request, repo_id) and not request.user.is_staff:
        return render_to_response('permission_error.html', {
            }, context_instance=RequestContext(request))

    seafserv_threaded_rpc.remove_repo(repo_id)
    return HttpResponseRedirect(request.META['HTTP_REFERER'])
    
@login_required
def remove_fetched_repo(request, repo_id, username):
    userid_list = get_binding_userids(username)
    for user_id in userid_list:
        if user_id and repo_id:
            seafserv_threaded_rpc.remove_fetched_repo (user_id, repo_id)
        
    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def myhome(request):
    owned_repos = []
    fetched_repos = []
    quota_usage = 0

    userid_list = get_binding_userids(request.user.username)
    for user_id in userid_list:
        try:
            owned_repos.extend(seafserv_threaded_rpc.list_owned_repos(user_id))
            quota_usage = quota_usage + seafserv_threaded_rpc.get_user_quota_usage(user_id)
            fetched_repos.extend(seafserv_threaded_rpc.list_fetched_repos(user_id))
        except:
            pass

    for repo in owned_repos:
        if seafserv_threaded_rpc.repo_is_public(repo.props.id):
            repo.is_public = True
        else:
            repo.is_public = False
            
    for repo in fetched_repos:
        if seafserv_threaded_rpc.repo_is_public(repo.props.id):
            repo.is_public = True
        else:
            repo.is_public = False

    return render_to_response('myhome.html', {
            "owned_repos": owned_repos,
            "quota_usage": quota_usage,
            "fetched_repos": fetched_repos,
            }, context_instance=RequestContext(request))

@login_required
def ownerhome(request, owner_name):
    owned_repos = []
    fetched_repos = []
    quota_usage = 0

    ownerid_list = get_binding_userids(owner_name)
    for owner_id in ownerid_list:
        if owner_id:
            try:
                owned_repos.extend(seafserv_threaded_rpc.list_owned_repos(owner_id))
                quota_usage = quota_usage + seafserv_threaded_rpc.get_user_quota_usage(owner_id)
                fetched_repos.extend(seafserv_threaded_rpc.list_fetched_repos(owner_id))
            except:
                pass

    return render_to_response('ownerhome.html', {
            "owned_repos": owned_repos,
            "quota_usage": quota_usage,
            "fetched_repos": fetched_repos,
            "owner": owner_name,
            }, context_instance=RequestContext(request))

@login_required
def repo_set_public(request, repo_id):
    if repo_id:
        seafserv_threaded_rpc.repo_set_public(repo_id)
        
    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def repo_unset_public(request, repo_id):
    if repo_id:
        seafserv_threaded_rpc.repo_unset_public(repo_id)
        
    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def repo_list_dir(request, repo_id):
    if repo_id:
        # Not public repo, go to 404 page
        if not seafserv_threaded_rpc.repo_is_public(repo_id):
            raise Http404
        
        repo = seafserv_threaded_rpc.get_repo(repo_id)
        if not request.GET.get('root_id'): # No root id..?
            # ..use HEAD commit's root id
            commit = seafserv_threaded_rpc.get_commit(repo.props.head_cmmt_id)
            root_id = commit.props.root_id
        else:
            root_id = request.GET.get('root_id')
        dirs = seafserv_threaded_rpc.list_dir(root_id)
        for dirent in dirs:
            if stat.S_ISDIR(dirent.props.mode):
                dirent.is_dir = True
            else:
                dirent.is_dir = False
                
        # Get user quota usage 
        user_id = request.user.user_id
        if user_id:
            quota_usage = seafserv_threaded_rpc.get_user_quota_usage(user_id)

        # Get seafile http server address and port from settings.py,
        # and cut out last '/'
        if settings.HTTP_SERVER_ROOT[-1] == '/':
            http_server_root = settings.HTTP_SERVER_ROOT[:-1]
        else:
            http_server_root = settings.HTTP_SERVER_ROOT
    return render_to_response('repo_dir.html', {
            "repo_id": repo_id,
            "dirs": dirs,
            "quota_usage": quota_usage,
            "http_server_root": http_server_root,
            },
            context_instance=RequestContext(request))
        
@login_required
def mypeers(request):
    cid = get_user_cid(request.user)

@login_required
def seafadmin(request):
    if not request.user.is_staff:
        raise Http404

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    repos_all = seafserv_threaded_rpc.get_repo_list(per_page * (current_page -1), per_page + 1)
    repos = repos_all[:per_page]

    if len(repos_all) == per_page + 1:
        page_next = True
    else:
        page_next = False

    for repo in repos:
        try:
            owner_id = seafserv_threaded_rpc.get_repo_owner(repo.props.id)
            repo.owner = ccnet_rpc.get_binding_email(owner_id)
            repo.owner_id = owner_id
        except:
            repo.owner = None
            
    return render_to_response(
        'repos.html', {
            'repos': repos,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

@login_required
def useradmin(request):
    if not request.user.is_staff:
        raise Http404

    users = ccnet_rpc.get_emailusers(-1,-1)
    for user in users:
        try:
            user.userid_list = get_binding_userids(user.get_email())
#            user.ccnet_user = ccnet_rpc.get_user(user.profile.ccnet_user_id)
#            user.role_list = user.ccnet_user.props.role_list.split(',')
        except:
            user.ccnet_user = None

    return render_to_response(
        'useradmin.html', {
            'users': users,
        },
        context_instance=RequestContext(request))

@login_required
def user_info(request, email):
    if not request.user.is_staff:
        raise Http404

    user_dict = {}
    
    userid_list = get_binding_userids(email)
    for userid in userid_list:
        try:
            peernames = ccnet_rpc.get_peernames_by_userid(userid)
            for peername in peernames.split('\n'):
                if not peername:
                    continue
                roles = ccnet_rpc.get_user(userid).props.role_list
                user_dict[peername] = roles
        except:
            pass

    return render_to_response(
        'userinfo.html', {
            'user_dict': user_dict,
            'email': email
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
def user_remove(request, user_id):
    if not request.user.is_staff:
        raise Http404

    ccnetuser = get_ccnetuser(userid=int(user_id))
    ccnetuser.delete()
    
    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def activate_user(request, user_id):
    """The user id is emailuser id."""

    if not request.user.is_staff:
        raise Http404

    ccnetuser = get_ccnetuser(userid=int(user_id))
    ccnetuser.is_active = True
    ccnetuser.save()
    
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
            password = form.cleaned_data['password1']

            ccnetuser = CcnetUser(username=email, raw_password=password)
            ccnetuser.is_active = True
            ccnetuser.save()
            
            return HttpResponseRedirect(reverse('useradmin', args=[]))
    else:
        form = AddUserForm()
    
    return render_to_response("add_user_form.html",  {
            'form': form, 
            }, context_instance=RequestContext(request))
