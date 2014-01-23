# encoding: utf-8
import os
import logging
import simplejson as json
from django.core.mail import send_mail
from django.core.urlresolvers import reverse
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, Http404, \
    HttpResponseBadRequest
from django.shortcuts import render_to_response
from django.template import Context, loader, RequestContext
from django.utils.translation import ugettext as _
from django.views.decorators.http import require_POST

from django.contrib import messages
from django.contrib.sites.models import Site, RequestSite
from pysearpc import SearpcError
import seaserv
from seaserv import seafile_api
from seaserv import seafserv_threaded_rpc, ccnet_rpc, \
    ccnet_threaded_rpc, get_personal_groups, list_personal_shared_repos, \
    is_personal_repo, check_group_staff, is_org_group, get_org_id_by_group, \
    del_org_group_repo, list_share_repos, get_group_repos_by_owner, \
    list_inner_pub_repos_by_owner, remove_share

from forms import RepoShareForm, FileLinkShareForm, UploadLinkShareForm
from models import AnonymousShare, FileShare, PrivateFileDirShare, UploadLinkShare
from signals import share_repo_to_user_successful
from settings import ANONYMOUS_SHARE_COOKIE_TIMEOUT
from tokens import anon_share_token_generator
from seahub.auth.decorators import login_required
from seahub.base.accounts import User
from seahub.contacts.models import Contact
from seahub.contacts.signals import mail_sended
from seahub.signals import share_file_to_user_successful
from seahub.views import validate_owner, is_registered_user
from seahub.utils import render_permission_error, string2list, render_error, \
    gen_token, gen_shared_link, gen_shared_upload_link, gen_dir_share_link, \
    gen_file_share_link, IS_EMAIL_CONFIGURED, check_filename_with_rename

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
from seahub.settings import SITE_ROOT

# Get an instance of a logger
logger = logging.getLogger(__name__)

def share_to_public(request, repo, permission):
    """Share repo to public with given permission.
    """
    repo_id = repo.id
    try:
        seafile_api.add_inner_pub_repo(repo_id, permission)
    except Exception, e:
        logger.error(e)
        messages.error(request, _(u'Failed to share to all members, please try again later.'))
    else:
        msg = _(u'Shared to all members successfully, go check it at <a href="%s">Shares</a>.') % \
            (reverse('share_admin'))
        messages.success(request, msg)

def share_to_group(request, repo, from_user, group, permission):
    """Share repo to group with given permission.
    """
    repo_id = repo.id
    group_id = group.id
    group_name = group.group_name
    
    if repo.id in seafile_api.get_group_repoids(group.id):
        msg = _(u'"%(repo)s" is already in group %(group)s. <a href="%(href)s">View</a>') % {
            'repo': repo.name, 'group': group.group_name,
            'href': reverse('group_info', args=[group.id])}
        messages.error(request, msg)
        return

    try:
        seafile_api.group_share_repo(repo_id, group_id, from_user, permission)
    except Exception, e:
        logger.error(e)
        msg = _(u'Failed to share %(repo)s to %(group)s, please try again later.') % \
            {'repo': repo.name, 'group': group_name}
        messages.error(request, msg)
    else:
        msg = _(u'Shared to %(group)s successfully，go check it at <a href="%(share)s">Shares</a>.') % \
            {'group':group_name, 'share':reverse('share_admin')}
        messages.success(request, msg)
        
def share_to_user(request, repo, from_user, to_user, permission):
    """Share repo to a user with given permission.
    """
    repo_id = repo.id

    if from_user == to_user:
        msg = _(u'You can not share libray to yourself.')
        messages.error(request, msg)
        return

    if is_registered_user(to_user):
        try:
            seafile_api.share_repo(repo_id, from_user, to_user, permission)
        except Exception, e:
            logger.error(e)
            msg = _(u'Failed to share to %s, please try again later.') % to_user
            messages.error(request, msg)
        else:
            # send a signal when sharing repo successful
            share_repo_to_user_successful.send(sender=None,
                                               from_user=from_user,
                                               to_user=to_user, repo=repo)
            msg = _(u'Shared to %(email)s successfully，go check it at <a href="%(share)s">Shares</a>.') % \
                {'email':to_user, 'share':reverse('share_admin')}
            messages.success(request, msg)
    else:
        msg = _(u'Failed to share to %s, as the email is not registered.') % to_user
        messages.error(request, msg)

