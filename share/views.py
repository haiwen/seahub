# encoding: utf-8
import os
import simplejson as json
from django.core.mail import send_mail
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response
from django.template import Context, loader, RequestContext

from auth.decorators import login_required
from django.contrib import messages
from django.contrib.sites.models import Site, RequestSite
from pysearpc import SearpcError
from seaserv import seafserv_threaded_rpc, get_repo, ccnet_rpc, \
    ccnet_threaded_rpc, get_personal_groups, list_personal_shared_repos, \
    is_personal_repo

from forms import RepoShareForm
from models import AnonymousShare
from settings import ANONYMOUS_SHARE_COOKIE_TIMEOUT
from tokens import anon_share_token_generator
from seahub.contacts.signals import mail_sended
from seahub.share.models import FileShare
from seahub.views import validate_owner, is_registered_user
from seahub.utils import render_permission_error, string2list

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False

@login_required
def share_repo(request):
    """
    Handle repo share request
    """
    if request.method != 'POST':
        raise Http404
    
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

    is_encrypted = True if repo.encrypted else False
        
    # Test whether user is the repo owner.
    if not validate_owner(request, repo_id):
        return render_permission_error(request, u'只有资料库拥有者有权共享该资料库')
    
    to_email_list = string2list(email_or_group)
    for to_email in to_email_list:
        if to_email == 'all':
            ''' Share to public '''

            # ignore 'all' if we're running in cloud mode
            if not CLOUD_MODE:
                try:
                    seafserv_threaded_rpc.set_inner_pub_repo(repo_id, permission)
                except:
                    msg = u'共享到公共资料失败'
                    message.add_message(request, message.ERROR, msg)
                    continue

                msg = u'共享公共资料成功，请前往<a href="%s">共享管理</a>查看。' % \
                    (reverse('share_admin'))
                messages.add_message(request, messages.INFO, msg)
                
        elif to_email.find('@') == -1:
            ''' Share repo to group '''
            # TODO: if we know group id, then we can simplly call group_share_repo
            group_name = to_email

            # get all personal groups
            groups = get_personal_groups(-1, -1)
            find = False
            for group in groups:
                # for every group that user joined, if group name matchs,
                # then has find the group
                if group.props.group_name == group_name:
                    from seahub.group.views import group_share_repo
                    group_share_repo(request, repo_id, int(group.props.id),
                                     from_email, permission)
                    find = True
                    msg = u'共享到 %s 成功，请前往<a href="%s">共享管理</a>查看。' % \
                        (group_name, reverse('share_admin'))
                    
                    messages.add_message(request, messages.INFO, msg)
                    break
            if not find:
                msg = u'共享到 %s 失败，群组不存在。' % group_name
                messages.add_message(request, messages.ERROR, msg)
        else:
            ''' Share repo to user '''
            # Add email to contacts.
            mail_sended.send(sender=None, user=request.user.username,
                             email=to_email)

            # Record share info to db.
            try:
                seafserv_threaded_rpc.add_share(repo_id, from_email, to_email,
                                                permission)
            except SearpcError, e:
                msg = u'共享给 %s 失败。' % to_email
                messages.add_message(request, messages.ERROR, msg)
                continue
            
            if not is_registered_user(to_email):
                # Generate shared link and send mail if user has not registered.
                # kwargs = {'repo_id': repo_id,
                #           'repo_owner': from_email,
                #           'anon_email': to_email,
                #           'is_encrypted': is_encrypted,
                #           }
                # anonymous_share(request, **kwargs)
                msg = u'共享给 %s 失败，用户未注册。' % to_email
                messages.add_message(request, messages.ERROR, msg)
                continue
            else:
                msg = u'共享给 %s 成功，请前往<a href="%s">共享管理</a>查看。' % \
                    (to_email, reverse('share_admin'))
                messages.add_message(request, messages.INFO, msg)
               
    return HttpResponseRedirect(reverse('myhome'))

@login_required
def share_admin(request):
    """
    List personal repos I share to others, include groups and users.
    """
    username = request.user.username

    shared_repos = []

    # personal repos shared by this user
    shared_repos += seafserv_threaded_rpc.list_share_repos(username, 'from_email',
                                                           -1, -1)

    # repos shared to groups
    group_repos = seafserv_threaded_rpc.get_group_repos_by_owner(username)
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
        pub_repos = seafserv_threaded_rpc.list_inner_pub_repos_by_owner(username)
        for repo in pub_repos:
            repo.props.user = '所有人'
            repo.props.user_info = 'all'
        shared_repos += pub_repos

    for repo in shared_repos:
        if repo.props.permission == 'rw':
            repo.share_permission = '可读写'
        elif repo.props.permission == 'r':
            repo.share_permission = '只可浏览'
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

    # File shared links
    fileshares = FileShare.objects.filter(username=username)
    p_fileshares = []           # personal file share
    for fs in fileshares:
        if is_personal_repo(fs.repo_id):
            # only list files in personal repos
            fs.filename = os.path.basename(fs.path)
            fs.repo = get_repo(fs.repo_id)
            p_fileshares.append(fs)
        
    return render_to_response('repo/share_admin.html', {
            "org": None,
            "shared_repos": shared_repos,
            # "out_links": out_links,
            "fileshares": p_fileshares,
            "protocol": request.is_secure() and 'https' or 'http',
            "domain": RequestSite(request).domain,
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
            return HttpResponse(json.dumps({'success': False}), content_type=content_type)
        return HttpResponse(json.dumps({'success': True}), content_type=content_type)

    if share_type == 'group':
        try:
            seafserv_threaded_rpc.set_group_repo_permission(int(email_or_group), repo_id, permission)
        except:
            return HttpResponse(json.dumps({'success': False}), content_type=content_type)
        return HttpResponse(json.dumps({'success': True}), content_type=content_type)

    if share_type == 'public':
        try:
            seafserv_threaded_rpc.set_inner_pub_repo(repo_id, permission)
        except:
            return HttpResponse(json.dumps({'success': False}), content_type=content_type)
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
        msg = u'共享给 %s 失败，加密资料库无法共享给站外邮箱。' % anon_email
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
        msg = u'共享给 %s 失败。' % anon_email
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
            send_mail(u'您在SeaCloud上收到一个资料库', t.render(Context(c)), None,
                      [anon_email], fail_silently=False)
        except:
            AnonymousShare.objects.filter(token=token).delete()
            msg = u'共享给 %s 失败。' % anon_email
            messages.add_message(request, messages.ERROR, msg)
        else:
            msg = u'共享给 %s 成功，请前往<a href="%s">共享管理</a>查看。' % \
                (anon_email, reverse('share_admin'))
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

    messages.add_message(request, messages.INFO, u'删除成功')
    
    return HttpResponseRedirect(next)

