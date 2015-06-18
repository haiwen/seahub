# encoding: utf-8
import os
import logging
import json
from dateutil.relativedelta import relativedelta

from django.core.urlresolvers import reverse
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, Http404, \
    HttpResponseBadRequest
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.utils import timezone
from django.utils.html import escape
# from django.contrib.sites.models import RequestSite
import seaserv
from seaserv import seafile_api
from seaserv import ccnet_threaded_rpc, is_org_group, \
    get_org_id_by_group, del_org_group_repo, unset_inner_pub_repo
from pysearpc import SearpcError

from seahub.share.forms import RepoShareForm, FileLinkShareForm, \
    UploadLinkShareForm
from seahub.share.models import FileShare, PrivateFileDirShare, \
    UploadLinkShare, OrgFileShare
from seahub.share.signals import share_repo_to_user_successful
# from settings import ANONYMOUS_SHARE_COOKIE_TIMEOUT
# from tokens import anon_share_token_generator
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.base.accounts import User
from seahub.base.decorators import user_mods_check
from seahub.contacts.models import Contact
from seahub.contacts.signals import mail_sended
from seahub.signals import share_file_to_user_successful
from seahub.views import is_registered_user, check_repo_access_permission, \
        check_folder_permission
from seahub.utils import render_permission_error, string2list, render_error, \
    gen_token, gen_shared_link, gen_shared_upload_link, gen_dir_share_link, \
    gen_file_share_link, IS_EMAIL_CONFIGURED, check_filename_with_rename, \
    is_valid_username, send_html_email, is_org_context, normalize_file_path, \
    normalize_dir_path, send_perm_audit_msg, get_origin_repo_info
from seahub.settings import SITE_ROOT, REPLACE_FROM_EMAIL, ADD_REPLY_TO_HEADER

# Get an instance of a logger
logger = logging.getLogger(__name__)

########## rpc wrapper    
def is_org_repo_owner(username, repo_id):
    owner = seaserv.seafserv_threaded_rpc.get_org_repo_owner(repo_id)
    return True if owner == username else False

def get_org_group_repos_by_owner(org_id, username):
    return seaserv.seafserv_threaded_rpc.get_org_group_repos_by_owner(org_id,
                                                                      username)

def list_org_inner_pub_repos_by_owner(org_id, username):
    return seaserv.seafserv_threaded_rpc.list_org_inner_pub_repos_by_owner(
        org_id, username)

def org_share_repo(org_id, repo_id, from_user, to_user, permission):
    return seaserv.seafserv_threaded_rpc.org_add_share(org_id, repo_id,
                                                       from_user, to_user,
                                                       permission)

def org_remove_share(org_id, repo_id, from_user, to_user):
    return seaserv.seafserv_threaded_rpc.org_remove_share(org_id, repo_id,
                                                          from_user, to_user)

########## functions

def share_to_public(request, repo, permission):
    """Share repo to public with given permission.
    """
    try:
        if is_org_context(request):
            org_id = request.user.org.org_id
            seaserv.seafserv_threaded_rpc.set_org_inner_pub_repo(
                org_id, repo.id, permission)
        elif request.cloud_mode:
            return              # no share to public in cloud mode
        else:
            seafile_api.add_inner_pub_repo(repo.id, permission)
    except Exception, e:
        logger.error(e)
        messages.error(request, _(u'Failed to share to all members, please try again later.'))
    else:
        msg = _(u'Shared to all members successfully, go check it at <a href="%s">Shares</a>.') % \
            (reverse('share_admin'))
        messages.success(request, msg, extra_tags='safe')

def share_to_group(request, repo, group, permission):
    """Share repo to group with given permission.
    """
    repo_id = repo.id
    group_id = group.id
    from_user = request.user.username

    if is_org_context(request):
        org_id = request.user.org.org_id
        group_repo_ids = seafile_api.get_org_group_repoids(org_id, group.id)
    else:
        group_repo_ids = seafile_api.get_group_repoids(group.id)

    if repo.id in group_repo_ids:
        return False

    try:
        if is_org_context(request):
            org_id = request.user.org.org_id
            seafile_api.add_org_group_repo(repo_id, org_id, group_id,
                                           from_user, permission)
        else:
            seafile_api.set_group_repo(repo_id, group_id, from_user,
                                       permission)
        return True
    except Exception, e:
        logger.error(e)
        return False

def share_to_user(request, repo, to_user, permission):
    """Share repo to a user with given permission.
    """
    repo_id = repo.id
    from_user = request.user.username

    if from_user == to_user:
        return False

    # permission check
    if is_org_context(request):
        org_id = request.user.org.org_id
        if not seaserv.ccnet_threaded_rpc.org_user_exists(org_id, to_user):
            return False
    else:
        if not is_registered_user(to_user):
            return False

    try:
        if is_org_context(request):
            org_id = request.user.org.org_id
            org_share_repo(org_id, repo_id, from_user, to_user, permission)
        else:
            seafile_api.share_repo(repo_id, from_user, to_user, permission)
    except SearpcError as e:
            return False
            logger.error(e)
    else:
        # send a signal when sharing repo successful
        share_repo_to_user_successful.send(sender=None,
                                           from_user=from_user,
                                           to_user=to_user, repo=repo)
        return True

def check_user_share_quota(username, repo, users=[], groups=[]):
    """Check whether user has enough share quota when share repo to
    users/groups. Only used for cloud service.
    """
    if not users and not groups:
        return True

    if not seaserv.CALC_SHARE_USAGE:
        return True

    check_pass = False
    share_quota = seafile_api.get_user_share_quota(username)
    if share_quota == -2:
        return True             # share quota is unlimited

    current_share_usage = seafile_api.get_user_share_usage(username)

    share_usage = 0
    if users:
        share_usage += seafile_api.get_repo_size(repo.id) * (len(users))

    if groups:
        grp_members = []
        for group in groups:
            grp_members += [e.user_name for e in seaserv.get_group_members(group.id)]
        grp_members = set(grp_members)
        share_usage += seafile_api.get_repo_size(repo.id) * (len(grp_members) - 1)
    if share_usage + current_share_usage < share_quota:
        check_pass = True

    return check_pass