def check_user_share_quota(username, repo, users=[], groups=[]):
    """Check whether user has enough quota when share repo to users/groups.
    """
    if not users and not groups:
        return True

    if not seaserv.CALC_SHARE_USAGE:
        return True
    
    check_pass = False
    quota = seafile_api.get_user_quota(username)
    self_usage = seafile_api.get_user_self_usage(username)
    current_share_usage = seafile_api.get_user_share_usage(username)

    share_usage = 0
    if users:
        share_usage += seafile_api.get_repo_size(repo.id) * (len(users))
        
    if groups:
        grp_members = []
        for group in groups:
            grp_members += [ e.user_name for e in seaserv.get_group_members(group.id)]
        grp_members = set(grp_members)
        share_usage += seafile_api.get_repo_size(repo.id) * (len(grp_members) -1)
    if share_usage + self_usage + current_share_usage < quota:
        check_pass = True

    return check_pass

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
    from_email = request.user.username

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    # Test whether user is the repo owner.
    if not validate_owner(request, repo_id):
        msg = _(u'Only the owner of the library has permission to share it.')
        messages.error(request, msg)
        return HttpResponseRedirect(next)
    

    # Parsing input values.
    share_to_list = string2list(email_or_group)
    share_to_all, share_to_group_names, share_to_users = False, [], []
    for share_to in share_to_list:
        if share_to == 'all':
            share_to_all = True
        elif share_to.find('@') == -1:
            share_to_group_names.append(share_to)
        else:
            share_to_users.append(share_to.lower())

    share_to_groups = []
    # get all personal groups
    for group in seaserv.get_personal_groups_by_user(from_email):
        # for every group that user joined, if group name matchs,
        # then has find the group
        if group.group_name in share_to_group_names:
            share_to_groups.append(group)


    if share_to_all and not CLOUD_MODE:
        share_to_public(request, repo, permission)

    if not check_user_share_quota(from_email, repo, users=share_to_users,
                                  groups=share_to_groups):
        messages.error(request, _('Failed to share "%s", no enough quota. <a href="http://seafile.com/">Upgrade account.</a>') % repo.name)
        return HttpResponseRedirect(next)
        
    for group in share_to_groups:
        share_to_group(request, repo, from_email, group, permission)

    for email in share_to_users:
        # Add email to contacts.
        mail_sended.send(sender=None, user=request.user.username, email=email)
        share_to_user(request, repo, from_email, email, permission)

    return HttpResponseRedirect(next)

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

    # if request params don't have 'gid', then remove repos that share to
    # to other person; else, remove repos that share to groups
    if not group_id:
        to_email = request.GET.get('to', '')
        if request.user.username != from_email and \
                request.user.username != to_email:
            return render_permission_error(request, _(u'Failed to remove share'))
        remove_share(repo_id, from_email, to_email)
    else:
        try:
            group_id_int = int(group_id)
        except:
            return render_error(request, _(u'group id is not valid'))

        if not check_group_staff(group_id_int, request.user.username) \
                and request.user.username != from_email: 
            return render_permission_error(request, _(u'Failed to remove share'))

        if is_org_group(group_id_int):
            org_id = get_org_id_by_group(group_id_int)
            del_org_group_repo(repo_id, org_id, group_id_int)
        else:
            from seahub.group.views import group_unshare_repo
            group_unshare_repo(request, repo_id, group_id_int, from_email)

    messages.success(request, _('Successfully removed share'))
        
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT

    return HttpResponseRedirect(next)

# @login_required
# def share_admin(request):
#     """
#     List share out libraries.
#     """
#     username = request.user.username

#     shared_repos = []

#     # personal repos shared by this user
#     shared_repos += list_share_repos(username, 'from_email', -1, -1)

#     # repos shared to groups
#     group_repos = get_group_repos_by_owner(username)
#     for repo in group_repos:
#         group = ccnet_threaded_rpc.get_group(int(repo.group_id))
#         if not group:
#             repo.props.user = ''
#             continue
#         repo.props.user = group.props.group_name
#         repo.props.user_info = repo.group_id
#     shared_repos += group_repos

