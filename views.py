# encoding: utf-8
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response, redirect
from django.core.urlresolvers import reverse
from django.template import RequestContext
from auth.decorators import login_required
from django.db import IntegrityError
from django.views.decorators.csrf import csrf_protect
from auth.forms import AuthenticationForm, PasswordResetForm, SetPasswordForm, PasswordChangeForm
from auth.tokens import default_token_generator

from seaserv import cclient, ccnet_rpc, get_groups, get_users, get_repos, \
    get_repo, get_commits, get_branches, \
    seafserv_threaded_rpc, seafserv_rpc, get_binding_peerids, get_ccnetuser

from seahub.share.models import GroupShare, UserShare
from seahub.share.forms import GroupAddRepoForm
from seahub.base.accounts import CcnetUser
from forms import AddUserForm
from urllib import quote

import stat
import time
import settings

def list_to_string(l):
    tmp_str = ''
    for e in l[:-1]:
        tmp_str = tmp_str + e + ','
    tmp_str = tmp_str + l[-1]
    
    return tmp_str

def get_httpserver_root():
    # Get seafile http server address and port from settings.py,
    # and cut out last '/'
    if settings.HTTP_SERVER_ROOT[-1] == '/':
        http_server_root = settings.HTTP_SERVER_ROOT[:-1]
    else:
        http_server_root = settings.HTTP_SERVER_ROOT
    return http_server_root

def get_ccnetapplet_root():
    # Get ccnet applet address and port from settings.py,
    # and cut out last '/'
    if settings.CCNET_APPLET_ROOT[-1] == '/':
        ccnet_applet_root = settings.CCNET_APPLET_ROOT[:-1]
    else:
        ccnet_applet_root = settings.CCNET_APPLET_ROOT
    return ccnet_applet_root
    
    
def gen_token():
    # Generate short token used for owner to access repo file
    from django.utils.hashcompat import sha_constructor
    token = sha_constructor(settings.SECRET_KEY + unicode(time.time())).hexdigest()[::8]
    return token

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
    # check whether email in the request own the repo
    return seafserv_threaded_rpc.is_repo_owner(request.user.username, repo_id)

#def check_fetched_repo(request, repo_id):
#    # check whether user has fetched the repo
#    peerid_list = get_binding_peerids(request.user.username)
#    for peer_id in peerid_list:
#        repos = seafserv_threaded_rpc.list_fetched_repos(peer_id)
#        for repo in repos:
#            if cmp(repo.props.id, repo_id):
#                return True
# 
#    return False

def check_shared_repo(request, repo_id):
    # check whether user has been shared this repo
    repos = seafserv_threaded_rpc.list_share_repos(request.user.username, 'to_email', -1, -1)
    
    for repo in repos:
        if cmp(repo.props.id, repo_id) == 0:
            return True

    return False

def validate_emailuser(email):
    # check whether emailuser is in the database
    if ccnet_rpc.get_emailuser(email) != None:
        return True
    
    return False

@login_required
def repo(request, repo_id):
    # if user is not staff and not owner and not fetch this repo
    # and not shared this repo, then goto 404 page..
    if not validate_owner(request, repo_id) and not check_shared_repo(request, repo_id) \
            and not request.user.is_staff:
        raise Http404

    repo = get_repo(repo_id)

    recent_commits = get_commits(repo_id, 0, 3)

    token = ""
    is_owner = False
    repo_ap = ""
    
    if request.user.is_authenticated():
        if validate_owner(request, repo_id):
            is_owner = True
            token = seafserv_threaded_rpc.get_repo_token(repo_id)
        repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
        repo_size = seafserv_threaded_rpc.server_repo_size(repo_id)

    return render_to_response('repo.html', {
            "repo": repo,
            "recent_commits": recent_commits,
            "is_owner": is_owner,
            "repo_ap": repo_ap,
            "repo_size": repo_size,
            "token": token,
            }, context_instance=RequestContext(request))