########## views
@login_required
@require_POST
def share_repo(request):
    """
    Handle POST method to share a repo to public/groups/users based on form
    data. Return to ``myhome`` page and notify user whether success or failure.
    """
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT

    form = RepoShareForm(request.POST)
    if not form.is_valid():
        # TODO: may display error msg on form
        raise Http404

    email_or_group = form.cleaned_data['email_or_group']
    repo_id = form.cleaned_data['repo_id']
    permission = form.cleaned_data['permission']

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    # Test whether user is the repo owner.
    username = request.user.username
    if not seafile_api.is_repo_owner(username, repo_id) and \
            not is_org_repo_owner(username, repo_id):
        msg = _(u'Only the owner of the library has permission to share it.')
        messages.error(request, msg)
        return HttpResponseRedirect(next)

    # Parsing input values.
    share_to_all, share_to_groups, share_to_users = False, [], []
    user_groups = request.user.joined_groups
    share_to_list = string2list(email_or_group)
    for share_to in share_to_list:
        if share_to == 'all':
            share_to_all = True
        elif share_to.find('@') == -1:
            for user_group in user_groups:
                if user_group.group_name == share_to:
                    share_to_groups.append(user_group)
        else:
            share_to = share_to.lower()
            if is_valid_username(share_to):
                share_to_users.append(share_to)

    origin_repo_id, origin_path = get_origin_repo_info(repo.id)
    if origin_repo_id is not None:
        perm_repo_id = origin_repo_id
        perm_path = origin_path
    else:
        perm_repo_id = repo.id
        perm_path =  '/'

    if share_to_all:
        share_to_public(request, repo, permission)
        send_perm_audit_msg('add-repo-perm', username, 'all', \
                            perm_repo_id, perm_path, permission)

    if not check_user_share_quota(username, repo, users=share_to_users,
                                  groups=share_to_groups):
        messages.error(request, _(
            'Failed to share "%s", no enough quota. '
            '<a href="http://seafile.com/">Upgrade account.</a>'
        ) % escape(repo.name), extra_tags='safe')
        return HttpResponseRedirect(next)

    for group in share_to_groups:
        if share_to_group(request, repo, group, permission):
            send_perm_audit_msg('add-repo-perm', username, group.id, \
                                perm_repo_id, perm_path, permission)

    for email in share_to_users:
        # Add email to contacts.
        mail_sended.send(sender=None, user=request.user.username, email=email)
        if share_to_user(request, repo, email, permission):
            send_perm_audit_msg('add-repo-perm', username, email, \
                                perm_repo_id, perm_path, permission)

    return HttpResponseRedirect(next)

@login_required_ajax
def ajax_repo_remove_share(request):
    """
    Remove repo share if this repo is shared to user/group/public
    """

    repo_id = request.GET.get('repo_id', None)
    share_type = request.GET.get('share_type', None)
    content_type = 'application/json; charset=utf-8'

    if not seafile_api.get_repo(repo_id):
        return HttpResponse(json.dumps({'error': _(u'Library does not exist')}), status=400,
                            content_type=content_type)

    username = request.user.username

    if share_type == 'personal':

        from_email = request.GET.get('from', None)
        if not is_valid_username(from_email):
            return HttpResponse(json.dumps({'error': _(u'Invalid argument')}), status=400,
                                content_type=content_type)

        if is_org_context(request):
            org_id = request.user.org.org_id
            org_remove_share(org_id, repo_id, from_email, username)
        else:
            seaserv.remove_share(repo_id, from_email, username)
        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=content_type)

    elif share_type == 'group':

        from_email = request.GET.get('from', None)
        if not is_valid_username(from_email):
            return HttpResponse(json.dumps({'error': _(u'Invalid argument')}), status=400,
                                content_type=content_type)

        group_id = request.GET.get('group_id', None)
        group = seaserv.get_group(group_id)
        if not group:
            return HttpResponse(json.dumps({'error': _(u"Group does not exist")}), status=400,
                                content_type=content_type)

        if seaserv.check_group_staff(group_id, username) or \
            seafile_api.is_repo_owner(username, repo_id):
            if is_org_group(group_id):
                org_id = get_org_id_by_group(group_id)
                del_org_group_repo(repo_id, org_id, group_id)
            else:
                seafile_api.unset_group_repo(repo_id, group_id, from_email)
            return HttpResponse(json.dumps({'success': True}), status=200,
                                content_type=content_type)
        else:
            return HttpResponse(json.dumps({'error': _(u'Permission denied')}), status=400,
                                content_type=content_type)

    elif share_type == 'public':

        if is_org_context(request):

            org_repo_owner = seafile_api.get_org_repo_owner(repo_id)
            is_org_repo_owner = True if org_repo_owner == username else False
            if request.user.org.is_staff or is_org_repo_owner:
                org_id = request.user.org.org_id
                seaserv.seafserv_threaded_rpc.unset_org_inner_pub_repo(org_id,
                                                                       repo_id)
                return HttpResponse(json.dumps({'success': True}), status=200,
                                    content_type=content_type)
            else:
                return HttpResponse(json.dumps({'error': _(u'Permission denied')}), status=400,
                                    content_type=content_type)

        else:
            if seafile_api.is_repo_owner(username, repo_id) or \
                request.user.is_staff:
                unset_inner_pub_repo(repo_id)
                return HttpResponse(json.dumps({'success': True}), status=200,
                                    content_type=content_type)
            else:
                return HttpResponse(json.dumps({'error': _(u'Permission denied')}), status=400,
                                    content_type=content_type)
    else:
        return HttpResponse(json.dumps({'error': _(u'Invalid argument')}), status=400,
                            content_type=content_type)