#     if not CLOUD_MODE:
#         # public repos shared by this user
#         pub_repos = list_inner_pub_repos_by_owner(username)
#         for repo in pub_repos:
#             repo.props.user = _(u'all members')
#             repo.props.user_info = 'all'
#         shared_repos += pub_repos

#     for repo in shared_repos:
#         if repo.props.permission == 'rw':
#             repo.share_permission = _(u'Read-Write')
#         elif repo.props.permission == 'r':
#             repo.share_permission = _(u'Read-Only')
#         else:
#             repo.share_permission = ''

#         if repo.props.share_type == 'personal':
#             repo.props.user_info = repo.props.user

#     shared_repos.sort(lambda x, y: cmp(x.repo_id, y.repo_id))

#     # Repo anonymous share links
#     # out_links = AnonymousShare.objects.filter(repo_owner=request.user.username)
#     # for link in out_links:
#     #     repo = get_repo(link.repo_id)
#     #     link.repo_name = repo.name
#     #     link.remain_time = anon_share_token_generator.get_remain_time(link.token)        

#     return render_to_response('repo/share_admin.html', {
#             "org": None,
#             "shared_repos": shared_repos,
#             # "out_links": out_links,
#             }, context_instance=RequestContext(request))

@login_required
def list_share_out_repos(request):
    """
    List personal shared repos.
    """
    username = request.user.username

    shared_repos = []

    # personal repos shared from this user
    shared_repos += seafile_api.get_share_out_repo_list(username, -1, -1)

    # repos shared to groups
    group_repos = get_group_repos_by_owner(username)
    for repo in group_repos:
        group = ccnet_threaded_rpc.get_group(int(repo.group_id))
        if not group:
            repo.props.user = ''
            continue
        repo.props.user = group.props.group_name
        repo.props.user_info = repo.group_id
    shared_repos += group_repos

    if not CLOUD_MODE:
        # public repos shared by this user
        pub_repos = list_inner_pub_repos_by_owner(username)
        for repo in pub_repos:
            repo.props.user = _(u'all members')
            repo.props.user_info = 'all'
        shared_repos += pub_repos

    for repo in shared_repos:
        if repo.props.permission == 'rw':
            repo.share_permission = _(u'Read-Write')
        elif repo.props.permission == 'r':
            repo.share_permission = _(u'Read-Only')
        else:
            repo.share_permission = ''

        if repo.props.share_type == 'personal':
            repo.props.user_info = repo.props.user

    shared_repos.sort(lambda x, y: cmp(x.repo_id, y.repo_id))
    
    return render_to_response('repo/share_out_repos.html', {
            "shared_repos": shared_repos,
            }, context_instance=RequestContext(request))

@login_required
def list_shared_links(request):
    """List share links, and remove invalid links(file/dir is deleted or moved).
    """
    username = request.user.username

    fileshares = FileShare.objects.filter(username=username)
    p_fileshares = []           # personal file share
    for fs in fileshares:
        if is_personal_repo(fs.repo_id):  # only list files in personal repos
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
                fs.filename = os.path.basename(fs.path.rstrip('/'))
                fs.shared_link = gen_dir_share_link(fs.token)
            fs.repo = r
            p_fileshares.append(fs)
    
    return render_to_response('repo/shared_links.html', {
            "fileshares": p_fileshares,
            }, context_instance=RequestContext(request))

@login_required
def list_shared_upload_links(request):
    """List upload links, and remove invalid links(dir is deleted or moved).
    """
    username = request.user.username

    uploadlinks = UploadLinkShare.objects.filter(username=username)
    p_uploadlinks = []
    for link in uploadlinks:
        if is_personal_repo(link.repo_id):
            r = seafile_api.get_repo(link.repo_id)
            if not r:
                link.delete()
                continue
            if seafile_api.get_dir_id_by_path(r.id, link.path) is None:
                link.delete()
                continue
            link.dir_name = os.path.basename(link.path.rstrip('/'))
            link.shared_link = gen_shared_upload_link(link.token)
            link.repo = r
            p_uploadlinks.append(link)

    return render_to_response('repo/shared_upload_links.html', {
            "uploadlinks": p_uploadlinks,
            }, context_instance=RequestContext(request))

@login_required
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
    
    return render_to_response('repo/priv_shared_files.html', {
            "priv_share_out": priv_share_out,
            "priv_share_in": priv_share_in,
            }, context_instance=RequestContext(request))

    
