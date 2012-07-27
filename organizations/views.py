# encoding: utf-8
import sys
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.core.mail import send_mail
from django.contrib.sites.models import Site, RequestSite
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response
from django.template import Context, loader, RequestContext

from auth.decorators import login_required
from pysearpc import SearpcError
from seaserv import ccnet_threaded_rpc, get_orgs_by_user, get_org_repos, \
    get_org_by_url_prefix, create_org, get_user_current_org, add_org_user, \
    get_ccnetuser, remove_org_user, get_org_groups

from forms import OrgCreateForm
from settings import ORG_CACHE_PREFIX
from utils import set_org_ctx
from registration.models import RegistrationProfile
import seahub.settings as seahub_settings
from seahub.utils import go_error, go_permission_error, validate_group_name, \
    emails2list, gen_token
from seahub.views import myhome


@login_required
def create_org(request):
    """
    
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
                return go_error(request, e.msg)
            
    else:
        form = OrgCreateForm()

    return render_to_response('organizations/create_org.html', {
            'form': form,
            }, context_instance=RequestContext(request))

@login_required
def change_account(request):
    """
    
    """
    orgs = get_orgs_by_user(request.user.username)
        
    return render_to_response('organizations/change_account.html', {
            'orgs': orgs,
            }, context_instance=RequestContext(request))

@login_required
def org_info(request, url_prefix):
    """
    """
    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(myhome))

    set_org_ctx(request, org._dict)
    
    org_members = ccnet_threaded_rpc.get_org_emailusers(url_prefix,
                                                        0, sys.maxint)
    repos = get_org_repos(org.org_id, 0, sys.maxint)
    return render_to_response('organizations/org_info.html', {
            'org': org,
            'org_users': org_members,
            'repos': repos,
            }, context_instance=RequestContext(request))

@login_required
def org_groups(request, url_prefix):
    """
    
    """
    org = get_user_current_org(request.user.username, url_prefix)
    if not org:
        return HttpResponseRedirect(reverse(myhome))

    if request.method == 'POST':
        group_name = request.POST.get('group_name')
        if not validate_group_name(group_name):
            return go_error(request, u'小组名称只能包含中英文字符，数字及下划线')
        
        try:
            group_id = ccnet_threaded_rpc.create_group(group_name.encode('utf-8'),
                                   request.user.username)
            ccnet_threaded_rpc.add_org_group(org.org_id, group_id)
        except SearpcError, e:
            error_msg = e.msg
            return go_error(request, error_msg)
        
    groups = get_org_groups(org.org_id, 0, sys.maxint)
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
def org_useradmin(request, url_prefix):
    """
    List and add org users.
    """
    if not request.user.org['is_staff']:
        raise Http404

    if request.method == 'POST':
        emails = request.POST.get('emails')

        email_list = emails2list(emails)
        for email in email_list:
            if not email or email.find('@') <= 0 :
                continue
            
            org_id = request.user.org['org_id']
            if get_ccnetuser(username=email):
                email = email.strip(' ')
                org_id = request.user.org['org_id']
                add_org_user(org_id, email, 0)
            else:
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

    url_prefix = request.user.org['url_prefix']
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
            
    return render_to_response(
        'organizations/org_useradmin.html', {
            'users': users,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

@login_required
def org_user_remove(request, user):
    """
    Remove org user
    """
    org_id = request.user.org['org_id']
    url_prefix = request.user.org['url_prefix']
    remove_org_user(org_id, user)

    return HttpResponseRedirect(reverse('org_useradmin', args=[url_prefix]))
