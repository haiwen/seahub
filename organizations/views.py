# encoding: utf-8
import os
import simplejson as json
import sys
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.core.mail import send_mail
from django.contrib.sites.models import Site, RequestSite
from django.http import HttpResponse, HttpResponseBadRequest, Http404, \
    HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import Context, loader, RequestContext
from django.utils.translation import ugettext as _

from auth.decorators import login_required
from pysearpc import SearpcError
from seaserv import ccnet_threaded_rpc, seafserv_rpc, seafserv_threaded_rpc, get_repo, \
    get_orgs_by_user, get_org_repos, list_org_inner_pub_repos, \
    get_org_by_url_prefix, create_org, get_user_current_org, add_org_user, \
    remove_org_user, get_org_groups, is_valid_filename, org_user_exists, \
    create_org_repo, get_org_id_by_group, get_org_groups_by_user, \
    get_org_users_by_url_prefix, list_org_shared_repos, is_personal_repo

from decorators import org_staff_required
from forms import OrgCreateForm
from signals import org_user_added
from utils import validate_org_repo_owner
from group.views import GroupListView
from notifications.models import UserNotification
from profile.models import Profile
from share.models import FileShare
from share.forms import RepoShareForm
from registration.models import RegistrationProfile
from base.accounts import User
from contacts import Contact
from seahub.forms import RepoCreateForm, SharedRepoCreateForm
import seahub.settings as seahub_settings
from seahub.utils import render_error, render_permission_error, gen_token, \
    validate_group_name, string2list, calculate_repo_last_modify, MAX_INT, \
    EVENTS_ENABLED, get_org_user_events, get_starred_files
from seahub.views import myhome
from seahub.signals import repo_created


@login_required
def create_org(request):
    """
    Create org account.
    """
    if request.method == 'POST':
        form = OrgCreateForm(request.POST)
        if form.is_valid():
            org_name = form.cleaned_data['org_name']
            url_prefix = form.cleaned_data['url_prefix']
            username = request.user.username
            
            try:
                # create_org(org_name, url_prefix, username)
                ccnet_threaded_rpc.create_org(org_name, url_prefix, username)
                return HttpResponseRedirect(\
                    reverse(org_personal, args=[url_prefix]))
            except SearpcError, e:
                return render_error(request, e.msg, extra_ctx={
                        'base_template': 'myhome_base.html',
                        })
            
    else:
        form = OrgCreateForm()

    return render_to_response('organizations/create_org.html', {
            'form': form,
            }, context_instance=RequestContext(request))

@login_required
def org_root(request, url_prefix):
    return HttpResponseRedirect(reverse(org_personal, args=[url_prefix]))
    
@login_required
def org_public(request, url_prefix):
    """
    Show org info page, list org inner pub repos.
    """
    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(myhome))

    repos = list_org_inner_pub_repos(org.org_id, request.user.username)

    return render_to_response('organizations/org_public.html', {
            'org': org,
            'repos': repos,
            'create_shared_repo': True,
            }, context_instance=RequestContext(request))

@login_required
def org_personal(request, url_prefix):
    """
    Show org personal page.
    """
    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(myhome))

    user = request.user.username

    # Org repos that I own
    owned_repos = seafserv_threaded_rpc.list_org_repos_by_owner(org.org_id,
                                                                user)
    calculate_repo_last_modify(owned_repos)
    owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))

    # Org repos others shared to me
    in_repos = list_org_shared_repos(org.org_id, user,'to_email', -1, -1)
    
    # Org groups user created
    groups = get_org_groups_by_user(org.org_id, user)

    # All org groups used in auto complete.
    org_groups = get_org_groups(org.org_id, -1, -1)
    
    # Org members used in auto complete
    contacts = []
    org_members = get_org_users_by_url_prefix(org.url_prefix, 0, MAX_INT)
    for m in org_members:
        if m.email == user:     # shouldn' show my'email in auto complete
            continue
        m.contact_email = m.email
        contacts.append(m)

    # Get nickname
    if not Profile.objects.filter(user=request.user.username):
        nickname = ''
    else:
        profile = Profile.objects.filter(user=request.user.username)[0]
        nickname = profile.nickname
        
    # events
    if EVENTS_ENABLED:
        events = get_org_user_events(org.org_id, user)
    else:
        events = None

    quota_usage = seafserv_threaded_rpc.get_org_user_quota_usage(org.org_id, user)
    starred_files = get_starred_files(user, org_id=org.org_id)
    
    return render_to_response('organizations/personal.html', {
            'owned_repos': owned_repos,
            "in_repos": in_repos,
            'org': org,
            'groups': groups,
            'org_groups': org_groups,
            'contacts': contacts,
            'create_shared_repo': False,
            'allow_public_share': True,
            'nickname': nickname,
            'events': events,
            'quota_usage': quota_usage,
            'starred_files': starred_files,
            }, context_instance=RequestContext(request))

