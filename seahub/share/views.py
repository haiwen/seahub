# encoding: utf-8
import os
import logging
import json
from dateutil.relativedelta import relativedelta
from constance import config

from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect, Http404, \
    HttpResponseBadRequest
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
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
from seahub.share.models import FileShare, UploadLinkShare, OrgFileShare
from seahub.share.signals import share_repo_to_user_successful
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.base.decorators import user_mods_check, require_POST
from seahub.contacts.signals import mail_sended
from seahub.views import is_registered_user, check_folder_permission
from seahub.utils import render_permission_error, string2list, render_error, \
    gen_shared_link, gen_shared_upload_link, gen_dir_share_link, \
    gen_file_share_link, IS_EMAIL_CONFIGURED, check_filename_with_rename, \
    is_valid_username, is_valid_email, send_html_email, is_org_context, \
    send_perm_audit_msg, get_origin_repo_info, gen_token, normalize_cache_key
from seahub.utils.mail import send_html_email_with_dj_template, MAIL_PRIORITY
from seahub.settings import SITE_ROOT, REPLACE_FROM_EMAIL, ADD_REPLY_TO_HEADER
from seahub.profile.models import Profile

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

@login_required
@require_POST
def repo_remove_share(request):
    """
    If repo is shared from one person to another person, only these two person
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
    fs_files, fs_dirs = [], []
    for fs in fileshares:
        r = seafile_api.get_repo(fs.repo_id)
        if not r:
            fs.delete()
            continue

        if fs.is_file_share_link():
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

        if fs.expire_date is not None and timezone.now() > fs.expire_date:
            fs.is_expired = True

        fs_files.append(fs) if fs.is_file_share_link() else fs_dirs.append(fs)
    fs_files.sort(lambda x, y: cmp(x.filename, y.filename))
    fs_dirs.sort(lambda x, y: cmp(x.filename, y.filename))

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
    p_uploadlinks.sort(lambda x, y: cmp(x.dir_name, y.dir_name))

    return render_to_response('share/links.html', {
            "fileshares": fs_dirs + fs_files,
            "uploadlinks": p_uploadlinks,
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

########## share link
@login_required_ajax
@require_POST
def ajax_remove_shared_link(request):
    username = request.user.username
    content_type = 'application/json; charset=utf-8'
    result = {}

    token = request.POST.get('t')
    if not token:
        result = {'error': _(u"Argument missing")}
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    try:
        link = FileShare.objects.get(token=token)
    except FileShare.DoesNotExist:
        result = {'error': _(u"The link doesn't exist")}
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    if not link.is_owner(username):
        result = {'error': _("Permission denied")}
        return HttpResponse(json.dumps(result), status=403,
                            content_type=content_type)

    link.delete()
    result = {'success': True}
    return HttpResponse(json.dumps(result), content_type=content_type)


@login_required_ajax
@require_POST
def ajax_remove_shared_upload_link(request):
    username = request.user.username
    content_type = 'application/json; charset=utf-8'
    result = {}

    token = request.POST.get('t')
    if not token:
        result = {'error': _(u"Argument missing")}
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    try:
        upload_link = UploadLinkShare.objects.get(token=token)
    except UploadLinkShare.DoesNotExist:
        result = {'error': _(u"The link doesn't exist")}
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    if not upload_link.is_owner(username):
        result = {'error': _("Permission denied")}
        return HttpResponse(json.dumps(result), status=403,
                            content_type=content_type)
    upload_link.delete()
    result = {'success': True}
    return HttpResponse(json.dumps(result), content_type=content_type)


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
        # use contact_email, if present
        username = Profile.objects.get_contact_email_by_user(request.user.username)
        for to_email in to_email_list:
            if not is_valid_email(to_email):
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
                from_email = username
            else:
                from_email = None  # use default from email

            if ADD_REPLY_TO_HEADER:
                reply_to = username
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
            except Exception:
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

    if check_folder_permission(request, dst_repo_id, dst_path) != 'rw':
        messages.error(request, _('Permission denied'))
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
        # use contact_email, if present
        username = Profile.objects.get_contact_email_by_user(request.user.username)
        for to_email in to_email_list:
            if not is_valid_email(to_email):
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
                from_email = username
            else:
                from_email = None  # use default from email

            if ADD_REPLY_TO_HEADER:
                reply_to = username
            else:
                reply_to = None

            try:
                send_html_email(_(u'An upload link is shared to you on %s') % SITE_NAME,
                                'shared_upload_link_email.html',
                                c, from_email, [to_email],
                                reply_to=reply_to)

                send_success.append(to_email)
            except Exception:
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
        repo_id = request.GET.get('repo_id', None)
        path = request.GET.get('p', None)

        # augument check
        if not repo_id:
            data = json.dumps({'error': 'repo_id invalid.'})
            return HttpResponse(data, status=400, content_type=content_type)

        if not path:
            data = json.dumps({'error': 'p invalid.'})
            return HttpResponse(data, status=400, content_type=content_type)

        # resource check
        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            logger.error(e)
            data = json.dumps({'error': 'Internal Server Error'})
            return HttpResponse(data, status=500, content_type=content_type)

        if not repo:
            data = json.dumps({'error': 'Library %s not found.' % repo_id})
            return HttpResponse(data, status=404, content_type=content_type)

        if not path.endswith('/'):
            path = path + '/'

        if not seafile_api.get_dir_id_by_path(repo_id, path):
            data = json.dumps({'error': 'Folder %s not found.' % path})
            return HttpResponse(data, status=404, content_type=content_type)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            data = json.dumps({'error': 'Permission denied.'})
            return HttpResponse(data, status=403, content_type=content_type)

        # get upload link
        username = request.user.username
        l = UploadLinkShare.objects.filter(repo_id=repo_id).filter(
            username=username).filter(path=path)

        data = {}
        if len(l) > 0:
            token = l[0].token
            data['upload_link'] = gen_shared_upload_link(token)
            data['token'] = token

        return HttpResponse(json.dumps(data), content_type=content_type)

    elif request.method == 'POST':
        repo_id = request.POST.get('repo_id', None)
        path = request.POST.get('p', None)
        use_passwd = True if int(request.POST.get('use_passwd', '0')) == 1 else False
        passwd = request.POST.get('passwd') if use_passwd else None

        # augument check
        if not repo_id:
            data = json.dumps({'error': 'repo_id invalid.'})
            return HttpResponse(data, status=400, content_type=content_type)

        if not path:
            data = json.dumps({'error': 'p invalid.'})
            return HttpResponse(data, status=400, content_type=content_type)

        if passwd and len(passwd) < config.SHARE_LINK_PASSWORD_MIN_LENGTH:
            data = json.dumps({'error': _('Password is too short')})
            return HttpResponse(data, status=400, content_type=content_type)

        # resource check
        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            logger.error(e)
            data = json.dumps({'error': 'Internal Server Error'})
            return HttpResponse(data, status=500, content_type=content_type)

        if not repo:
            data = json.dumps({'error': 'Library %s not found.' % repo_id})
            return HttpResponse(data, status=404, content_type=content_type)

        if not path.endswith('/'):
            path = path + '/'

        if not seafile_api.get_dir_id_by_path(repo_id, path):
            data = json.dumps({'error': 'Folder %s not found.' % path})
            return HttpResponse(data, status=404, content_type=content_type)

        # permission check
        # normal permission check & default/guest user permission check
        if check_folder_permission(request, repo_id, path) != 'rw' or \
            not request.user.permissions.can_generate_shared_link():
            data = json.dumps({'error': 'Permission denied.'})
            return HttpResponse(data, status=403, content_type=content_type)

        # generate upload link
        l = UploadLinkShare.objects.filter(repo_id=repo_id).filter(
            username=request.user.username).filter(path=path)

        if len(l) > 0:
            # if already exist
            upload_link = l[0]
            token = upload_link.token
        else:
            # generate new
            username = request.user.username
            uls = UploadLinkShare.objects.create_upload_link_share(
                username, repo_id, path, passwd)
            token = uls.token

        shared_upload_link = gen_shared_upload_link(token)
        data = json.dumps({'token': token, 'upload_link': shared_upload_link})

        return HttpResponse(data, content_type=content_type)

@login_required_ajax
def ajax_get_download_link(request):
    """
    Handle ajax request to generate file or dir shared link.
    """
    content_type = 'application/json; charset=utf-8'

    if request.method == 'GET':
        repo_id = request.GET.get('repo_id', None)
        share_type = request.GET.get('type', 'f')
        path = request.GET.get('p', None)

        # augument check
        if not repo_id:
            data = json.dumps({'error': 'repo_id invalid.'})
            return HttpResponse(data, status=400, content_type=content_type)

        if not path:
            data = json.dumps({'error': 'p invalid.'})
            return HttpResponse(data, status=400, content_type=content_type)

        if share_type not in ('f', 'd'):
            data = json.dumps({'error': 'type invalid.'})
            return HttpResponse(data, status=400, content_type=content_type)

        # resource check
        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            logger.error(e)
            data = json.dumps({'error': 'Internal Server Error'})
            return HttpResponse(data, status=500, content_type=content_type)

        if not repo:
            data = json.dumps({'error': 'Library %s not found.' % repo_id})
            return HttpResponse(data, status=404, content_type=content_type)

        if share_type == 'f':
            if not seafile_api.get_file_id_by_path(repo_id, path):
                data = json.dumps({'error': 'File %s not found.' % path})
                return HttpResponse(data, status=404, content_type=content_type)

        if share_type == 'd':
            if not path.endswith('/'):
                path = path + '/'

            if not seafile_api.get_dir_id_by_path(repo_id, path):
                data = json.dumps({'error': 'Folder %s not found.' % path})
                return HttpResponse(data, status=404, content_type=content_type)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            data = json.dumps({'error': 'Permission denied.'})
            return HttpResponse(data, status=403, content_type=content_type)

        # get download link
        username = request.user.username
        l = FileShare.objects.filter(repo_id=repo_id).filter(
            username=username).filter(path=path)

        data = {}
        if len(l) > 0:
            token = l[0].token
            data['download_link'] = gen_shared_link(token, l[0].s_type)
            data['token'] = token
            data['is_expired'] = l[0].is_expired()

        return HttpResponse(json.dumps(data), content_type=content_type)

    elif request.method == 'POST':
        repo_id = request.POST.get('repo_id', None)
        path = request.POST.get('p', None)
        share_type = request.POST.get('type', 'f')
        use_passwd = True if int(request.POST.get('use_passwd', '0')) == 1 else False
        passwd = request.POST.get('passwd') if use_passwd else None

        # augument check
        if not repo_id:
            data = json.dumps({'error': 'repo_id invalid.'})
            return HttpResponse(data, status=400, content_type=content_type)

        if not path:
            data = json.dumps({'error': 'p invalid.'})
            return HttpResponse(data, status=400, content_type=content_type)

        if share_type not in ('f', 'd'):
            data = json.dumps({'error': 'type invalid.'})
            return HttpResponse(data, status=400, content_type=content_type)

        if passwd and len(passwd) < config.SHARE_LINK_PASSWORD_MIN_LENGTH:
            data = json.dumps({'error': _('Password is too short')})
            return HttpResponse(data, status=400, content_type=content_type)

        try:
            expire_days = int(request.POST.get('expire_days', 0))
        except ValueError:
            expire_days = 0

        if expire_days <= 0:
            expire_date = None
        else:
            expire_date = timezone.now() + relativedelta(days=expire_days)

        # resource check
        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            logger.error(e)
            data = json.dumps({'error': 'Internal Server Error'})
            return HttpResponse(data, status=500, content_type=content_type)

        if not repo:
            data = json.dumps({'error': 'Library %s not found.' % repo_id})
            return HttpResponse(data, status=404, content_type=content_type)

        if share_type == 'f':
            if not seafile_api.get_file_id_by_path(repo_id, path):
                data = json.dumps({'error': 'File %s not found.' % path})
                return HttpResponse(data, status=404, content_type=content_type)

        if share_type == 'd':
            if not path.endswith('/'):
                path = path + '/'

            if not seafile_api.get_dir_id_by_path(repo_id, path):
                data = json.dumps({'error': 'Folder %s not found.' % path})
                return HttpResponse(data, status=404, content_type=content_type)

        # permission check
        # normal permission check & default/guest user permission check
        if check_folder_permission(request, repo_id, path) != 'rw' or \
            not request.user.permissions.can_generate_shared_link():
            data = json.dumps({'error': 'Permission denied.'})
            return HttpResponse(data, status=403, content_type=content_type)

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
            shared_failed.append(group.group_name)

    if len(shared_success) > 0:
        return HttpResponse(json.dumps({
            "shared_success": shared_success,
            "shared_failed": shared_failed
            }), content_type=content_type)
    else:
        # for case: only share to users and the emails are not valid
        data = json.dumps({"error": _("Please check the email(s) you entered")})
        return HttpResponse(data, status=400, content_type=content_type)

def ajax_get_link_audit_code(request):
    """
    Generate a token, and record that token with email in cache, expires in
    one hour, send token to that email address.

    User provide token and email at share link page, if the token and email
    are valid, record that email in session.
    """
    content_type = 'application/json; charset=utf-8'

    token = request.POST.get('token')
    email = request.POST.get('email')
    if not is_valid_email(email):
        return HttpResponse(json.dumps({
            'error': _('Email address is not valid')
        }), status=400, content_type=content_type)

    dfs = FileShare.objects.get_valid_file_link_by_token(token)
    ufs = UploadLinkShare.objects.get_valid_upload_link_by_token(token)

    fs = dfs if dfs else ufs
    if fs is None:
        return HttpResponse(json.dumps({
            'error': _('Share link is not found')
        }), status=400, content_type=content_type)

    cache_key = normalize_cache_key(email, 'share_link_audit_')
    timeout = 60 * 60           # one hour
    code = gen_token(max_length=6)
    cache.set(cache_key, code, timeout)

    # send code to user via email
    subject = _("Verification code for visiting share links")
    c = {
        'code': code,
    }
    try:
        send_html_email_with_dj_template(
            email, dj_template='share/audit_code_email.html',
            context=c, subject=subject, priority=MAIL_PRIORITY.now
        )
        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=content_type)
    except Exception as e:
        logger.error('Failed to send audit code via email to %s')
        logger.error(e)
        return HttpResponse(json.dumps({
            "error": _("Failed to send a verification code, please try again later.")
        }), status=500, content_type=content_type)