@login_required
def share_permission_admin(request):
    share_type = request.GET.get('share_type', '')
    content_type = 'application/json; charset=utf-8'
    
    form = RepoShareForm(request.POST)
    form.is_valid()
    
    email_or_group = form.cleaned_data['email_or_group']
    repo_id = form.cleaned_data['repo_id']
    permission = form.cleaned_data['permission']
    from_email = request.user.username

    if share_type == 'personal':
        try:
            seafserv_threaded_rpc.set_share_permission(repo_id, from_email, email_or_group, permission)
        except:
            return HttpResponse(json.dumps({'success': False}), status=500, content_type=content_type)
        return HttpResponse(json.dumps({'success': True}), content_type=content_type)

    if share_type == 'group':
        try:
            seafserv_threaded_rpc.set_group_repo_permission(int(email_or_group), repo_id, permission)
        except:
            return HttpResponse(json.dumps({'success': False}), status=500, content_type=content_type)
        return HttpResponse(json.dumps({'success': True}), content_type=content_type)

    if share_type == 'public':
        try:
            seafserv_threaded_rpc.set_inner_pub_repo(repo_id, permission)
        except:
            return HttpResponse(json.dumps({'success': False}), status=500, content_type=content_type)
        return HttpResponse(json.dumps({'success': True}), content_type=content_type)

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
@login_required
def get_shared_link(request):
    """
    Handle ajax request to generate file or dir shared link.
    """
    if not request.is_ajax():
        raise Http404
    
    content_type = 'application/json; charset=utf-8'
    
    repo_id = request.GET.get('repo_id', '')
    share_type = request.GET.get('type', 'f') # `f` or `d`
    path = request.GET.get('p', '')
    if not (repo_id and  path):
        err = _('Invalid arguments')
        data = json.dumps({'error': err})
        return HttpResponse(data, status=400, content_type=content_type)
    
    if share_type == 'f':
        if path[-1] == '/':     # cut out last '/' at end of path
            path = path[:-1]
    else:
        if path == '/':         # can not share root dir
            err = _('You cannot share the library in this way.')
            data = json.dumps({'error': err})
            return HttpResponse(data, status=400, content_type=content_type)
        else:
            if path[-1] != '/': # append '/' at end of path
                path += '/'

    l = FileShare.objects.filter(repo_id=repo_id).filter(
        username=request.user.username).filter(path=path)
    if len(l) > 0:
        fs = l[0]
        token = fs.token
    else:
        token = gen_token(max_length=10)
        
        fs = FileShare()
        fs.username = request.user.username
        fs.repo_id = repo_id
        fs.path = path
        fs.token = token
        fs.s_type = 'f' if share_type == 'f' else 'd'

        try:
            fs.save()
        except IntegrityError, e:
            err = _('Failed to get the link, please retry later.')
            data = json.dumps({'error': err})
            return HttpResponse(data, status=500, content_type=content_type)

    shared_link = gen_shared_link(token, fs.s_type)

    data = json.dumps({'token': token, 'shared_link': shared_link})
    return HttpResponse(data, status=200, content_type=content_type)

@login_required
def remove_shared_link(request):
    """
    Handle request to remove file shared link.
    """
    token = request.GET.get('t')
    
    if not request.is_ajax():
        FileShare.objects.filter(token=token).delete()
        next = request.META.get('HTTP_REFERER', None)
        if not next:
            next = reverse('share_admin')

        messages.success(request, _(u'Removed successfully'))
        
        return HttpResponseRedirect(next)

    content_type = 'application/json; charset=utf-8'
    result = {}

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

    if not request.is_ajax():
        UploadLinkShare.objects.filter(token=token).delete()
        next = request.META.get('HTTP_REFERER', None)
        if not next:
            next = reverse('share_admin')

        messages.success(request, _(u'Removed successfully'))

        return HttpResponseRedirect(next)

    content_type = 'application/json; charset=utf-8'
    result = {}

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