@login_required
def org_inner_pub_repo_create(request, url_prefix):
    """
    Handle ajax post to create org inner pub repo, this repo is accessiable by
    all org members.
    """    
    if not request.is_ajax() or request.method != 'POST':
        return Http404

    result = {}
    content_type = 'application/json; charset=utf-8'

    form = SharedRepoCreateForm(request.POST)
    if form.is_valid():
        repo_name = form.cleaned_data['repo_name']
        repo_desc = form.cleaned_data['repo_desc']
        permission = form.cleaned_data['permission']
        passwd = form.cleaned_data['passwd']
        user = request.user.username
        org = get_user_current_org(request.user.username, url_prefix)
        if not org:
            return HttpResponse(json.dumps(u'创建失败：未加入该团体'),
                                content_type=content_type)
        
        try:
            # create a org repo 
            repo_id = create_org_repo(repo_name, repo_desc, user, passwd,
                                      org.org_id)
            # set org inner pub
            seafserv_threaded_rpc.set_org_inner_pub_repo(org.org_id, repo_id, permission)
        except:
            repo_id = None
        if not repo_id:
            result['error'] = u"创建失败"
        else:
            result['success'] = True
            repo_created.send(sender=None,
                              org_id=org.org_id,
                              creator=user,
                              repo_id=repo_id,
                              repo_name=repo_name)
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)

@login_required
def unset_org_inner_pub_repo(request, url_prefix, repo_id):
    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(org_public, args=[url_prefix]))
       
    try:
        seafserv_threaded_rpc.unset_org_inner_pub_repo(org.org_id, repo_id)
    except SearpcError:
        pass

    messages.add_message(request, messages.INFO, _('Operation Successful'))
    
    return HttpResponseRedirect(reverse(org_shareadmin, args=[url_prefix]))

@login_required
def org_groups(request, url_prefix):
    """
    List org groups and add org group.
    """
    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(myhome))

    if request.method == 'POST':
        result = {}
        content_type = 'application/json; charset=utf-8'
        
        group_name = request.POST.get('group_name')
        if not validate_group_name(group_name):
            result['error'] = _(u'Group name can only contain letters, numbers and underscore')
            return HttpResponse(json.dumps(result), content_type=content_type)
        
        try:
            e_grpname = group_name.encode('utf-8')
            user = request.user.username
            group_id = ccnet_threaded_rpc.create_org_group(org.org_id,
                                                           e_grpname,
                                                           user)
        except SearpcError, e:
            result['error'] = _(e.msg)
            return HttpResponse(json.dumps(result), content_type=content_type)
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)

    joined_groups = get_org_groups_by_user(org.org_id, request.user.username)
    groups = get_org_groups(org.org_id, -1, -1)
    org_members = get_org_users_by_url_prefix(url_prefix, 0, MAX_INT)
    
    return render_to_response('organizations/org_groups.html', {
            'org': org,
            'groups': groups,
            'joined_groups': joined_groups,
            'org_members': org_members, 
            }, context_instance=RequestContext(request))

def send_org_user_add_mail(request, email, password, org_name):
    """
    Send email when add new user.
    """
    use_https = request.is_secure()
    domain = RequestSite(request).domain
    
    t = loader.get_template('organizations/org_user_add_email.html')
    c = {
        'user': request.user.username,
        'org_name': org_name,
        'email': email,
        'password': password,
        'domain': domain,
        'protocol': use_https and 'https' or 'http',
        'site_name': seahub_settings.SITE_NAME,
        }

    try:
        send_mail(_(u'Seafile Login Information'), t.render(Context(c)),
                  None, [email], fail_silently=False)
        messages.add_message(request, messages.INFO, _(u'Sending mail Successfully'))
    except:
        messages.add_message(request, messages.ERROR, _(u'Failed to send email'))
    
