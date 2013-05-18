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

from django.contrib import messages
from django.contrib.sites.models import Site, RequestSite
from pysearpc import SearpcError
import seaserv
from seaserv import seafserv_threaded_rpc, get_repo, ccnet_rpc, \
    ccnet_threaded_rpc, get_personal_groups, list_personal_shared_repos, \
    is_personal_repo, check_group_staff, is_org_group, get_org_id_by_group, \
    del_org_group_repo, list_share_repos, get_group_repos_by_owner, \
    list_inner_pub_repos_by_owner, remove_share

from forms import RepoShareForm, FileLinkShareForm
from models import AnonymousShare
from settings import ANONYMOUS_SHARE_COOKIE_TIMEOUT
from tokens import anon_share_token_generator
from seahub.auth.decorators import login_required
from seahub.contacts.signals import mail_sended
from seahub.share.models import FileShare
from seahub.message.models import UserMessage
from seahub.views import validate_owner, is_registered_user
from seahub.utils import render_permission_error, string2list, render_error, \
    gen_token, gen_shared_link, IS_EMAIL_CONFIGURED

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
from seahub.settings import SITE_ROOT

# Get an instance of a logger
logger = logging.getLogger(__name__)

@login_required
def share_repo(request):
    """
    Handle repo share request
    """
    if request.method != 'POST':
        raise Http404
    
    sender = request.user.username.split('@')[0]
    http_or_https = request.is_secure() and 'https' or 'http'
    domain = request.get_host()
    head_of_repo_url = '%s://%s/' % (http_or_https, domain)

    form = RepoShareForm(request.POST)
    if not form.is_valid():
        # TODO: may display error msg on form 
        raise Http404
    
    email_or_group = form.cleaned_data['email_or_group']
    repo_id = form.cleaned_data['repo_id']
    permission = form.cleaned_data['permission']
    from_email = request.user.username

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    # Test whether user is the repo owner.
    if not validate_owner(request, repo_id):
        return render_permission_error(request, _(u'Only the owner of the library has permission to share it.'))

    share_to_list = string2list(email_or_group)
    share_to_all, share_to_group_names, share_to_users = False, [], []
    for share_to in share_to_list:
        if share_to == 'all':
            share_to_all = True
        elif share_to.find('@') == -1:
            share_to_group_names.append(share_to)
        else:
            share_to_users.append(share_to)

    share_to_groups = []
    # get all personal groups
    for group in seaserv.get_personal_groups_by_user(from_email):
        # for every group that user joined, if group name matchs,
        # then has find the group
        if group.group_name in share_to_group_names:
            share_to_groups.append(group)

    # Check whether this user has enough quota when cal_share_usage is enabled.
    # share_usage = repo_size * union(share_to_users + members_of(share_to_groups))
    if seaserv.CALC_SHARE_USAGE:
        clone = list(share_to_users)
        for group in share_to_groups:
            clone += [ e.user_name for e in seaserv.get_group_members(group.id)]
        clone = set(clone)
        # Since that user is also in share_to_users when called
        # ``get_group_members``, so need to minus one when counting.
        share_usage = seaserv.server_repo_size(repo.id) * (len(clone) - 1)
        # check quota usage
        quota = seaserv.get_user_quota(from_email)
        quota_usage = seaserv.get_user_quota_usage(from_email)
        current_share_usage = seaserv.get_user_share_usage(from_email)
        if share_usage + quota_usage + current_share_usage > quota:
            messages.error(request, _('Failed to share "%s", no enough quota. <a href="http://seafile.com/">Upgrade account.</a>') % repo.name)
            return HttpResponseRedirect(reverse('myhome'))

    ''' Share to public '''
    if share_to_all:
        # ignore 'all' if we're running in cloud mode
        if not CLOUD_MODE:
            try:
                seafserv_threaded_rpc.set_inner_pub_repo(repo_id, permission)
            except:
                messages.error(request, _(u'Failed to share to all members'))
            else:
                msg = _(u'Shared to all members successfully, go check it at <a href="%s">Share</a>.') % \
                    (reverse('share_admin'))
                messages.success(request, msg)

    ''' Share to groups '''
    for group in share_to_groups:
        from seahub.group.views import add_group_repo
        try:
            add_group_repo(request, repo_id, int(group.id), from_email,
                           permission)
        except Exception, e:
            logger.error(e)
            msg = _(u'Failed to share %(repo)s to %(group)s, please try again later.') % \
                {'repo': repo.name, 'group': group.group_name}
            messages.error(request, msg)
        else:
            members = get_group_members(group.id)
            
            for email in members:
                message = UserMessage()
                message.to_email = email
                message.from_email = request.user.username
                message.message = "(by system) %s have shared repo <a href='%s%s'>%s</a> to you." %(sender, head_of_repo_url +'repo/',repo.id,repo.name)  
                message.ifread = 0
                message.save()
            msg = _(u'Shared to %(group)s successfully，go check it at <a href="%(share)s">Share</a>.') % \
            {'group':group.group_name, 'share':reverse('share_admin')}
            messages.success(request, msg)
    
    ''' Share to users '''
    for email in share_to_users:
        # Add email to contacts.
        mail_sended.send(sender=None, user=request.user.username, email=email)
        if not is_registered_user(email):
            # Generate shared link and send mail if user has not registered.
            # is_encrypted = True if repo.encrypted else False
            # kwargs = {'repo_id': repo_id,
            #           'repo_owner': from_email,
            #           'anon_email': email,
            #           'is_encrypted': is_encrypted,
            #           }
            # anonymous_share(request, **kwargs)
            msg = _(u'Failed to share to %s, as the email is not registered.') % email
            messages.add_message(request, messages.ERROR, msg)
            continue
        else:
            # Record share info to db.
            try:
                seafserv_threaded_rpc.add_share(repo_id, from_email, email,
                                                permission)
            except SearpcError, e:
                msg = _(u'Failed to share to %s .') % email
                messages.add_message(request, messages.ERROR, msg)
                continue
            #send message when share repo
            message = UserMessage()
            message.to_email = email
            message.from_email = request.user.username
            message.message = "(by system) %s have shared repo <a href='%s%s'>%s</a> to you." %(sender, head_of_repo_url +'repo/',repo.id,repo.name)           
            message.ifread = 0
            message.save()
            msg = _(u'Shared to %(email)s successfully，go check it at <a href="%(share)s">Share</a>.') % \
                {'email':email, 'share':reverse('share_admin')}
            messages.add_message(request, messages.INFO, msg)
    return HttpResponseRedirect(reverse('myhome'))

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