@login_required
def send_shared_link(request):
    """
    Handle ajax post request to send file shared link.
    """
    if not request.is_ajax() and not request.method == 'POST':
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

        t = loader.get_template('shared_link_email.html')
        to_email_list = string2list(email)
        for to_email in to_email_list:
            # Add email to contacts.
            mail_sended.send(sender=None, user=request.user.username,
                             email=to_email)

            c = {
                'email': request.user.username,
                'to_email': to_email,
                'file_shared_link': file_shared_link,
                'site_name': SITE_NAME,
                }

            try:
                send_mail(_(u'Your friend shared a file to you on Seafile'),
                          t.render(Context(c)), None, [to_email],
                          fail_silently=False)
            except Exception, e:
                logger.error(str(e))
                data = json.dumps({'error':_(u'Internal server error. Send failed.')})
                return HttpResponse(data, status=500, content_type=content_type)

        data = json.dumps({"msg": _(u'Successfully sent.')})
        return HttpResponse(data, status=200, content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)

@login_required
def save_shared_link(request):
    """Save public share link to one's library.
    """
    username = request.user.username
    token = request.GET.get('t', '')
    dst_repo_id = request.POST.get('dst_repo')
    dst_path = request.POST.get('dst_path')

    try:
        fs = FileShare.objects.get(token=token)
    except FileShare.DoesNotExist:
        raise Http404

    src_repo_id = fs.repo_id
    src_path = os.path.dirname(fs.path)
    obj_name = os.path.basename(fs.path)

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)
    
    seafile_api.copy_file(src_repo_id, src_path, obj_name,
                          dst_repo_id, dst_path, new_obj_name, username)

    messages.success(request, _(u'Successfully saved.'))

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT
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
    repo_id = pfs.repo_id
    path = pfs.path
    file_or_dir = os.path.basename(path.rstrip('/'))
    username = request.user.username

    if username == from_user or username == to_user:
        pfs.delete()
        messages.success(request, _('Successfully unshared "%s".') % file_or_dir)
    else:
        messages.error(request, _("You don't have permission to unshared %s.") % file_or_dir)

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
                              dst_repo_id, dst_path, new_obj_name, username)

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
            return render_to_response("user_404.html",{},
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
            
    return render_to_response('repo/user_share_list.html', {
            'to_email': to_email,
            'share_list': share_list,
            'add_to_contacts': add_to_contacts,
            }, context_instance=RequestContext(request))
    
@login_required
def get_shared_upload_link(request):
    """
    Handle ajax request to generate dir upload link.
    """
    if not request.is_ajax():
        raise Http404
    content_type = 'application/json; charset=utf-8'

    repo_id = request.GET.get('repo_id', '')
    path = request.GET.get('p', '')

    if not (repo_id and  path):
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
    l = UploadLinkShare.objects.filter(repo_id=repo_id).filter(
        username=request.user.username).filter(path=path)
    if len(l) > 0:
        upload_link = l[0]
        token = upload_link.token
    else:
        token = gen_token(max_length=10)

        upload_link = UploadLinkShare()
        upload_link.username = request.user.username
        upload_link.repo_id = repo_id
        upload_link.path = path
        upload_link.token = token

        try:
            upload_link.save()
        except IntegrityError, e:
            err = _('Failed to get the link, please retry later.')
            data = json.dumps({'error': err})
            return HttpResponse(data, status=500, content_type=content_type)

    shared_upload_link = gen_shared_upload_link(token)

    data = json.dumps({'token': token, 'shared_upload_link': shared_upload_link})
    return HttpResponse(data, status=200, content_type=content_type)

@login_required
def send_shared_upload_link(request):
    """
    Handle ajax post request to send shared upload link.
    """
    if not request.is_ajax() and not request.method == 'POST':
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

        t = loader.get_template('shared_upload_link_email.html')
        to_email_list = string2list(email)
        for to_email in to_email_list:
            # Add email to contacts.
            mail_sended.send(sender=None, user=request.user.username,
                             email=to_email)

            c = {
                'email': request.user.username,
                'to_email': to_email,
                'shared_upload_link': shared_upload_link,
                'site_name': SITE_NAME,
                }

            try:
                send_mail(_(u'Your friend shared a upload link to you on Seafile'),
                          t.render(Context(c)), None, [to_email],
                          fail_silently=False)
            except Exception, e:
                logger.error(str(e))
                data = json.dumps({'error':_(u'Internal server error. Send failed.')})
                return HttpResponse(data, status=500, content_type=content_type)

        data = json.dumps({"msg": _(u'Successfully sent.')})
        return HttpResponse(data, status=200, content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)