@login_required
@org_staff_required
def org_admin(request, url_prefix):
    """
    List and add org users.
    """
    if request.method == 'POST':
        emails = request.POST.get('added-member-name')

        email_list = string2list(emails)
        for email in email_list:
            if not email or email.find('@') <= 0 :
                continue
            
            org_id = request.user.org['org_id']
            try:
                User.objects.get(email=email)
                email = email.strip(' ')
                org_id = request.user.org['org_id']
                add_org_user(org_id, email, 0)
                
                # send signal
                org_user_added.send(sender=None, org_id=org_id,
                                    from_email=request.user.username,
                                    to_email=email)
            except User.DoesNotExist:
                # User is not registered, just create account and
                # add that account to org
                password = gen_token(max_length=6)
                if Site._meta.installed:
                    site = Site.objects.get_current()
                else:
                    site = RequestSite(request)
                RegistrationProfile.objects.create_active_user(\
                    email, email, password, site, send_email=False)
                add_org_user(org_id, email, 0)
                if hasattr(seahub_settings, 'EMAIL_HOST'):
                    org_name = request.user.org['org_name']
                    send_org_user_add_mail(request, email, password, org_name)

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    users_plus_one = get_org_users_by_url_prefix(
        url_prefix, per_page * (current_page - 1), per_page + 1)
    if len(users_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(myhome))
        
    users = users_plus_one[:per_page]
    for user in users:
        if user.props.id == request.user.id:
            user.is_self = True
        try:
            user.quota_usage = seafserv_threaded_rpc.get_org_user_quota_usage(org.org_id, user.email)
        except:
            user.quota_usage = -1

    # My contacts
    contacts = Contact.objects.filter(user_email=request.user.username)

    org_quota_usage = seafserv_threaded_rpc.get_org_quota_usage(org.org_id)
    org_quota = seafserv_threaded_rpc.get_org_quota(org.org_id)
            
    return render_to_response(
        'organizations/org_admin.html', {
            'users': users,
            'contacts': contacts,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'org_quota_usage': org_quota_usage,
            'org_quota': org_quota,
        },
        context_instance=RequestContext(request))

@login_required
@org_staff_required
def org_user_remove(request, url_prefix, user):
    """
    Remove org user.
    """
    org_id = request.user.org['org_id']
    url_prefix = request.user.org['url_prefix']
    remove_org_user(org_id, user)

    messages.success(request, _(u"Successfully deleted member"))
    
    return HttpResponseRedirect(reverse('org_admin', args=[url_prefix]))

def org_msg(request):
    """
    Show organization user added messages.
    """
    orgmsg_list = []
    notes = UserNotification.objects.filter(to_user=request.user.username)
    for n in notes:
        if n.msg_type == 'org_join_msg':
            try:
                d = json.loads(n.detail)
                from_email = d['from_email']
                org_name = d['org_name']
                org_prefix = d['org_prefix']
                org_url = reverse('org_public', args=[org_prefix])
                
                msg = _(u'%(from_email)s added you to organization <a href="%(org_url)s">%(org_name)s</a>') % \
                {'from_email':from_email,
                 'org_url': org_url,
                 'org_name': org_name}
                orgmsg_list.append(msg)
            except json.decoder.JSONDecodeError:
                # This message is not json format, just list to user.
                orgmsg_list.append(n.detail)

    # remove new org msg notification
    UserNotification.objects.filter(to_user=request.user.username,
                                    msg_type='org_join_msg').delete()

    return render_to_response('organizations/new_msg.html', {
            'orgmsg_list': orgmsg_list,
            }, context_instance=RequestContext(request))