@login_required
def share_admin(request):
    """
    List personal shared repos and shared links.
    """
    username = request.user.username

    shared_repos = []

    # personal repos shared by this user
    shared_repos += list_share_repos(username, 'from_email', -1, -1)

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

    # Repo anonymous share links
    # out_links = AnonymousShare.objects.filter(repo_owner=request.user.username)
    # for link in out_links:
    #     repo = get_repo(link.repo_id)
    #     link.repo_name = repo.name
    #     link.remain_time = anon_share_token_generator.get_remain_time(link.token)        

    # Shared links
    fileshares = FileShare.objects.filter(username=username)
    p_fileshares = []           # personal file share
    for fs in fileshares:
        if is_personal_repo(fs.repo_id):  # only list files in personal repos
            if fs.s_type == 'f':
                fs.filename = os.path.basename(fs.path)
                fs.shared_link = gen_shared_link(request, fs.token, 'f') 
            else:
                fs.filename = os.path.basename(fs.path[:-1])
                fs.shared_link = gen_shared_link(request, fs.token, 'd')
            r = get_repo(fs.repo_id)
            if not r:           # get_repo may returns None
                continue
            fs.repo = r
            p_fileshares.append(fs)
        
    return render_to_response('repo/share_admin.html', {
            "org": None,
            "shared_repos": shared_repos,
            # "out_links": out_links,
            "fileshares": p_fileshares,
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

def anonymous_share(request, email_template_name='repo/anonymous_share_email.html', **kwargs):
    repo_id = kwargs['repo_id']
    repo_owner = kwargs['repo_owner']
    anon_email = kwargs['anon_email']
    is_encrypted = kwargs['is_encrypted']

    # Encrypt repo can not be shared to unregistered user.
    if is_encrypted:
        msg = _(u'Failed to share to %s, as encrypted libraries cannot be shared to emails outside the site.') % anon_email
        messages.error(request, msg)
        return
    
    token = anon_share_token_generator.make_token()

    anon_share = AnonymousShare()
    anon_share.repo_owner = repo_owner
    anon_share.repo_id = repo_id
    anon_share.anonymous_email = anon_email
    anon_share.token = token

    try:
        anon_share.save()
    except:
        msg = _(u'Failed to share to %s.') % anon_email
        messages.add_message(request, messages.ERROR, msg)
    else:
        # send mail
        use_https = request.is_secure()
        site_name = domain = RequestSite(request).domain

        t = loader.get_template(email_template_name)
        c = {
            'email': repo_owner,
            'anon_email': anon_email,
            'domain': domain,
            'site_name': site_name,
            'token': token,
            'protocol': use_https and 'https' or 'http',
            }

        try:
            send_mail(_(u'You are shared with a library in Seafile'), t.render(Context(c)), None,
                      [anon_email], fail_silently=False)
        except:
            AnonymousShare.objects.filter(token=token).delete()
            msg = _(u'Failed to share to %s.') % anon_email
            messages.add_message(request, messages.ERROR, msg)
        else:
            msg = _(u'Shared to %(email)s successfully, go check it at <a href="%(share)s">Share</a>.') % \
                    {'email':anon_email, 'share':reverse('share_admin')}
            messages.add_message(request, messages.INFO, msg)

def anonymous_share_confirm(request, token=None):
    assert token is not None # checked by URLconf

    # Check whether token in db
    try:
        anon_share = AnonymousShare.objects.get(token=token)
    except AnonymousShare.DoesNotExist:
        raise Http404
    else:
        res = HttpResponseRedirect(reverse('repo', args=[anon_share.repo_id]))
        res.set_cookie("anontoken", token,
                       max_age=ANONYMOUS_SHARE_COOKIE_TIMEOUT)
        return res

def remove_anonymous_share(request, token):
    AnonymousShare.objects.filter(token=token).delete() 

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = reverse('share_admin')

    messages.add_message(request, messages.INFO, _(u'Deleted successfully.'))
    
    return HttpResponseRedirect(next)

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

    shared_link = gen_shared_link(request, token, fs.s_type)

    data = json.dumps({'token': token, 'shared_link': shared_link})
    return HttpResponse(data, status=200, content_type=content_type)

@login_required
def remove_shared_link(request):
    """
    Handle request to remove file shared link.
    """
    token = request.GET.get('t', '')
    
    if not request.is_ajax():
        FileShare.objects.filter(token=token).delete()
        next = request.META.get('HTTP_REFERER', None)
        if not next:
            next = reverse('share_admin')

        messages.success(request, _(u'Removed successfully'))
        
        return HttpResponseRedirect(next)

    content_type = 'application/json; charset=utf-8'
    
    FileShare.objects.filter(token=token).delete()

    msg = _('Deleted successfully')
    data = json.dumps({'msg': msg})
    return HttpResponse(data, status=200, content_type=content_type)
    
@login_required
def send_shared_link(request):
    """
    Handle ajax post request to send file shared link.
    """
    if not request.is_ajax() and not request.method == 'POST':
        raise Http404

    result = {}
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