@login_required
def repo_remove_share(request):
    """
    If repo is shared from one person to another person, only these two peson
    can remove share.
    If repo is shared from one person to a group, then only the one share the
    repo and group staff can remove share.
    """
    repo_id = request.GET.get('repo_id', '')
    group_id = request.GET.get('gid', '')
    from_email = request.GET.get('from', '')
    perm = request.GET.get('permission', None)
    if not is_valid_username(from_email) or perm is None:
        return render_error(request, _(u'Argument is not valid'))
    username = request.user.username

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        return render_error(request, _(u'Library does not exist'))

    origin_repo_id, origin_path = get_origin_repo_info(repo.id)
    if origin_repo_id is not None:
        perm_repo_id = origin_repo_id
        perm_path = origin_path
    else:
        perm_repo_id = repo.id
        perm_path =  '/'

    # if request params don't have 'gid', then remove repos that share to
    # to other person; else, remove repos that share to groups
    if not group_id:
        to_email = request.GET.get('to', '')
        if not is_valid_username(to_email):
            return render_error(request, _(u'Argument is not valid'))

        if username != from_email and username != to_email:
            return render_permission_error(request, _(u'Failed to remove share'))

        if is_org_context(request):
            org_id = request.user.org.org_id
            org_remove_share(org_id, repo_id, from_email, to_email)
        else:
            seaserv.remove_share(repo_id, from_email, to_email)
            send_perm_audit_msg('delete-repo-perm', from_email, to_email, \
                                perm_repo_id, perm_path, perm)
    else:
        try:
            group_id = int(group_id)
        except:
            return render_error(request, _(u'group id is not valid'))

        group = seaserv.get_group(group_id)
        if not group:
            return render_error(request, _(u"Failed to unshare: the group doesn't exist."))

        if not seaserv.check_group_staff(group_id, username) \
                and username != from_email:
            return render_permission_error(request, _(u'Failed to remove share'))

        if is_org_group(group_id):
            org_id = get_org_id_by_group(group_id)
            del_org_group_repo(repo_id, org_id, group_id)
        else:
            seafile_api.unset_group_repo(repo_id, group_id, from_email)
            send_perm_audit_msg('delete-repo-perm', from_email, group_id, \
                                perm_repo_id, perm_path, perm)

    messages.success(request, _('Successfully removed share'))

    next = request.META.get('HTTP_REFERER', SITE_ROOT)
    return HttpResponseRedirect(next)

def get_share_out_repo_list(request):
    """List repos that @user share to other users.

    Returns:
        A list of repos.
    """
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        return seafile_api.get_org_share_out_repo_list(org_id, username,
                                                       -1, -1)
    else:
        return seafile_api.get_share_out_repo_list(username, -1, -1)

def get_group_repos_by_owner(request):
    """List repos that @user share to groups.

    Returns:
        A list of repos.
    """
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        return get_org_group_repos_by_owner(org_id, username)
    else:
        return seaserv.get_group_repos_by_owner(username)

def list_inner_pub_repos_by_owner(request):
    """List repos that @user share to organizatoin.

    Returns:
        A list of repos, or empty list if in cloud_mode.
    """
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        return list_org_inner_pub_repos_by_owner(org_id, username)
    elif request.cloud_mode:
        return []
    else:
        return seaserv.list_inner_pub_repos_by_owner(username)

def list_share_out_repos(request):
    shared_repos = []

    # repos shared from this user
    shared_repos += get_share_out_repo_list(request)

    # repos shared to groups
    group_repos = get_group_repos_by_owner(request)
    for repo in group_repos:
        group = ccnet_threaded_rpc.get_group(int(repo.group_id))
        if not group:
            repo.props.user = ''
            continue
        repo.props.user = group.props.group_name
        repo.props.user_info = repo.group_id
    shared_repos += group_repos

    # inner pub repos
    pub_repos = list_inner_pub_repos_by_owner(request)
    for repo in pub_repos:
        repo.props.user = _(u'all members')
        repo.props.user_info = 'all'
    shared_repos += pub_repos

    return shared_repos

@login_required
@user_mods_check
def list_shared_repos(request):
    """ List user repos shared to users/groups/public.
    """
    share_out_repos = list_share_out_repos(request)
    
    out_repos = []
    for repo in share_out_repos:
        if repo.is_virtual:     # skip virtual repos
            continue

        if repo.props.permission == 'rw':
            repo.share_permission = _(u'Read-Write')
        elif repo.props.permission == 'r':
            repo.share_permission = _(u'Read-Only')
        else:
            repo.share_permission = ''

        if repo.props.share_type == 'personal':
            repo.props.user_info = repo.props.user
        out_repos.append(repo)

    out_repos.sort(lambda x, y: cmp(x.repo_name, y.repo_name))

    return render_to_response('share/repos.html', {
            "out_repos": out_repos,
            }, context_instance=RequestContext(request))

@login_required
@user_mods_check
def list_shared_links(request):
    """List shared links, and remove invalid links(file/dir is deleted or moved).
    """
    username = request.user.username

    # download links
    fileshares = FileShare.objects.filter(username=username)
    p_fileshares = []           # personal file share
    for fs in fileshares:
        r = seafile_api.get_repo(fs.repo_id)
        if not r:
            fs.delete()
            continue

        if fs.s_type == 'f':
            if seafile_api.get_file_id_by_path(r.id, fs.path) is None:
                fs.delete()
                continue
            fs.filename = os.path.basename(fs.path)
            fs.shared_link = gen_file_share_link(fs.token)
        else:
            if seafile_api.get_dir_id_by_path(r.id, fs.path) is None:
                fs.delete()
                continue
            if fs.path != '/':
                fs.filename = os.path.basename(fs.path.rstrip('/'))
            else:
                fs.filename = fs.path
            fs.shared_link = gen_dir_share_link(fs.token)
        fs.repo = r
        p_fileshares.append(fs)

    # upload links
    uploadlinks = UploadLinkShare.objects.filter(username=username)
    p_uploadlinks = []
    for link in uploadlinks:
        r = seafile_api.get_repo(link.repo_id)
        if not r:
            link.delete()
            continue
        if seafile_api.get_dir_id_by_path(r.id, link.path) is None:
            link.delete()
            continue
        if link.path != '/':
            link.dir_name = os.path.basename(link.path.rstrip('/'))
        else:
            link.dir_name = link.path
        link.shared_link = gen_shared_upload_link(link.token)
        link.repo = r
        p_uploadlinks.append(link)

    return render_to_response('share/links.html', {
            "fileshares": p_fileshares,
            "uploadlinks": p_uploadlinks,
            }, context_instance=RequestContext(request))