@login_required    
def org_repo_create(request, url_prefix):
    """
    Handle ajax post to create org repo, this repo is only accessiable by owner.
    """
    if not request.is_ajax() or request.method != 'POST':
        return Http404

    result = {}
    content_type = 'application/json; charset=utf-8'
    
    form = RepoCreateForm(request.POST)
    if form.is_valid():
        repo_name = form.cleaned_data['repo_name']
        repo_desc = form.cleaned_data['repo_desc']
        encrypted = form.cleaned_data['encryption']
        passwd = form.cleaned_data['passwd']
        passwd_again = form.cleaned_data['passwd_again']
        
        user = request.user.username
        org = get_user_current_org(request.user.username, url_prefix)
        if not org:
            return HttpResponse(json.dumps(u'创建失败：未加入该团体'),
                                content_type=content_type)

        repo_id = create_org_repo(repo_name, repo_desc, user, passwd,
                                  org.org_id)
        if not repo_id:
            result['error'] = u"创建失败"
        else:
            result['success'] = True
            repo_created.send(sender=None,
                              org_id=org.org_id,
                              creator=user,
                              repo_id=repo_id,
                              repo_name=repo_name)
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)

@login_required
@org_staff_required
def org_seafadmin(request, url_prefix):
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    repos_all = get_org_repos(request.user.org['org_id'],
                              per_page * (current_page -1),
                              per_page + 1)

    repos = repos_all[:per_page]

    if len(repos_all) == per_page + 1:
        page_next = True
    else:
        page_next = False
            
    return render_to_response(
        'organizations/org_seafadmin.html', {
            'repos': repos,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

@login_required
@org_staff_required
def org_group_admin(request, url_prefix):
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    groups_plus_one = get_org_groups (request.user.org['org_id'],
                                      per_page * (current_page -1),
                                      per_page +1)
        
    groups = groups_plus_one[:per_page]

    if len(groups_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    return render_to_response('organizations/org_group_admin.html', {
            'groups': groups,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            }, context_instance=RequestContext(request))

@login_required
@org_staff_required
def org_group_remove(request, url_prefix, group_id):
    # Request header may missing HTTP_REFERER, we need to handle that case.
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = seahub_settings.SITE_ROOT
        
    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(next)

    # Check whether is the org group.
    org_id = get_org_id_by_group(group_id_int)
    if request.user.org['org_id'] != org_id:
        return render_permission_error(request, '该群组不属于当前团体',
                                       extra_ctx={'org': request.user.org,
                                                  'base_template': 'org_base.html'})

    try:
        ccnet_threaded_rpc.remove_group(group_id_int, request.user.username)
        seafserv_threaded_rpc.remove_repo_group(group_id_int, None)
        ccnet_threaded_rpc.remove_org_group(org_id, group_id_int)
    except SearpcError, e:
        return render_error(request, e.msg, extra_ctx={
                'org': request.user.org,
                'base_template': 'org_base.html',
                })
        
    return HttpResponseRedirect(next)

@login_required
def org_repo_share(request, url_prefix):
    """
    Share org repo to members or groups in current org.
    """
    if request.method != 'POST':
        raise Http404

    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(myhome))
    
    form = RepoShareForm(request.POST)
    if not form.is_valid():
        # TODO: may display error msg on form 
        raise Http404
    
    email_or_group = form.cleaned_data['email_or_group']
    repo_id = form.cleaned_data['repo_id']
    permission = form.cleaned_data['permission']
    from_email = request.user.username

    # Test whether user is the repo owner
    if not validate_org_repo_owner(org.org_id, repo_id, request.user.username):
        return render_permission_error(request, u'只有资料库拥有者有权共享该资料库',
                                       extra_ctx={
                'org': org,
                'base_template': 'org_base.html',
                })

    share_to_list = string2list(email_or_group)
    for share_to in share_to_list:
        if share_to == 'all':
            ''' Share to public '''

            try:
                seafserv_threaded_rpc.set_org_inner_pub_repo(org.org_id,
                                                             repo_id, permission)
            except:
                msg = u'共享到公共资料失败'
                messages.add_message(request, messages.ERROR, msg)
                continue

            msg = u'共享公共资料成功，请前往<a href="%s">共享管理</a>查看。' % \
                (reverse('org_shareadmin', args=[org.url_prefix]))
            messages.add_message(request, messages.INFO, msg)
        elif (share_to.find('@') == -1):
            ''' Share repo to group '''
            # TODO: if we know group id, then we can simplly call group_share_repo
            group_name = share_to

            # Get all org groups.
            groups = get_org_groups(org.org_id, -1, -1)
            find = False
            for group in groups:
                # for every group that user joined, if group name and
                # group creator matchs, then has finded the group
                if group.props.group_name == group_name:
                    seafserv_threaded_rpc.add_org_group_repo(repo_id,
                                                             org.org_id,
                                                             group.id,
                                                             from_email,
                                                             permission)
                    find = True
                    msg = u'共享到 %s 成功，请前往<a href="%s">共享管理</a>查看。' % \
                        (group_name, reverse('org_shareadmin', args=[org.url_prefix]))
                    
                    messages.add_message(request, messages.INFO, msg)
                    break
            if not find:
                msg = u'共享到 %s 失败。' % group_name
                messages.add_message(request, messages.ERROR, msg)
        else:
            ''' Share repo to user '''
            # Test whether share_to is in this org
            if not org_user_exists(org.org_id, share_to):
                msg = u'共享给 %s 失败：团体中不存在该用户。' % share_to
                messages.add_message(request, messages.ERROR, msg)
                continue
                
            # Record share info to db.
            try:
                seafserv_threaded_rpc.add_share(repo_id, from_email, share_to,
                                                permission)
                msg = u'共享给 %s 成功，请前往<a href="%s">共享管理</a>查看。' % \
                    (share_to, reverse('org_shareadmin', args=[org.url_prefix]))
                messages.add_message(request, messages.INFO, msg)
            except SearpcError, e:
                msg = u'共享给 %s 失败。' % share_to
                messages.add_message(request, messages.ERROR, msg)
                continue
        
    return HttpResponseRedirect(reverse(org_personal, args=[org.url_prefix]))


@login_required
def org_shareadmin(request, url_prefix):
    """
    List personal repos I share to others, include groups and users.
    """
    username = request.user.username

    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(myhome))
    
    shared_repos = []

    # personal repos shared by this user
    shared_repos += seafserv_threaded_rpc.list_org_share_repos(org.org_id,
                                                               username,
                                                               'from_email',
                                                               -1, -1)

    # repos shared to groups
    group_repos = seafserv_threaded_rpc.get_org_group_repos_by_owner(org.org_id,
                                                                      username)
    for repo in group_repos:
        group = ccnet_threaded_rpc.get_group(int(repo.group_id))
        if not group:
            repo.props.user = ''
            continue
        repo.props.user = group.props.group_name
        repo.props.user_info = repo.group_id
    shared_repos += group_repos

    # public repos shared by this user
    pub_repos = seafserv_threaded_rpc.list_org_inner_pub_repos_by_owner(org.org_id,
                                                                        username)
    for repo in pub_repos:
        repo.props.user = '所有团体成员'
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

    # File shared links
    fileshares = FileShare.objects.filter(username=request.user.username)
    o_fileshares = []           # shared files in org repos
    for fs in fileshares:
        if not is_personal_repo(fs.repo_id):
            # only list files in org repos
            fs.filename = os.path.basename(fs.path)
            fs.repo = get_repo(fs.repo_id)
            o_fileshares.append(fs)

    request.base_template = 'org_base.html'
    
    return render_to_response('repo/share_admin.html', {
            "org": org,
            "shared_repos": shared_repos,
            "fileshares": o_fileshares,
            "protocol": request.is_secure() and 'https' or 'http',
            "domain": RequestSite(request).domain,
            }, context_instance=RequestContext(request))

@login_required
def org_share_permission_admin(request, url_prefix):
    org_id = int(request.GET.get('org_id', ''))
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
        group_id = int(email_or_group)
        try:
            seafserv_threaded_rpc.set_org_group_repo_permission(org_id, group_id, repo_id, permission)
        except:
            return HttpResponse(json.dumps({'success': False}), content_type=content_type)
        return HttpResponse(json.dumps({'success': True}), content_type=content_type)

    if share_type == 'public':
        try:
            seafserv_threaded_rpc.set_org_inner_pub_repo(org_id, repo_id, permission)
        except:
            return HttpResponse(json.dumps({'success': False}), content_type=content_type)
        return HttpResponse(json.dumps({'success': True}), content_type=content_type)

@login_required
def org_pubinfo(request, url_prefix):
    """
    Show org public information.
    """
    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(myhome))
    
    groups = get_org_groups(org.org_id, -1, -1)
    org_members = get_org_users_by_url_prefix(url_prefix, 0, MAX_INT)

    return render_to_response('organizations/org_pubinfo.html', {
            'org': org,
            'groups': groups,
            'org_members': org_members,
            }, context_instance=RequestContext(request))
