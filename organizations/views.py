# encoding: utf-8
import sys
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.template import RequestContext
from django.shortcuts import render_to_response

from auth.decorators import login_required
from pysearpc import SearpcError
from seaserv import ccnet_threaded_rpc, get_orgs_by_user, get_org_repos, \
    get_org_by_url_prefix, create_org, get_user_current_org

from forms import OrgCreateForm
from settings import ORG_CACHE_PREFIX
from utils import set_org_ctx
from seahub.views import myhome
from seahub.utils import go_error, go_permission_error, validate_group_name

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
        
    groups = ccnet_threaded_rpc.get_org_groups(org.org_id, 0, sys.maxint)
    return render_to_response('organizations/org_groups.html', {
            'org': org,
            'groups': groups,
            }, context_instance=RequestContext(request))