@login_required
@user_mods_check
def list_priv_shared_files(request):
    """List private shared files.
    """
    username = request.user.username

    # Private share out/in files.
    priv_share_out = PrivateFileDirShare.objects.list_private_share_out_by_user(username)
    for e in priv_share_out:
        e.file_or_dir = os.path.basename(e.path.rstrip('/'))
        e.repo = seafile_api.get_repo(e.repo_id)

    priv_share_in = PrivateFileDirShare.objects.list_private_share_in_by_user(username)
    for e in priv_share_in:
        e.file_or_dir = os.path.basename(e.path.rstrip('/'))
        e.repo = seafile_api.get_repo(e.repo_id)

    return render_to_response('share/priv_shared_files.html', {
            "priv_share_out": priv_share_out,
            "priv_share_in": priv_share_in,
            }, context_instance=RequestContext(request))

@login_required
@user_mods_check
def list_priv_shared_folders(request):
    """List private shared folders.

    Arguments:
    - `request`:
    """
    share_out_repos = list_share_out_repos(request)

    shared_folders = []
    for repo in share_out_repos:
        if not repo.is_virtual:     # skip non-virtual repos
            continue

        if repo.props.permission == 'rw':
            repo.share_permission = _(u'Read-Write')
        elif repo.props.permission == 'r':
            repo.share_permission = _(u'Read-Only')
        else:
            repo.share_permission = ''

        if repo.props.share_type == 'personal':
            repo.props.user_info = repo.props.user
        shared_folders.append(repo)

    shared_folders.sort(lambda x, y: cmp(x.repo_id, y.repo_id))

    return render_to_response('share/list_priv_shared_folders.html', {
            'shared_folders': shared_folders,
            }, context_instance=RequestContext(request))

@login_required
def view_priv_shared_folder(request, repo_id):
    """

    Arguments:
    - `request`:
    - `repo_id`:
    """
    repo = seafile_api.get_repo(repo_id)
    if repo is None:
        raise Http404

    if not repo.is_virtual:
        raise Http404

    url = reverse('view_common_lib_dir',
            args=[repo.origin_repo_id, repo.origin_path.strip('/')])
    return HttpResponseRedirect(url)

@login_required_ajax
def share_permission_admin(request):
    """Change repo share permission in ShareAdmin.
    """
    share_type = request.GET.get('share_type', '')
    content_type = 'application/json; charset=utf-8'

    form = RepoShareForm(request.POST)
    form.is_valid()

    email_or_group = form.cleaned_data['email_or_group']
    repo_id = form.cleaned_data['repo_id']
    permission = form.cleaned_data['permission']
    from_email = request.user.username

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        return render_error(request, _(u'Library does not exist'))

    origin_repo_id, origin_path = get_origin_repo_info(repo.id)
    if origin_repo_id is not None:
        perm_repo_id = origin_repo_id
        perm_path = origin_path
    else:
        perm_repo_id = repo.id
        perm_path =  '/'


    if share_type == 'personal':
        if not is_valid_username(email_or_group):
            return HttpResponse(json.dumps({'success': False}), status=400,
                                content_type=content_type)

        try:
            if is_org_context(request):
                org_id = request.user.org.org_id
                seaserv.seafserv_threaded_rpc.org_set_share_permission(
                    org_id, repo_id, from_email, email_or_group, permission)
            else:
                seafile_api.set_share_permission(repo_id, from_email,
                                                 email_or_group, permission)
                send_perm_audit_msg('modify-repo-perm', from_email, \
                        email_or_group, perm_repo_id, perm_path, permission)

        except SearpcError:
            return HttpResponse(json.dumps({'success': False}), status=500,
                                content_type=content_type)
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)

    elif share_type == 'group':
        try:
            if is_org_context(request):
                org_id = request.user.org.org_id
                seaserv.seafserv_threaded_rpc.set_org_group_repo_permission(
                    org_id, int(email_or_group), repo_id, permission)
            else:
                group_id = int(email_or_group)
                seafile_api.set_group_repo_permission(group_id,
                                                      repo_id,
                                                      permission)
                send_perm_audit_msg('modify-repo-perm', from_email, \
                                    group_id, perm_repo_id, perm_path, permission)
        except SearpcError:
            return HttpResponse(json.dumps({'success': False}), status=500,
                                content_type=content_type)
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)

    elif share_type == 'public':
        try:
            if is_org_context(request):
                org_id = request.user.org.org_id
                seaserv.seafserv_threaded_rpc.set_org_inner_pub_repo(
                    org_id, repo_id, permission)
            else:
                seafile_api.add_inner_pub_repo(repo_id, permission)
                send_perm_audit_msg('modify-repo-perm', from_email, 'all', \
                                    perm_repo_id, perm_path, permission)
        except SearpcError:
            return HttpResponse(json.dumps({'success': False}), status=500,
                                content_type=content_type)
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)

    else:
        return HttpResponse(json.dumps({'success': False}), status=400,
                            content_type=content_type)
        
# 2 views for anonymous share:
# - anonymous_share records share infomation to db and sends the mail
# - anonymous_share_confirm checks the link use clicked and
#   adds token to client COOKIE, then redirect client to repo page

# def anonymous_share(request, email_template_name='repo/anonymous_share_email.html', **kwargs):
#     repo_id = kwargs['repo_id']
#     repo_owner = kwargs['repo_owner']
#     anon_email = kwargs['anon_email']
#     is_encrypted = kwargs['is_encrypted']

#     # Encrypt repo can not be shared to unregistered user.
#     if is_encrypted:
#         msg = _(u'Failed to share to %s, as encrypted libraries cannot be shared to emails outside the site.') % anon_email
#         messages.error(request, msg)
#         return

#     token = anon_share_token_generator.make_token()

#     anon_share = AnonymousShare()
#     anon_share.repo_owner = repo_owner
#     anon_share.repo_id = repo_id
#     anon_share.anonymous_email = anon_email
#     anon_share.token = token

#     try:
#         anon_share.save()
#     except:
#         msg = _(u'Failed to share to %s.') % anon_email
#         messages.add_message(request, messages.ERROR, msg)
#     else:
#         # send mail
#         use_https = request.is_secure()
#         site_name = domain = RequestSite(request).domain

#         t = loader.get_template(email_template_name)
#         c = {
#             'email': repo_owner,
#             'anon_email': anon_email,
#             'domain': domain,
#             'site_name': site_name,
#             'token': token,
#             'protocol': use_https and 'https' or 'http',
#             }

