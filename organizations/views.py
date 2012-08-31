# encoding: utf-8
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

from auth.decorators import login_required
from pysearpc import SearpcError
from seaserv import ccnet_threaded_rpc, seafserv_threaded_rpc, \
    get_orgs_by_user, get_org_repos, list_org_inner_pub_repos, \
    get_org_by_url_prefix, create_org, get_user_current_org, add_org_user, \
    remove_org_user, get_org_groups, is_valid_filename, \
    create_org_repo, get_org_id_by_group

from decorators import org_staff_required
from forms import OrgCreateForm
from signals import org_user_added
from notifications.models import UserNotification
from registration.models import RegistrationProfile
from seahub.base.accounts import User
from seahub.contacts import Contact
from seahub.forms import RepoCreateForm
import seahub.settings as seahub_settings
from seahub.utils import render_error, render_permission_error, gen_token, \
    validate_group_name, string2list, calculate_repo_last_modify,\
    MAX_INT
from seahub.views import myhome

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
                    reverse(org_info, args=[url_prefix]))
            except SearpcError, e:
                return render_error(request, e.msg)
            
    else:
        form = OrgCreateForm()

    return render_to_response('organizations/create_org.html', {
            'form': form,
            }, context_instance=RequestContext(request))

@login_required
def org_info(request, url_prefix):
    """
    Show org info page, list org inner pub repos.
    """
    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(myhome))

    # ctx_dict = {'base_template': 'org_base.html',
    #             'org_dict': org._dict}
    # set_cur_ctx(request, ctx_dict)
    
    org_members = ccnet_threaded_rpc.get_org_emailusers(url_prefix,
                                                        0, MAX_INT)
    repos = list_org_inner_pub_repos(org.org_id)

    return render_to_response('organizations/org_info.html', {
            'org': org,
            'org_users': org_members,
            'repos': repos,
            'url': reverse(org_inner_pub_repo_create, args=[url_prefix]),
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

    groups = get_org_groups(org.org_id, 0, MAX_INT)
    
    return render_to_response('organizations/personal.html', {
            'owned_repos': owned_repos,
            'url': reverse('org_repo_create', args=[url_prefix]),
            'org': org,
            'groups': groups,
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

    form = RepoCreateForm(request.POST)
    if form.is_valid():
        repo_name = form.cleaned_data['repo_name']
        repo_desc = form.cleaned_data['repo_desc']
        passwd = form.cleaned_data['passwd']
        user = request.user.username
        org = get_user_current_org(request.user.username, url_prefix)
        if not org:
            return HttpResponse(json.dumps(u'创建目录失败：未加入该团体'),
                                content_type=content_type)
        
        try:
            # create a org repo 
            repo_id = create_org_repo(repo_name, repo_desc, user, passwd,
                                      org.org_id)
            # set org inner pub
            seafserv_threaded_rpc.set_org_inner_pub_repo(org.org_id, repo_id)
        except:
            repo_id = None
        if not repo_id:
            result['error'] = u"创建目录失败"
        else:
            result['success'] = True
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)
    
@login_required
def org_groups(request, url_prefix):
    """
    List org groups and add org group.
    """
    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(myhome))

    if request.method == 'POST':
        group_name = request.POST.get('group_name')
        if not validate_group_name(group_name):
            return render_error(request, u'小组名称只能包含中英文字符，数字及下划线',
                                extra_ctx={
                    'org': org,
                    'base_template': 'org_base.html',
                    })
        
        try:
            group_id = ccnet_threaded_rpc.create_group(group_name.encode('utf-8'),
                                   request.user.username)
            ccnet_threaded_rpc.add_org_group(org.org_id, group_id)
        except SearpcError, e:
            error_msg = e.msg
            return render_error(request, error_msg, extra_ctx={
                    'org': org,
                    'base_template': 'org_base.html',
                    })
        
    groups = get_org_groups(org.org_id, 0, MAX_INT)
    return render_to_response('organizations/org_groups.html', {
            'org': org,
            'groups': groups,
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
        }
    
    try:
        send_mail(u'SeaCloud注册信息', t.render(Context(c)),
                  None, [email], fail_silently=False)
        messages.add_message(request, messages.INFO, email)
    except:
        messages.add_message(request, messages.ERROR, email)
    
@login_required
@org_staff_required
def org_useradmin(request, url_prefix):
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

    users_plus_one = ccnet_threaded_rpc.get_org_emailusers(\
        url_prefix, per_page * (current_page - 1), per_page + 1)
    if len(users_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False
        
    users = users_plus_one[:per_page]
    for user in users:
        if user.props.id == request.user.id:
            user.is_self = True

    # My contacts
    contacts = Contact.objects.filter(user_email=request.user.username)
            
    return render_to_response(
        'organizations/org_useradmin.html', {
            'users': users,
            'contacts': contacts,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
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

    return HttpResponseRedirect(reverse('org_useradmin', args=[url_prefix]))

def org_msg(request):
    """
    Show organization user added messages.
    """
    orgmsg_list = []
    notes = UserNotification.objects.filter(to_user=request.user.username)
    for n in notes:
        if n.msg_type == 'org_msg':
            orgmsg_list.append(n.detail)

    # remove new org msg notification
    UserNotification.objects.filter(to_user=request.user.username,
                                    msg_type='org_msg').delete()

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
            return HttpResponse(json.dumps(u'创建目录失败：未加入该团体'),
                                content_type=content_type)

        repo_id = create_org_repo(repo_name, repo_desc, user, passwd,
                                  org.org_id)
        if not repo_id:
            result['error'] = u"创建目录失败"
        else:
            result['success'] = True
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
        return render_permission_error(request, '该小组不属于当前团体')

    try:
        ccnet_threaded_rpc.remove_group(group_id_int, request.user.username)
        seafserv_threaded_rpc.remove_repo_group(group_id_int, None)
        ccnet_threaded_rpc.remove_org_group(org_id, group_id_int)
    except SearpcError, e:
        return render_error(request, e.msg)
        
    return HttpResponseRedirect(next)
