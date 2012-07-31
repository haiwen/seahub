# encoding: utf-8
import os
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
    ccnet_threaded_rpc

from forms import RepoShareForm
from models import AnonymousShare
from settings import ANONYMOUS_SHARE_COOKIE_TIMEOUT
from tokens import anon_share_token_generator
from seahub.contacts.signals import mail_sended
from seahub.share.models import FileShare
from seahub.views import validate_owner, validate_emailuser
from seahub.utils import render_permission_error, emails2list

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
    from_email = request.user.username

    # Test whether user is the repo owner
    if not validate_owner(request, repo_id):
        return render_permission_error(request, u'只有目录拥有者有权共享目录')
    
    to_email_list = emails2list(email_or_group)
    for to_email in to_email_list:
        # if to_email is user name, the format is: 'example@mail.com';
        # if to_email is group, the format is 'group_name <creator@mail.com>'
        if (to_email.split(' ')[0].find('@') == -1):
            ''' Share repo to group '''
            # TODO: if we know group id, then we can simplly call group_share_repo
            if len(to_email.split(' ')) < 2:
                messages.add_message(request, messages.ERROR, to_email)
                continue
            
            group_name = to_email.split(' ')[0]
            group_creator = to_email.split(' ')[1]
            # get all the groups the user joined
            groups = ccnet_threaded_rpc.get_groups(request.user.username)
            find = False
            for group in groups:
                # for every group that user joined, if group name and
                # group creator matchs, then has find the group
                if group.props.group_name == group_name and \
                        group_creator.find(group.props.creator_name) >= 0:
                    from seahub.group.views import group_share_repo
                    group_share_repo(request, repo_id, int(group.props.id),
                                     from_email)
                    find = True
                    messages.add_message(request, messages.INFO, group_name)
                    break
            if not find:
                messages.add_message(request, messages.ERROR, group_name)
        else:
            ''' Share repo to user '''
            # Add email to contacts.
            mail_sended.send(sender=None, user=request.user.username,
                             email=to_email)

            # Record share info to db.
            try:
                seafserv_threaded_rpc.add_share(repo_id, from_email, to_email,
                                                'rw')
            except SearpcError, e:
                messages.add_message(request, messages.ERROR, to_email)
                continue
            
            if not validate_emailuser(to_email):
                # Generate shared link and send mail if user has not registered.
                kwargs = {'repo_id': repo_id,
                          'repo_owner': from_email,
                          'anon_email': to_email
                          }
                anonymous_share(request, **kwargs)
            else: 
                messages.add_message(request, messages.INFO, to_email)
               
    return HttpResponseRedirect(reverse('myhome'))

@login_required
def share_admin(request):
    """
    List repos I share to others, include groups and users. And also list
    file shared links I generated.
    """
    username = request.user.username

    # repos that are share to user
    out_repos = seafserv_threaded_rpc.list_share_repos(username, 'from_email',
                                                       -1, -1)

    # repos that are share to groups
    group_repos = seafserv_threaded_rpc.get_group_my_share_repos(request.user.username)
    for group_repo in group_repos:
        repo_id = group_repo.props.repo_id
        if not repo_id:
            continue
        repo = get_repo(repo_id)
        if not repo:
            continue
        group_id = group_repo.props.group_id
        group = ccnet_threaded_rpc.get_group(int(group_id))
        if not group:
            continue
        repo.props.shared_email = group.props.group_name
        repo.gid = group_id
        
        out_repos.append(repo)

    # Repo anonymous share links
    # out_links = AnonymousShare.objects.filter(repo_owner=request.user.username)
    # for link in out_links:
    #     repo = get_repo(link.repo_id)
    #     link.repo_name = repo.name
    #     link.remain_time = anon_share_token_generator.get_remain_time(link.token)        

    # File shared links
    fileshares = FileShare.objects.filter(username=request.user.username)
    for fs in fileshares:
        fs.filename = os.path.basename(fs.path)
        fs.repo = get_repo(fs.repo_id)
        
    return render_to_response('repo/share_admin.html', {
            "out_repos": out_repos,
            # "out_links": out_links,
            "fileshares": fileshares,
            "protocol": request.is_secure() and 'https' or 'http',
            "domain": RequestSite(request).domain,
            }, context_instance=RequestContext(request))
    
# 2 views for anonymous share:
# - anonymous_share records share infomation to db and sends the mail
# - anonymous_share_confirm checks the link use clicked and
#   adds token to client COOKIE, then redirect client to repo page

def anonymous_share(request, email_template_name='repo/anonymous_share_email.html', **kwargs):
    repo_id = kwargs['repo_id']
    repo_owner = kwargs['repo_owner']
    anon_email = kwargs['anon_email']
    token = anon_share_token_generator.make_token()

    anon_share = AnonymousShare()
    anon_share.repo_owner = repo_owner
    anon_share.repo_id = repo_id
    anon_share.anonymous_email = anon_email
    anon_share.token = token

    try:
        anon_share.save()
    except:
        messages.add_message(request, messages.ERROR, kwargs['anon_email'])
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
            send_mail(u'您在SeaCloud上收到一个同步目录', t.render(Context(c)), None,
                      [anon_email], fail_silently=False)
        except:
            AnonymousShare.objects.filter(token=token).delete()
            messages.add_message(request, messages.ERROR, anon_email)
        else:
            messages.add_message(request, messages.INFO, anon_email)

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

    return HttpResponseRedirect(reverse('share_admin'))