#         try:
#             send_mail(_(u'You are shared with a library in Seafile'), t.render(Context(c)), None,
#                       [anon_email], fail_silently=False)
#         except:
#             AnonymousShare.objects.filter(token=token).delete()
#             msg = _(u'Failed to share to %s.') % anon_email
#             messages.add_message(request, messages.ERROR, msg)
#         else:
#             msg = _(u'Shared to %(email)s successfully, go check it at <a href="%(share)s">Share</a>.') % \
#                     {'email':anon_email, 'share':reverse('share_admin')}
#             messages.add_message(request, messages.INFO, msg)

# def anonymous_share_confirm(request, token=None):
#     assert token is not None # checked by URLconf

#     # Check whether token in db
#     try:
#         anon_share = AnonymousShare.objects.get(token=token)
#     except AnonymousShare.DoesNotExist:
#         raise Http404
#     else:
#         res = HttpResponseRedirect(reverse('repo', args=[anon_share.repo_id]))
#         res.set_cookie("anontoken", token,
#                        max_age=ANONYMOUS_SHARE_COOKIE_TIMEOUT)
#         return res

# def remove_anonymous_share(request, token):
#     AnonymousShare.objects.filter(token=token).delete()

#     next = request.META.get('HTTP_REFERER', None)
#     if not next:
#         next = reverse('share_admin')

#     messages.add_message(request, messages.INFO, _(u'Deleted successfully.'))

#     return HttpResponseRedirect(next)

########## share link
@login_required_ajax
def get_shared_link(request):
    """
    Handle ajax request to generate file or dir shared link.
    """
    content_type = 'application/json; charset=utf-8'

    repo_id = request.GET.get('repo_id', '')
    share_type = request.GET.get('type', 'f')  # `f` or `d`
    path = request.GET.get('p', '')
    use_passwd = True if int(request.POST.get('use_passwd', '0')) == 1 else False
    passwd = request.POST.get('passwd') if use_passwd else None

    try:
        expire_days = int(request.POST.get('expire_days', 0))
    except ValueError:
        expire_days = 0
    if expire_days <= 0:
        expire_date = None
    else:
        expire_date = timezone.now() + relativedelta(days=expire_days)

    if not (repo_id and path):
        err = _('Invalid arguments')
        data = json.dumps({'error': err})
        return HttpResponse(data, status=400, content_type=content_type)

    if share_type != 'f' and path == '/':
        err = _('You cannot share the library in this way.')
        data = json.dumps({'error': err})
        return HttpResponse(data, status=400, content_type=content_type)

    username = request.user.username
    if share_type == 'f':
        fs = FileShare.objects.get_file_link_by_path(username, repo_id, path)
        if fs is None:
            fs = FileShare.objects.create_file_link(username, repo_id, path,
                                                    passwd, expire_date)
            if is_org_context(request):
                org_id = request.user.org.org_id
                OrgFileShare.objects.set_org_file_share(org_id, fs)
    else:
        fs = FileShare.objects.get_dir_link_by_path(username, repo_id, path)
        if fs is None:
            fs = FileShare.objects.create_dir_link(username, repo_id, path,
                                                   passwd, expire_date)
            if is_org_context(request):
                org_id = request.user.org.org_id
                OrgFileShare.objects.set_org_file_share(org_id, fs)

    token = fs.token
    shared_link = gen_shared_link(token, fs.s_type)
    data = json.dumps({'token': token, 'shared_link': shared_link})
    return HttpResponse(data, status=200, content_type=content_type)

@login_required
def remove_shared_link(request):
    """
    Handle request to remove file shared link.
    """
    token = request.GET.get('t')

    FileShare.objects.filter(token=token).delete()
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = reverse('share_admin')

    messages.success(request, _(u'Removed successfully'))

    return HttpResponseRedirect(next)


@login_required_ajax
def ajax_remove_shared_link(request):

    content_type = 'application/json; charset=utf-8'
    result = {}

    token = request.GET.get('t')

    if not token:
        result = {'error': _(u"Argument missing")}
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    try:
        link = FileShare.objects.get(token=token)
        link.delete()
        result = {'success': True}
        return HttpResponse(json.dumps(result), content_type=content_type)
    except:
        result = {'error': _(u"The link doesn't exist")}
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)


@login_required
def remove_shared_upload_link(request):
    """
    Handle request to remove shared upload link.
    """
    token = request.GET.get('t')

    UploadLinkShare.objects.filter(token=token).delete()
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = reverse('share_admin')

    messages.success(request, _(u'Removed successfully'))

    return HttpResponseRedirect(next)


@login_required_ajax
def ajax_remove_shared_upload_link(request):

    content_type = 'application/json; charset=utf-8'
    result = {}

    token = request.GET.get('t')
    if not token:
        result = {'error': _(u"Argument missing")}
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    try:
        upload_link = UploadLinkShare.objects.get(token=token)
        upload_link.delete()
        result = {'success': True}
        return HttpResponse(json.dumps(result), content_type=content_type)
    except:
        result = {'error': _(u"The link doesn't exist")}
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)


@login_required_ajax
def send_shared_link(request):
    """
    Handle ajax post request to send file shared link.
    """
    if not request.method == 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    if not IS_EMAIL_CONFIGURED:
        data = json.dumps({'error':_(u'Sending shared link failed. Email service is not properly configured, please contact administrator.')})
        return HttpResponse(data, status=500, content_type=content_type)

    from seahub.settings import SITE_NAME

    form = FileLinkShareForm(request.POST)
    if form.is_valid():
        email = form.cleaned_data['email']
        file_shared_link = form.cleaned_data['file_shared_link']
        file_shared_name = form.cleaned_data['file_shared_name']
        file_shared_type = form.cleaned_data['file_shared_type']
        extra_msg = escape(form.cleaned_data['extra_msg'])

        to_email_list = string2list(email)
        send_success, send_failed = [], []
        for to_email in to_email_list:
            if not is_valid_username(to_email):
                send_failed.append(to_email)
                continue

            # Add email to contacts.
            mail_sended.send(sender=None, user=request.user.username,
                             email=to_email)

            c = {
                'email': request.user.username,
                'to_email': to_email,
                'file_shared_link': file_shared_link,
                'file_shared_name': file_shared_name,
            }

            if extra_msg:
                c['extra_msg'] = extra_msg

            if REPLACE_FROM_EMAIL:
                from_email = request.user.username
            else:
                from_email = None  # use default from email

            if ADD_REPLY_TO_HEADER:
                reply_to = request.user.username
            else:
                reply_to = None

            try:
                if file_shared_type == 'f':
                    c['file_shared_type'] = _(u"file")
                    send_html_email(_(u'A file is shared to you on %s') % SITE_NAME,
                                    'shared_link_email.html',
                                    c, from_email, [to_email],
                                    reply_to=reply_to
                                    )
                else:
                    c['file_shared_type'] = _(u"directory")
                    send_html_email(_(u'A directory is shared to you on %s') % SITE_NAME,
                                    'shared_link_email.html',
                                    c, from_email, [to_email],
                                    reply_to=reply_to)

                send_success.append(to_email)
            except Exception, e:
                send_failed.append(to_email)

        if len(send_success) > 0:
            data = json.dumps({"send_success": send_success, "send_failed": send_failed})
            return HttpResponse(data, status=200, content_type=content_type)
        else:
            data = json.dumps({"error": _("Internal server error, or please check the email(s) you entered")})
            return HttpResponse(data, status=400, content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)