def repo_history(request, repo_id):
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


    return render_to_response('repo_history.html', {
            "repo": repo,
            "commits": commits,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
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
def remove_fetched_repo(request, user_id, repo_id):
    if user_id and repo_id:
        seafserv_threaded_rpc.remove_fetched_repo (user_id, repo_id)
        
    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def myhome(request):
    owned_repos = []
    quota_usage = 0
    output_msg = {}

    email = request.user.username
    quota_usage = seafserv_threaded_rpc.get_user_quota_usage(email)
    owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
    
    # Repos that are share to me
    in_repos = seafserv_threaded_rpc.list_share_repos(request.user.username, 'to_email', -1, -1)
    
    if request.method == 'POST':
        output_msg = repo_add_share(request)

    return render_to_response('myhome.html', {
            "owned_repos": owned_repos,
            "quota_usage": quota_usage,
            "in_repos": in_repos,
            "output_msg": output_msg
            }, context_instance=RequestContext(request))

@login_required
def ownerhome(request, owner_name):
    owned_repos = []
    quota_usage = 0

    owned_repos = seafserv_threaded_rpc.list_owned_repos(owner_name)
    quota_usage = seafserv_threaded_rpc.get_user_quota_usage(owner_name)

    user_dict = user_info(request, owner_name)
    
    return render_to_response('ownerhome.html', {
            "owned_repos": owned_repos,
            "quota_usage": quota_usage,
            "owner": owner_name,
            "user_dict": user_dict,
            }, context_instance=RequestContext(request))

@login_required
def repo_set_access_property(request, repo_id):
    if repo_id:
        ap = request.GET.get('ap', '')
        seafserv_threaded_rpc.repo_set_access_property(repo_id, ap)

    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def repo_list_dir(request, repo_id):
    if repo_id:
        # any person visit private repo, go to 404 page
        repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
        if repo_ap == 'private':
            raise Http404

        # people who is not owner visits own repo, go to 404 page
        if not validate_owner(request, repo_id):
            if repo_ap == 'own':
                raise Http404
            
        repo = seafserv_threaded_rpc.get_repo(repo_id)
        if not request.GET.get('root_id'): # No root id..?
            # ..use HEAD commit's root id
            commit = seafserv_rpc.get_commit(repo.props.head_cmmt_id)
            root_id = commit.props.root_id
        else:
            root_id = request.GET.get('root_id')
        dirs = seafserv_rpc.list_dir(root_id)
        for dirent in dirs:
            if stat.S_ISDIR(dirent.props.mode):
                dirent.is_dir = True
            else:
                dirent.is_dir = False
                
    return render_to_response('repo_dir.html', {
            "repo_id": repo_id,
            "dirs": dirs,
            },
            context_instance=RequestContext(request))

@login_required
def repo_operation_file(request, op, repo_id, obj_id):
    if repo_id:
        # any person visit private repo, go to 404 page
        repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
        if repo_ap == 'private':
            raise Http404

        token = ''        
        if not repo_ap or repo_ap == 'own':
            # people who is not owner visits own repo, go to 404 page            
            if not validate_owner(request, repo_id):
                raise Http404
            else:
                # owner should get a token to visit repo                
                token = gen_token()
                # put token into memory in seaf-server
                seafserv_rpc.web_save_access_token(token, obj_id)

        http_server_root = get_httpserver_root()
        file_name = request.GET.get('file_name', '')
        return HttpResponseRedirect('%s/%s?id=%s&filename=%s&op=%s&t=%s' %
                                    (http_server_root,
                                     repo_id, obj_id,
                                     file_name, op, token))
    
@login_required
def repo_add_share(request):
    output_msg = {}
    
    if request.method == 'POST':
        from_email = request.user.username
        repo_id = request.POST.get('share_repo_id', '')
        to_emails = request.POST.get('to_email', '')
        to_email_list = to_emails.split(';')
        info_emails = []
        err_emails = []
        for to_email in to_email_list:
            if not to_email:
                continue
            
            if validate_emailuser(to_email.strip()) and validate_owner(request, repo_id):
                seafserv_threaded_rpc.add_share(repo_id, from_email, to_email.strip(), 'rw')
                info_emails.append(to_email)
            else:
                err_emails.append(to_email)

        if info_emails:
            output_msg['info_msg'] = u'共享给%s成功,' % list_to_string(info_emails)
        if err_emails:
            output_msg['err_msg'] = u'共享给%s失败: 用户不存在' % list_to_string(err_emails)

    return output_msg

@login_required
def repo_list_share(request):
    username = request.user.username

    out_repos = seafserv_threaded_rpc.list_share_repos(username, 'from_email', -1, -1)
#    in_repos = seafserv_threaded_rpc.list_share_repos(username, 'to_email', -1, -1)

    return render_to_response('share_repos.html', {
            "out_repos": out_repos,
#            "in_repos": in_repos,
            }, context_instance=RequestContext(request))

@login_required
def repo_download(request):
    repo_id = request.GET.get('repo_id', '')

    repo = seafserv_threaded_rpc.get_repo(repo_id)    
    repo_name = repo.props.name
    quote_repo_name = quote(repo_name)
    encrypted = repo.props.encrypted
    if encrypted:
        enc = '1'
    else:
        enc = ''
    relay_id = cclient.props.id

    ccnet_applet_root = get_ccnetapplet_root()
    redirect_url = "%s/repo/download/?repo_id=%s&relay_id=%s&repo_name=%s&encrypted=%s" % (
        ccnet_applet_root, repo_id, relay_id, quote_repo_name, enc)

    return HttpResponseRedirect(redirect_url)
    
@login_required
def repo_remove_share(request):
    repo_id = request.GET.get('repo_id', '')
    if not validate_owner(request, repo_id):
        raise Http404
    
    to_email = request.GET.get('to_email', '')
    from_email = request.user.username
    seafserv_threaded_rpc.remove_share(repo_id, from_email, to_email)

    return HttpResponseRedirect(request.META['HTTP_REFERER'])
    
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
            repo.owner = seafserv_threaded_rpc.get_repo_owner(repo.props.id)
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
        if user.props.id == request.user.id:
            user.is_self = True
            
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
    owned_repos = []
    quota_usage = 0

    owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
    quota_usage = seafserv_threaded_rpc.get_user_quota_usage(email)

    try:
        peers = ccnet_rpc.get_peers_by_email(email)
        for peer in peers:
            if not peer:
                continue
            peername = peer.props.name
            roles = peer.props.role_list
            user_dict[peername] = roles
    except:
        pass

    # Repos that are share to user
    in_repos = seafserv_threaded_rpc.list_share_repos(email, 'to_email', -1, -1)

    return render_to_response(
        'userinfo.html', {
            'owned_repos': owned_repos,
            'quota_usage': quota_usage,
            "in_repos": in_repos,
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
    """The user id is emailuser id."""
    
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

def back_local(request):
    ccnet_applt_root = get_ccnetapplet_root()

    redirect_url = '%s/home/' % ccnet_applt_root

    return HttpResponseRedirect(redirect_url)