@login_required
def save_shared_link(request):
    """Save public share link to one's library.
    """
    username = request.user.username
    token = request.GET.get('t', '')
    dst_repo_id = request.POST.get('dst_repo', '')
    dst_path = request.POST.get('dst_path', '')

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT

    if not dst_repo_id or not dst_path:
        messages.error(request, _(u'Please choose a directory.'))
        return HttpResponseRedirect(next)

    try:
        fs = FileShare.objects.get(token=token)
    except FileShare.DoesNotExist:
        raise Http404

    src_repo_id = fs.repo_id
    src_path = os.path.dirname(fs.path)
    obj_name = os.path.basename(fs.path)

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    seafile_api.copy_file(src_repo_id, src_path, obj_name,
                          dst_repo_id, dst_path, new_obj_name, username,
                          need_progress=0)

    messages.success(request, _(u'Successfully saved.'))

    return HttpResponseRedirect(next)

########## private share
@require_POST
def gen_private_file_share(request, repo_id):
    emails = request.POST.getlist('emails', '')
    s_type = request.POST.get('s_type', '')
    path = request.POST.get('path', '')
    perm = request.POST.get('perm', 'r')
    file_or_dir = os.path.basename(path.rstrip('/'))
    username = request.user.username

    for email in [e.strip() for e in emails if e.strip()]:
        if not is_valid_username(email):
            continue

        if not is_registered_user(email):
            messages.error(request, _('Failed to share to "%s", user not found.') % email)
            continue

        if s_type == 'f':
            pfds = PrivateFileDirShare.objects.add_read_only_priv_file_share(
                username, email, repo_id, path)
        elif s_type == 'd':
            pfds = PrivateFileDirShare.objects.add_private_dir_share(
                username, email, repo_id, path, perm)
        else:
            continue

        # send a signal when sharing file successful
        share_file_to_user_successful.send(sender=None, priv_share_obj=pfds)
        messages.success(request, _('Successfully shared %s.') % file_or_dir)

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT
    return HttpResponseRedirect(next)

@login_required
def rm_private_file_share(request, token):
    """Remove private file shares.
    """
    try:
        pfs = PrivateFileDirShare.objects.get_priv_file_dir_share_by_token(token)
    except PrivateFileDirShare.DoesNotExist:
        raise Http404

    from_user = pfs.from_user
    to_user = pfs.to_user
    path = pfs.path
    file_or_dir = os.path.basename(path.rstrip('/'))
    username = request.user.username

    if username == from_user or username == to_user:
        pfs.delete()
        messages.success(request, _('Successfully unshared "%s".') % file_or_dir)
    else:
        messages.error(request, _("You don't have permission to unshare %s.") % file_or_dir)

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT
    return HttpResponseRedirect(next)

@login_required
def save_private_file_share(request, token):
    """
    Save private share file to someone's library.
    """
    username = request.user.username
    try:
        pfs = PrivateFileDirShare.objects.get_priv_file_dir_share_by_token(token)
    except PrivateFileDirShare.DoesNotExist:
        raise Http404

    from_user = pfs.from_user
    to_user = pfs.to_user
    repo_id = pfs.repo_id
    path = pfs.path
    src_path = os.path.dirname(path)
    obj_name = os.path.basename(path.rstrip('/'))

    if username == from_user or username == to_user:
        dst_repo_id = request.POST.get('dst_repo')
        dst_path    = request.POST.get('dst_path')

        new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)
        seafile_api.copy_file(repo_id, src_path, obj_name,
                              dst_repo_id, dst_path, new_obj_name, username,
                              need_progress=0)
        messages.success(request, _(u'Successfully saved.'))

    else:
        messages.error(request, _("You don't have permission to save %s.") % obj_name)

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT
    return HttpResponseRedirect(next)

@login_required
def user_share_list(request, id_or_email):
    """List sharing repos with ``to_email``.
    """
    try:
        uid = int(id_or_email)
        try:
            user = User.objects.get(id=uid)
        except User.DoesNotExist:
            user = None
        if not user:
            return render_to_response("user_404.html", {},
                                      context_instance=RequestContext(request))
        to_email = user.email
    except ValueError:
        to_email = id_or_email

    share_list = []
    username = request.user.username
    share_in = seafile_api.get_share_in_repo_list(username, -1, -1)
    for e in share_in:
        if e.share_type == 'personal' and e.user == to_email:
            e.share_in = True
            share_list.append(e)
    share_out = seafile_api.get_share_out_repo_list(username, -1, -1)
    for e in share_out:
        if e.share_type == 'personal' and e.user == to_email:
            e.share_out = True
            share_list.append(e)

    c = Contact.objects.get_contact_by_user(username, to_email)
    add_to_contacts = True if c is None else False

    return render_to_response('share/user_share_list.html', {
            'to_email': to_email,
            'share_list': share_list,
            'add_to_contacts': add_to_contacts,
            }, context_instance=RequestContext(request))

@login_required_ajax
def get_shared_upload_link(request):
    """
    Handle ajax request to generate dir upload link.
    """
    content_type = 'application/json; charset=utf-8'

    repo_id = request.GET.get('repo_id', '')
    path = request.GET.get('p', '')
    use_passwd = True if int(request.POST.get('use_passwd', '0')) == 1 else False
    passwd = request.POST.get('passwd') if use_passwd else None

    if not (repo_id and path):
        err = _('Invalid arguments')
        data = json.dumps({'error': err})
        return HttpResponse(data, status=400, content_type=content_type)

    if path == '/':         # can not share root dir
        err = _('You cannot share the library in this way.')
        data = json.dumps({'error': err})
        return HttpResponse(data, status=400, content_type=content_type)
    else:
        if path[-1] != '/': # append '/' at end of path
            path += '/'

    repo = seaserv.get_repo(repo_id)
    if not repo:
        messages.error(request, _(u'Library does not exist'))
        return HttpResponse(status=400, content_type=content_type)

    user_perm = check_folder_permission(request, repo.id, path)

    if user_perm == 'rw':
        l = UploadLinkShare.objects.filter(repo_id=repo_id).filter(
            username=request.user.username).filter(path=path)
        if len(l) > 0:
            upload_link = l[0]
            token = upload_link.token
        else:
            username = request.user.username
            uls = UploadLinkShare.objects.create_upload_link_share(
                username, repo_id, path, passwd)
            token = uls.token

        shared_upload_link = gen_shared_upload_link(token)

        data = json.dumps({'token': token, 'shared_upload_link': shared_upload_link})
        return HttpResponse(data, status=200, content_type=content_type)
    else:
        return HttpResponse(json.dumps({'error': _(u'Permission denied')}),
                status=403, content_type=content_type)


@login_required_ajax
def send_shared_upload_link(request):
    """
    Handle ajax post request to send shared upload link.
    """
    if not request.method == 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    if not IS_EMAIL_CONFIGURED:
        data = json.dumps({'error':_(u'Sending shared upload link failed. Email service is not properly configured, please contact administrator.')})
        return HttpResponse(data, status=500, content_type=content_type)

    from seahub.settings import SITE_NAME

    form = UploadLinkShareForm(request.POST)
    if form.is_valid():
        email = form.cleaned_data['email']
        shared_upload_link = form.cleaned_data['shared_upload_link']
        extra_msg = escape(form.cleaned_data['extra_msg'])

        to_email_list = string2list(email)
        send_success, send_failed = [], []
        for to_email in to_email_list:
            if not is_valid_username(to_email):
                send_failed.append(to_email)
                continue
            # Add email to contacts.
            mail_sended.send(sender=None, user=request.user.username,
                             email=to_email)

            c = {
                'email': request.user.username,
                'to_email': to_email,
                'shared_upload_link': shared_upload_link,
                }

            if extra_msg:
                c['extra_msg'] = extra_msg

            if REPLACE_FROM_EMAIL:
                from_email = request.user.username
            else:
                from_email = None  # use default from email

            if ADD_REPLY_TO_HEADER:
                reply_to = request.user.username
            else:
                reply_to = None

            try:
                send_html_email(_(u'An upload link is shared to you on %s') % SITE_NAME,
                                'shared_upload_link_email.html',
                                c, from_email, [to_email],
                                reply_to=reply_to)

                send_success.append(to_email)
            except Exception, e:
                send_failed.append(to_email)

        if len(send_success) > 0:
            data = json.dumps({"send_success": send_success, "send_failed": send_failed})
            return HttpResponse(data, status=200, content_type=content_type)
        else:
            data = json.dumps({"error": _("Internal server error, or please check the email(s) you entered")})
            return HttpResponse(data, status=400, content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)
@login_required_ajax
def ajax_get_upload_link(request):
    content_type = 'application/json; charset=utf-8'

    if request.method == 'GET':
        repo_id = request.GET.get('repo_id', '')
        path = request.GET.get('p', '')
        username = request.user.username

        if not path.endswith('/'):
            path = path + '/'

        l = UploadLinkShare.objects.filter(repo_id=repo_id).filter(
            username=username).filter(path=path)
        if len(l) > 0:
            token = l[0].token
            data = {
                    'upload_link': gen_shared_upload_link(token),
                    'token': token,
                   }
        else:
            data = {}

        return HttpResponse(json.dumps(data), content_type=content_type)

    elif request.method == 'POST':
        repo_id = request.POST.get('repo_id', '')
        path = request.POST.get('p', '')
        use_passwd = True if int(request.POST.get('use_passwd', '0')) == 1 else False
        passwd = request.POST.get('passwd') if use_passwd else None

        if not (repo_id and path):
            err = _('Invalid arguments')
            data = json.dumps({'error': err})
            return HttpResponse(data, status=400, content_type=content_type)

        if path[-1] != '/': # append '/' at end of path
            path += '/'

        repo = seaserv.get_repo(repo_id)
        user_perm = check_repo_access_permission(repo.id, request.user)

        if user_perm == 'rw':
            l = UploadLinkShare.objects.filter(repo_id=repo_id).filter(
                username=request.user.username).filter(path=path)
            if len(l) > 0:
                upload_link = l[0]
                token = upload_link.token
            else:
                username = request.user.username
                uls = UploadLinkShare.objects.create_upload_link_share(
                    username, repo_id, path, passwd)
                token = uls.token

            shared_upload_link = gen_shared_upload_link(token)

            data = json.dumps({'token': token, 'upload_link': shared_upload_link})
            return HttpResponse(data, content_type=content_type)
        else:
            return HttpResponse(json.dumps({'error': _(u'Permission denied')}),
                status=403, content_type=content_type)

@login_required_ajax
def ajax_get_download_link(request):
    """
    Handle ajax request to generate file or dir shared link.
    """
    content_type = 'application/json; charset=utf-8'

    if request.method == 'GET':
        repo_id = request.GET.get('repo_id', '')
        share_type = request.GET.get('type', 'f')  # `f` or `d`
        path = request.GET.get('p', '')
        username = request.user.username

        if share_type == 'd' and not path.endswith('/'):
            path = path + '/'

        l = FileShare.objects.filter(repo_id=repo_id).filter(
            username=username).filter(path=path)
        if len(l) > 0:
            token = l[0].token
            data = {
                    'download_link': gen_shared_link(token, l[0].s_type),
                    'token': token,
                   }
        else:
            data = {}

        return HttpResponse(json.dumps(data), content_type=content_type)

    elif request.method == 'POST':
        repo_id = request.POST.get('repo_id', '')
        share_type = request.POST.get('type', 'f')  # `f` or `d`
        path = request.POST.get('p', '')
        use_passwd = True if int(request.POST.get('use_passwd', '0')) == 1 else False
        passwd = request.POST.get('passwd') if use_passwd else None

        try:
            expire_days = int(request.POST.get('expire_days', 0))
        except ValueError:
            expire_days = 0
        if expire_days <= 0:
            expire_date = None
        else:
            expire_date = timezone.now() + relativedelta(days=expire_days)

        if not (repo_id and path):
            err = _('Invalid arguments')
            data = json.dumps({'error': err})
            return HttpResponse(data, status=400, content_type=content_type)

        username = request.user.username
        if share_type == 'f':
            fs = FileShare.objects.get_file_link_by_path(username, repo_id, path)
            if fs is None:
                fs = FileShare.objects.create_file_link(username, repo_id, path,
                                                        passwd, expire_date)
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    OrgFileShare.objects.set_org_file_share(org_id, fs)
        else:
            fs = FileShare.objects.get_dir_link_by_path(username, repo_id, path)
            if fs is None:
                fs = FileShare.objects.create_dir_link(username, repo_id, path,
                                                       passwd, expire_date)
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    OrgFileShare.objects.set_org_file_share(org_id, fs)

        token = fs.token
        shared_link = gen_shared_link(token, fs.s_type)
        data = json.dumps({'token': token, 'download_link': shared_link})
        return HttpResponse(data, content_type=content_type)

@login_required_ajax
@require_POST
def ajax_private_share_dir(request):
    content_type = 'application/json; charset=utf-8'

    repo_id = request.POST.get('repo_id', '')
    path = request.POST.get('path', '')
    username = request.user.username
    result = {}

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        result['error'] = _(u'Library does not exist.')
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    if seafile_api.get_dir_id_by_path(repo_id, path) is None:
        result['error'] = _(u'Directory does not exist.')
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    if path != '/':
        # if share a dir, check sub-repo first
        try:
            if is_org_context(request):
                org_id = request.user.org.org_id
                sub_repo = seaserv.seafserv_threaded_rpc.get_org_virtual_repo(
                    org_id, repo_id, path, username)
            else:
                sub_repo = seafile_api.get_virtual_repo(repo_id, path, username)
        except SearpcError as e:
            result['error'] = e.msg
            return HttpResponse(json.dumps(result), status=500, content_type=content_type)

        if not sub_repo:
            name = os.path.basename(path)
            # create a sub-lib
            try:
                # use name as 'repo_name' & 'repo_desc' for sub_repo
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    sub_repo_id = seaserv.seafserv_threaded_rpc.create_org_virtual_repo(
                        org_id, repo_id, path, name, name, username)
                else:
                    sub_repo_id = seafile_api.create_virtual_repo(repo_id, path,
                        name, name, username)
                sub_repo = seafile_api.get_repo(sub_repo_id)
            except SearpcError as e:
                result['error'] = e.msg
                return HttpResponse(json.dumps(result), status=500, content_type=content_type)

        shared_repo_id = sub_repo.id
        shared_repo = sub_repo
    else:
        shared_repo_id = repo_id
        shared_repo = repo

    emails_string = request.POST.get('emails', '')
    groups_string = request.POST.get('groups', '')
    perm = request.POST.get('perm', '')

    emails = string2list(emails_string)
    groups = string2list(groups_string)

    # Test whether user is the repo owner.
    if not seafile_api.is_repo_owner(username, shared_repo_id) and \
            not is_org_repo_owner(username, shared_repo_id):
        result['error'] = _(u'Only the owner of the library has permission to share it.')
        return HttpResponse(json.dumps(result), status=500, content_type=content_type)

    # Parsing input values.
    # no 'share_to_all'
    share_to_groups, share_to_users, shared_success, shared_failed = [], [], [], []

    for email in emails:
        email = email.lower()
        if is_valid_username(email):
            share_to_users.append(email)
        else:
            shared_failed.append(email)

    for group_id in groups:
        share_to_groups.append(seaserv.get_group(group_id))

    if not check_user_share_quota(username, shared_repo, users=share_to_users,
                                  groups=share_to_groups):
        result['error'] = _(('Failed to share "%s", no enough quota. <a href="http://seafile.com/">Upgrade account.</a>') % escape(shared_repo.name))
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    for email in share_to_users:
        # Add email to contacts.
        mail_sended.send(sender=None, user=request.user.username, email=email)
        if share_to_user(request, shared_repo, email, perm):
            shared_success.append(email)
        else:
            shared_failed.append(email)

    for group in share_to_groups:
        if share_to_group(request, shared_repo, group, perm):
            shared_success.append(group.group_name)
        else:
            shared_failed.append(email)

    if len(shared_success) > 0:
        return HttpResponse(json.dumps({
            "shared_success": shared_success,
            "shared_failed": shared_failed
            }), content_type=content_type)
    else:
        # for case: only share to users and the emails are not valid
        data = json.dumps({"error": _("Please check the email(s) you entered")})
        return HttpResponse(data, status=400, content_type=content_type)

@login_required_ajax
@require_POST
def ajax_private_share_file(request):
    content_type = 'application/json; charset=utf-8'

    emails_string = request.POST.get('emails', '')
    repo_id = request.POST.get('repo_id', '')
    path = request.POST.get('path', '')
    username = request.user.username
    emails = emails_string.split(',')

    shared_success, shared_failed = [], []

    for email in [e.strip() for e in emails if e.strip()]:
        if not is_valid_username(email):
            shared_failed.append(email)
            continue

        if not is_registered_user(email):
            shared_failed.append(email)
            continue

        pfds = PrivateFileDirShare.objects.add_read_only_priv_file_share(username, email, repo_id, path)
        shared_success.append(email)

        # send a signal when sharing file successful
        share_file_to_user_successful.send(sender=None, priv_share_obj=pfds)

    if len(shared_success) > 0:
        data = json.dumps({"shared_success": shared_success, "shared_failed": shared_failed})
        return HttpResponse(data, content_type=content_type)
    else:
        data = json.dumps({"error": _("Please check the email(s) you entered")})
        return HttpResponse(data, status=400, content_type=content_type)
