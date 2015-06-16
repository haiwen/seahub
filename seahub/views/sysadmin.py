# encoding: utf-8

import os
from types import FunctionType
import logging
import json
import re
import datetime
import csv, chardet, StringIO

from django.core.urlresolvers import reverse
from django.contrib import messages
from django.http import HttpResponse, Http404, HttpResponseRedirect, HttpResponseNotAllowed
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _

from seaserv import ccnet_threaded_rpc, seafserv_threaded_rpc, get_emailusers, \
    CALC_SHARE_USAGE, seafile_api, get_group, get_group_members
from pysearpc import SearpcError

from seahub.base.accounts import User
from seahub.base.models import UserLastLogin
from seahub.base.decorators import sys_staff_required
from seahub.base.sudo_mode import update_sudo_mode_ts
from seahub.auth import authenticate
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.constants import GUEST_USER, DEFAULT_USER
from seahub.utils import IS_EMAIL_CONFIGURED, string2list, is_valid_username, \
    is_pro_version
from seahub.utils.rpc import mute_seafile_api
from seahub.utils.licenseparse import parse_license
from seahub.views import get_system_default_repo_id
from seahub.forms import SetUserQuotaForm, AddUserForm, BatchAddUserForm
from seahub.profile.models import Profile, DetailedProfile
from seahub.share.models import FileShare, UploadLinkShare
import seahub.settings as settings
from seahub.settings import INIT_PASSWD, SITE_NAME, \
    SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER, SEND_EMAIL_ON_RESETTING_USER_PASSWD, \
    ENABLE_GUEST
from seahub.utils import send_html_email, get_user_traffic_list, \
    get_server_id, clear_token
from seahub.utils.rpc import mute_seafile_api
from seahub.utils.sysinfo import get_platform_name
try:
    from seahub.settings import ENABLE_TRIAL_ACCOUNT
except:
    ENABLE_TRIAL_ACCOUNT = False
if ENABLE_TRIAL_ACCOUNT:
    from seahub_extra.trialaccount.models import TrialAccount
try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

logger = logging.getLogger(__name__)


@login_required
@sys_staff_required
def sys_info(request):
    """System info(members, pro, ..) page.

    Arguments:
    - `request`:
    """
    try:
        users_count = ccnet_threaded_rpc.count_emailusers('DB') + ccnet_threaded_rpc.count_emailusers('LDAP')
    except Exception as e:
        logger.error(e)
        users_count = 0

    repos_count = mute_seafile_api.count_repos()

    try:
        groups_count = len(ccnet_threaded_rpc.get_all_groups(-1, -1))
    except Exception as e:
        logger.error(e)
        groups_count = 0

    if MULTI_TENANCY:
        try:
            org_count = ccnet_threaded_rpc.count_orgs()
        except Exception as e:
            logger.error(e)
            org_count = 0
    else:
        org_count = -1

    is_pro = is_pro_version()
    if is_pro:
        license_dict = parse_license('../seafile-license.txt')
    else:
        license_dict = {}
    return render_to_response('sysadmin/sys_info.html', {
        'users_count': users_count,
        'repos_count': repos_count,
        'groups_count': groups_count,
        'org_count': org_count,
        'is_pro': is_pro,
        'license_dict': license_dict,
    }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_repo_admin(request):
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    repos_all = seafile_api.get_repo_list(per_page * (current_page -1),
                                          per_page + 1)
    repos = repos_all[:per_page]
    if len(repos_all) == per_page + 1:
        page_next = True
    else:
        page_next = False

    for repo in repos:
        try:
            repo.owner = seafile_api.get_repo_owner(repo.id)
        except:
            repo.owner = "failed to get"

    return render_to_response(
        'sysadmin/sys_repo_admin.html', {
            'repos': repos,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_list_system(request):
    """List system repos.
    """
    repos = []
    sys_repo = seafile_api.get_repo(get_system_default_repo_id())
    repos.append(sys_repo)

    return render_to_response('sysadmin/sys_list_system.html', {
            'repos': repos,
            }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_repo_trash(request):
    """ List deleted repos (by owner) """

    search_owner = request.GET.get('name', '')
    if search_owner:
        if is_valid_username(search_owner):
            repos = seafserv_threaded_rpc.get_trash_repos_by_owner(search_owner)
            return render_to_response(
                    'sysadmin/sys_repo_trash.html', {
                    'repos': repos,
                    'search_owner': search_owner,
                }, context_instance=RequestContext(request))
        else:
            messages.error(request, _(u'Invalid username'))
            return HttpResponseRedirect(reverse('sys_repo_trash'))

    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    repos_all = seafserv_threaded_rpc.get_trash_repo_list(per_page * (current_page -1),
                                          per_page + 1)
    repos = repos_all[:per_page]
    if len(repos_all) == per_page + 1:
        page_next = True
    else:
        page_next = False

    return render_to_response(
            'sysadmin/sys_repo_trash.html', {
            'repos': repos,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_repo_trash_restore(request, repo_id):
    """Restore deleted repo by id"""

    referer = request.META.get('HTTP_REFERER', None)
    next = reverse('sys_repo_trash') if referer is None else referer

    try:
        seafserv_threaded_rpc.restore_repo_from_trash(repo_id)
        messages.success(request, _(u'Success'))
    except SearpcError, e:
        logger.error(e)
        messages.error(request, _(u'Failed'))

    return HttpResponseRedirect(next)

@login_required
@sys_staff_required
def sys_repo_trash_remove(request, repo_id):
    """Remove deleted repo by id"""

    referer = request.META.get('HTTP_REFERER', None)
    next = reverse('sys_repo_trash') if referer is None else referer

    try:
        seafserv_threaded_rpc.del_repo_from_trash(repo_id)
        messages.success(request, _(u'Success'))
    except SearpcError, e:
        logger.error(e)
        messages.error(request, _(u'Failed'))

    return HttpResponseRedirect(next)

@login_required
@sys_staff_required
def sys_repo_trash_clear(request):
    """Clear repo trash (by owner)"""

    next = reverse('sys_repo_trash')
    owner = request.GET.get('owner', '')
    try:
        if owner:
            if is_valid_username(owner):
                seafserv_threaded_rpc.empty_repo_trash_by_owner(owner)
            else:
                messages.error(request, _(u'Invalid username'))
                return HttpResponseRedirect(next)
        else:
            seafserv_threaded_rpc.empty_repo_trash()
    except SearpcError, e:
        logger.error(e)
        messages.error(request, _(u'Failed'))

    messages.success(request, _(u'Success'))
    return HttpResponseRedirect(next)

def list_repos_by_name_and_owner(repo_name, owner):
    repos = []
    owned_repos = seafile_api.get_owned_repo_list(owner)
    for repo in owned_repos:
        if repo_name in repo.name:
            repo.owner = owner
            repos.append(repo)
    return repos

def list_repos_by_name(repo_name):
    repos = []
    repos_all = seafile_api.get_repo_list(-1, -1)
    for repo in repos_all:
        if repo_name in repo.name:
            try:
                repo.owner = seafile_api.get_repo_owner(repo.id)
            except SearpcError:
                repo.owner = "failed to get"
            repos.append(repo)
    return repos

def list_repos_by_owner(owner):
    repos = seafile_api.get_owned_repo_list(owner)
    for e in repos:
        e.owner = owner
    return repos

@login_required
@sys_staff_required
def sys_repo_search(request):
    """Search a repo.
    """
    repo_name = request.GET.get('name', '')
    owner = request.GET.get('owner', '')
    repos = []

    if repo_name and owner : # search by name and owner
        repos = list_repos_by_name_and_owner(repo_name, owner)
    elif repo_name:     # search by name
        repos = list_repos_by_name(repo_name)
    elif owner:     # search by owner
        repos = list_repos_by_owner(owner)

    return render_to_response('sysadmin/sys_repo_search.html', {
            'repos': repos,
            'name': repo_name,
            'owner': owner,
            }, context_instance=RequestContext(request))

def _populate_user_quota_usage(user):
    """Populate space/share quota to user.

    Arguments:
    - `user`:
    """
    orgs = ccnet_threaded_rpc.get_orgs_by_user(user.email)
    try:
        if orgs:
            user.org = orgs[0]
            org_id = user.org.org_id
            user.space_usage = seafserv_threaded_rpc.get_org_user_quota_usage(org_id, user.email)
            user.space_quota = seafserv_threaded_rpc.get_org_user_quota(org_id, user.email)
            user.share_usage = user.share_quota = 0
        else:
            user.space_usage = seafile_api.get_user_self_usage(user.email)
            user.space_quota = seafile_api.get_user_quota(user.email)

            if CALC_SHARE_USAGE:
                user.share_quota = seafile_api.get_user_share_quota(user.email)
                user.share_usage = seafile_api.get_user_share_usage(user.email)
            else:
                user.share_usage = user.share_quota = 0
    except SearpcError as e:
        logger.error(e)
        user.space_usage = user.space_quota = user.share_usage = user.share_quota = -1

@login_required
@sys_staff_required
def sys_user_admin(request):
    """List all users from database.
    """
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25
    users_plus_one = get_emailusers('DB', per_page * (current_page - 1), per_page + 1)
    if len(users_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    users = users_plus_one[:per_page]
    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in users])
    if ENABLE_TRIAL_ACCOUNT:
        trial_users = TrialAccount.objects.filter(user_or_org__in=[x.email for x in users])
    else:
        trial_users = []
    for user in users:
        if user.props.id == request.user.id:
            user.is_self = True

        _populate_user_quota_usage(user)

        # check user's role
        if user.role == GUEST_USER:
            user.is_guest = True
        else:
            user.is_guest = False

        # populate user last login time
        user.last_login = None
        for last_login in last_logins:
            if last_login.username == user.email:
                user.last_login = last_login.last_login

        user.trial_info = None
        for trial_user in trial_users:
            if trial_user.user_or_org == user.email:
                user.trial_info = {'expire_date': trial_user.expire_date}

    have_ldap = True if len(get_emailusers('LDAP', 0, 1)) > 0 else False

    platform = get_platform_name()
    server_id = get_server_id()
    pro_server = 1 if is_pro_version() else 0

    return render_to_response(
        'sysadmin/sys_useradmin.html', {
            'users': users,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'CALC_SHARE_USAGE': CALC_SHARE_USAGE,
            'have_ldap': have_ldap,
            'platform': platform,
            'server_id': server_id[:8],
            'default_user': DEFAULT_USER,
            'guest_user': GUEST_USER,
            'enable_guest': ENABLE_GUEST,
            'pro_server': pro_server,
        }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_user_admin_ldap(request):
    """List all users from LDAP.
    """
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25
    users_plus_one = get_emailusers('LDAP', per_page * (current_page - 1), per_page + 1)
    if len(users_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    users = users_plus_one[:per_page]
    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in users])
    for user in users:
        if user.props.id == request.user.id:
            user.is_self = True

        _populate_user_quota_usage(user)

        # populate user last login time
        user.last_login = None
        for last_login in last_logins:
            if last_login.username == user.email:
                user.last_login = last_login.last_login

    return render_to_response(
        'sysadmin/sys_useradmin_ldap.html', {
            'users': users,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'enable_guest': ENABLE_GUEST,
            'CALC_SHARE_USAGE': CALC_SHARE_USAGE,
        },
        context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_user_admin_admins(request):
    """List all admins from database.
    """
    users = get_emailusers('DB', -1, -1)

    admin_users = []
    not_admin_users = []
    for user in users:
        if user.is_staff is True:
            admin_users.append(user)
        else:
            not_admin_users.append(user)

    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in admin_users])

    for user in admin_users:
        if user.props.id == request.user.id:
            user.is_self = True

        _populate_user_quota_usage(user)

        # check user's role
        if user.role == GUEST_USER:
            user.is_guest = True
        else:
            user.is_guest = False
        # populate user last login time
        user.last_login = None
        for last_login in last_logins:
            if last_login.username == user.email:
                user.last_login = last_login.last_login

    have_ldap = True if len(get_emailusers('LDAP', 0, 1)) > 0 else False

    return render_to_response(
        'sysadmin/sys_useradmin_admins.html', {
            'admin_users': admin_users,
            'not_admin_users': not_admin_users,
            'CALC_SHARE_USAGE': CALC_SHARE_USAGE,
            'have_ldap': have_ldap,
            'default_user': DEFAULT_USER,
            'guest_user': GUEST_USER,
            'enable_guest': ENABLE_GUEST,
        }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def user_info(request, email):
    owned_repos = mute_seafile_api.get_owned_repo_list(email)
    org_name = None
    space_quota = space_usage = 0
    share_quota = share_usage = 0

    org = ccnet_threaded_rpc.get_orgs_by_user(email)
    if not org:
        space_usage = mute_seafile_api.get_user_self_usage(email)
        space_quota = mute_seafile_api.get_user_quota(email)
        if CALC_SHARE_USAGE:
            share_usage = mute_seafile_api.get_user_share_usage(email)
            share_quota = mute_seafile_api.get_user_share_quota(email)
    else:
        org_id = org[0].org_id
        org_name = org[0].org_name
        space_usage = seafserv_threaded_rpc.get_org_user_quota_usage(org_id,
                                                                     email)
        space_quota = seafserv_threaded_rpc.get_org_user_quota(org_id, email)

    # Repos that are share to user
    in_repos = mute_seafile_api.get_share_in_repo_list(email, -1, -1)

    # get user profile
    profile = Profile.objects.get_profile_by_user(email)
    d_profile = DetailedProfile.objects.get_detailed_profile_by_user(email)

    user_shared_links = []
    # download links
    p_fileshares = []
    fileshares = list(FileShare.objects.filter(username=email))
    for fs in fileshares:
        try:
            r = seafile_api.get_repo(fs.repo_id)
            if not r:
                fs.delete()
                continue

            if fs.is_file_share_link():
                if seafile_api.get_file_id_by_path(r.id, fs.path) is None:
                    fs.delete()
                    continue

                fs.filename = os.path.basename(fs.path)
                path = fs.path.rstrip('/')  # Normalize file path
                obj_id = seafile_api.get_file_id_by_path(r.id, path)
                fs.file_size = seafile_api.get_file_size(r.store_id,
                                                         r.version, obj_id)
            else:
                if seafile_api.get_dir_id_by_path(r.id, fs.path) is None:
                    fs.delete()
                    continue

                fs.filename = os.path.basename(fs.path.rstrip('/'))
                path = fs.path
                if path[-1] != '/':         # Normalize dir path
                    path += '/'
                # get dir size
                dir_id = seafserv_threaded_rpc.get_dirid_by_path(r.id,
                                                                 r.head_cmmt_id,
                                                                 path)
                fs.dir_size = seafserv_threaded_rpc.get_dir_size(r.store_id,
                                                                 r.version,
                                                                 dir_id)

            fs.is_download = True
            p_fileshares.append(fs)
        except SearpcError as e:
            logger.error(e)
            continue
    p_fileshares.sort(key=lambda x: x.view_cnt, reverse=True)
    user_shared_links += p_fileshares

    # upload links
    uploadlinks = list(UploadLinkShare.objects.filter(username=email))
    p_uploadlinks = []
    for link in uploadlinks:
        try:
            r = seafile_api.get_repo(link.repo_id)
            if not r:
                link.delete()
                continue
            if seafile_api.get_dir_id_by_path(r.id, link.path) is None:
                link.delete()
                continue
            link.dir_name = os.path.basename(link.path.rstrip('/'))
            link.is_upload = True
            p_uploadlinks.append(link)
        except SearpcError as e:
            logger.error(e)
            continue
    p_uploadlinks.sort(key=lambda x: x.view_cnt, reverse=True)
    user_shared_links += p_uploadlinks

    return render_to_response(
        'sysadmin/userinfo.html', {
            'owned_repos': owned_repos,
            'space_quota': space_quota,
            'space_usage': space_usage,
            'share_quota': share_quota,
            'share_usage': share_usage,
            'CALC_SHARE_USAGE': CALC_SHARE_USAGE,
            'in_repos': in_repos,
            'email': email,
            'profile': profile,
            'd_profile': d_profile,
            'org_name': org_name,
            'user_shared_links': user_shared_links,
        }, context_instance=RequestContext(request))

@login_required_ajax
@sys_staff_required
def user_set_quota(request, email):
    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'
    result = {}

    f = SetUserQuotaForm(request.POST)
    if f.is_valid():
        email = f.cleaned_data['email']
        space_quota_mb = f.cleaned_data['space_quota']
        space_quota = space_quota_mb * (1 << 20)
        share_quota_mb = f.cleaned_data['share_quota']

        share_quota = None
        if share_quota_mb is not None:
            share_quota = share_quota_mb * (1 << 20)

        org = ccnet_threaded_rpc.get_orgs_by_user(email)
        try:
            if not org:
                seafile_api.set_user_quota(email, space_quota)
                if share_quota is not None:
                    seafile_api.set_user_share_quota(email, share_quota)
            else:
                org_id = org[0].org_id
                org_quota_mb = seafserv_threaded_rpc.get_org_quota(org_id) / (1 << 20)
                if space_quota_mb > org_quota_mb:
                    result['error'] = _(u'Failed to set quota: maximum quota is %d MB' % \
                                            org_quota_mb)
                    return HttpResponse(json.dumps(result), status=400, content_type=content_type)
                else:
                    seafserv_threaded_rpc.set_org_user_quota(org_id, email, space_quota)
        except:
            result['error'] = _(u'Failed to set quota: internal server error')
            return HttpResponse(json.dumps(result), status=500, content_type=content_type)

        result['success'] = True
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        result['error'] = str(f.errors.values()[0])
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

@login_required_ajax
@sys_staff_required
def sys_org_set_quota(request, org_id):
    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'
    result = {}

    org_id = int(org_id)
    quota_mb = int(request.POST.get('quota', 0))
    quota = quota_mb * (1 << 20)

    try:
        seafserv_threaded_rpc.set_org_quota(org_id, quota)
    except SearpcError as e:
        logger.error(e)
        result['error'] = _(u'Failed to set quota: internal server error')
        return HttpResponse(json.dumps(result), status=500, content_type=content_type)

    result['success'] = True
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required
@sys_staff_required
def user_remove(request, user_id):
    """Remove user"""
    referer = request.META.get('HTTP_REFERER', None)
    next = reverse('sys_useradmin') if referer is None else referer

    try:
        user = User.objects.get(id=int(user_id))
        org = ccnet_threaded_rpc.get_orgs_by_user(user.email)
        if org:
            if org[0].creator == user.email:
                messages.error(request, _(u'Failed to delete: the user is an organization creator'))
                return HttpResponseRedirect(next)

            org_id = org[0].org_id
            org_user_repos = seafile_api.get_org_owned_repo_list(org_id, user.email)
            for repo in org_user_repos:
                seafile_api.remove_repo(repo.id)

        user.delete()
        clear_token(user.email)
        messages.success(request, _(u'Successfully deleted %s') % user.username)
    except User.DoesNotExist:
        messages.error(request, _(u'Failed to delete: the user does not exist'))

    return HttpResponseRedirect(next)

@login_required
@sys_staff_required
def remove_trial(request, user_or_org):
    """Remove trial account.

    Arguments:
    - `request`:
    """
    if not ENABLE_TRIAL_ACCOUNT:
        raise Http404

    referer = request.META.get('HTTP_REFERER', None)
    next = reverse('sys_useradmin') if referer is None else referer

    TrialAccount.objects.filter(user_or_org=user_or_org).delete()

    messages.success(request, _('Successfully remove trial for: %s') % user_or_org)
    return HttpResponseRedirect(next)

@login_required
@sys_staff_required
def user_make_admin(request, user_id):
    """Set user as system admin."""
    try:
        user = User.objects.get(id=int(user_id))
        user.is_staff = True
        user.save()
        messages.success(request, _(u'Successfully set %s as admin') % user.username)
    except User.DoesNotExist:
        messages.error(request, _(u'Failed to set admin: the user does not exist'))

    referer = request.META.get('HTTP_REFERER', None)
    next = reverse('sys_useradmin') if referer is None else referer

    return HttpResponseRedirect(next)

@login_required
@sys_staff_required
def user_remove_admin(request, user_id):
    """Unset user admin."""
    try:
        user = User.objects.get(id=int(user_id))
        user.is_staff = False
        user.save()
        messages.success(request, _(u'Successfully revoke the admin permission of %s') % user.username)
    except User.DoesNotExist:
        messages.error(request, _(u'Failed to revoke admin: the user does not exist'))

    referer = request.META.get('HTTP_REFERER', None)
    next = reverse('sys_useradmin') if referer is None else referer

    return HttpResponseRedirect(next)

@login_required
@sys_staff_required
def user_activate(request, user_id):
    try:
        user = User.objects.get(id=int(user_id))
        user.is_active = True
        user.save()
        messages.success(request, _(u'Successfully activated "%s".') % user.email)
    except User.DoesNotExist:
        messages.success(request, _(u'Failed to activate: user does not exist.'))

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = reverse('sys_useradmin')

    return HttpResponseRedirect(next)

@login_required
@sys_staff_required
def user_deactivate(request, user_id):
    try:
        user = User.objects.get(id=int(user_id))
        user.is_active = False
        user.save()
        messages.success(request, _(u'Successfully deactivated "%s".') % user.email)
    except User.DoesNotExist:
        messages.success(request, _(u'Failed to deactivate: user does not exist.'))

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = reverse('sys_useradmin')

    return HttpResponseRedirect(next)

def email_user_on_activation(user):
    """Send an email to user when admin activate his/her account.
    """
    c = {
        'username': user.email,
        }
    send_html_email(_(u'Your account on %s is activated') % SITE_NAME,
            'sysadmin/user_activation_email.html', c, None, [user.email])

@login_required_ajax
@sys_staff_required
def user_toggle_status(request, email):
    content_type = 'application/json; charset=utf-8'

    if not is_valid_username(email):
        return HttpResponse(json.dumps({'success': False}), status=400,
                            content_type=content_type)

    try:
        user_status = int(request.GET.get('s', 0))
    except ValueError:
        user_status = 0

    try:
        user = User.objects.get(email)
        user.is_active = bool(user_status)
        user.save()

        if user.is_active is True:
            try:
                email_user_on_activation(user)
                email_sent = True
            except Exception as e:
                logger.error(e)
                email_sent = False

            return HttpResponse(json.dumps({'success': True,
                                            'email_sent': email_sent,
                                            }), content_type=content_type)
        else:
            clear_token(user.email)
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)
    except User.DoesNotExist:
        return HttpResponse(json.dumps({'success': False}), status=500,
                            content_type=content_type)

@login_required_ajax
@sys_staff_required
def user_toggle_role(request, email):
    content_type = 'application/json; charset=utf-8'

    if not is_valid_username(email):
        return HttpResponse(json.dumps({'success': False}), status=400,
                            content_type=content_type)

    if not ENABLE_GUEST:
        return HttpResponse(json.dumps({'success': False}), status=403,
                            content_type=content_type)

    try:
        user_role = request.GET.get('r', DEFAULT_USER)
    except ValueError:
        user_role = DEFAULT_USER

    try:
        user = User.objects.get(email)
        User.objects.update_role(user.email, user_role)

        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)
    except User.DoesNotExist:
        return HttpResponse(json.dumps({'success': False}), status=500,
                            content_type=content_type)

def send_user_reset_email(request, email, password):
    """
    Send email when reset user password.
    """

    c = {
        'email': email,
        'password': password,
        }
    send_html_email(_(u'Password has been reset on %s') % SITE_NAME,
            'sysadmin/user_reset_email.html', c, None, [email])

@login_required
@sys_staff_required
def user_reset(request, user_id):
    """Reset password for user."""
    try:
        user = User.objects.get(id=int(user_id))
        if isinstance(INIT_PASSWD, FunctionType):
            new_password = INIT_PASSWD()
        else:
            new_password = INIT_PASSWD
        user.set_password(new_password)
        user.save()
        clear_token(user.username)

        if IS_EMAIL_CONFIGURED:
            if SEND_EMAIL_ON_RESETTING_USER_PASSWD:
                try:
                    send_user_reset_email(request, user.email, new_password)
                    msg = _('Successfully reset password to %(passwd)s, an email has been sent to %(user)s.') % \
                        {'passwd': new_password, 'user': user.email}
                    messages.success(request, msg)
                except Exception, e:
                    logger.error(str(e))
                    msg = _('Successfully reset password to %(passwd)s, but failed to send email to %(user)s, please check your email configuration.') % \
                        {'passwd':new_password, 'user': user.email}
                    messages.success(request, msg)
            else:
                messages.success(request, _(u'Successfully reset password to %(passwd)s for user %(user)s.') % \
                                     {'passwd':new_password,'user': user.email})
        else:
            messages.success(request, _(u'Successfully reset password to %(passwd)s for user %(user)s. But email notification can not be sent, because Email service is not properly configured.') % \
                                 {'passwd':new_password,'user': user.email})
    except User.DoesNotExist:
        msg = _(u'Failed to reset password: user does not exist')
        messages.error(request, msg)

    referer = request.META.get('HTTP_REFERER', None)
    next = reverse('sys_useradmin') if referer is None else referer

    return HttpResponseRedirect(next)

def send_user_add_mail(request, email, password):
    """Send email when add new user."""
    c = {
        'user': request.user.username,
        'org': request.user.org,
        'email': email,
        'password': password,
        }
    send_html_email(_(u'You are invited to join %s') % SITE_NAME,
            'sysadmin/user_add_email.html', c, None, [email])

@login_required_ajax
def user_add(request):
    """Add a user"""

    if not request.user.is_staff or request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    post_values = request.POST.copy()
    post_email = request.POST.get('email', '')
    post_role = request.POST.get('role', DEFAULT_USER)
    post_values.update({
                        'email': post_email.lower(),
                        'role': post_role,
                      })

    form = AddUserForm(post_values)
    if form.is_valid():
        email = form.cleaned_data['email']
        role = form.cleaned_data['role']
        password = form.cleaned_data['password1']

        try:
            user = User.objects.create_user(email, password, is_staff=False,
                                            is_active=True)
        except User.DoesNotExist as e:
            logger.error(e)
            err_msg = _(u'Fail to add user %s.') % email
            return HttpResponse(json.dumps({'error': err_msg}), status=403, content_type=content_type)

        if user:
            User.objects.update_role(email, role)

        if request.user.org:
            org_id = request.user.org.org_id
            url_prefix = request.user.org.url_prefix
            ccnet_threaded_rpc.add_org_user(org_id, email, 0)
            if IS_EMAIL_CONFIGURED:
                try:
                    send_user_add_mail(request, email, password)
                    messages.success(request, _(u'Successfully added user %s. An email notification has been sent.') % email)
                except Exception, e:
                    logger.error(str(e))
                    messages.success(request, _(u'Successfully added user %s. An error accurs when sending email notification, please check your email configuration.') % email)
            else:
                messages.success(request, _(u'Successfully added user %s.') % email)

            return HttpResponse(json.dumps({'success': True}), content_type=content_type)
        else:
            if IS_EMAIL_CONFIGURED:
                if SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER:
                    try:
                        send_user_add_mail(request, email, password)
                        messages.success(request, _(u'Successfully added user %s. An email notification has been sent.') % email)
                    except Exception, e:
                        logger.error(str(e))
                        messages.success(request, _(u'Successfully added user %s. An error accurs when sending email notification, please check your email configuration.') % email)
                else:
                    messages.success(request, _(u'Successfully added user %s.') % email)
            else:
                messages.success(request, _(u'Successfully added user %s. But email notification can not be sent, because Email service is not properly configured.') % email)

            return HttpResponse(json.dumps({'success': True}), content_type=content_type)
    else:
        return HttpResponse(json.dumps({'error': str(form.errors.values()[0])}), status=400, content_type=content_type)

@login_required
@sys_staff_required
def sys_group_admin(request):
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    groups_plus_one = ccnet_threaded_rpc.get_all_groups(per_page * (current_page -1),
                                               per_page +1)

    groups = groups_plus_one[:per_page]
    for grp in groups:
        org_id = ccnet_threaded_rpc.get_org_id_by_group(int(grp.id))
        if org_id > 0:
            grp.org_id = org_id
            grp.org_name = ccnet_threaded_rpc.get_org_by_id(int(org_id)).org_name

    if len(groups_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    return render_to_response('sysadmin/sys_group_admin.html', {
            'groups': groups,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_admin_group_info(request, group_id):

    group_id = int(group_id)
    group = get_group(group_id)
    repos = seafile_api.get_repos_by_group(group_id)
    members = get_group_members(group_id)

    return render_to_response('sysadmin/sys_admin_group_info.html', {
            'group': group,
            'repos': repos,
            'members': members,
            }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_org_admin(request):
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    orgs_plus_one = ccnet_threaded_rpc.get_all_orgs(per_page * (current_page - 1),
                                                    per_page + 1)
    orgs = orgs_plus_one[:per_page]

    if ENABLE_TRIAL_ACCOUNT:
        trial_orgs = TrialAccount.objects.filter(user_or_org__in=[x.org_id for x in orgs])
    else:
        trial_orgs = []
    for org in orgs:
        org.quota_usage = seafserv_threaded_rpc.get_org_quota_usage(org.org_id)
        org.total_quota = seafserv_threaded_rpc.get_org_quota(org.org_id)

        org.trial_info = None
        for trial_org in trial_orgs:
            if trial_org.user_or_org == str(org.org_id):
                org.trial_info = {'expire_date': trial_org.expire_date}

    if len(orgs_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    return render_to_response('sysadmin/sys_org_admin.html', {
            'orgs': orgs,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_org_rename(request, org_id):

    if request.method != 'POST':
        raise Http404

    referer = request.META.get('HTTP_REFERER', None)
    next = reverse('sys_org_admin') if referer is None else referer

    new_name = request.POST.get('new_name', None)
    if new_name:
        try:
            ccnet_threaded_rpc.set_org_name(int(org_id), new_name)
            messages.success(request, _(u'Success'))
        except Exception as e:
            logger.error(e)
            messages.error(request, _(u'Failed to rename organization'))

    return HttpResponseRedirect(next)

@login_required_ajax
@sys_staff_required
def sys_org_set_member_quota(request, org_id):

    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    try:
        member_quota = int(request.POST.get('member_quota', '0'))
    except ValueError:
        return HttpResponse(json.dumps({ 'error': _('Input should be a number')}),
                            status=400, content_type=content_type)

    if member_quota > 0:
        from seahub_extra.organizations.models import OrgMemberQuota
        OrgMemberQuota.objects.set_quota(org_id, member_quota)
        messages.success(request, _(u'Success'))
        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=content_type)
    else:
        return HttpResponse(json.dumps({ 'error': _('Input number should be greater than 0')}),
                            status=400, content_type=content_type)

def sys_get_org_base_info(org_id):

    org = ccnet_threaded_rpc.get_org_by_id(org_id)

    # users
    users = ccnet_threaded_rpc.get_org_emailusers(org.url_prefix, -1, -1)
    users_count = len(users)

    # groups
    groups = ccnet_threaded_rpc.get_org_groups(org_id, -1, -1)
    groups_count = len(groups)

    # quota
    total_quota = seafserv_threaded_rpc.get_org_quota(org_id)
    quota_usage = seafserv_threaded_rpc.get_org_quota_usage(org_id)

    return {
            "org": org,
            "users": users,
            "users_count": users_count,
            "groups": groups,
            "groups_count": groups_count,
            "total_quota": total_quota,
            "quota_usage": quota_usage,
           }

@login_required
@sys_staff_required
def sys_org_info_user(request, org_id):

    org_id = int(org_id)

    org_basic_info = sys_get_org_base_info(org_id)
    users = org_basic_info["users"]
    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in users])
    for user in users:
        if user.id == request.user.id:
            user.is_self = True
        try:
            user.self_usage =seafserv_threaded_rpc. \
                    get_org_user_quota_usage(org_id, user.email)
            user.share_usage = 0
            user.quota = seafserv_threaded_rpc. \
                    get_org_user_quota(org_id, user.email)
        except SearpcError as e:
            logger.error(e)
            user.self_usage = -1
            user.share_usage = -1
            user.quota = -1

        # populate user last login time
        user.last_login = None
        for last_login in last_logins:
            if last_login.username == user.email:
                user.last_login = last_login.last_login

    return render_to_response('sysadmin/sys_org_info_user.html',
           org_basic_info, context_instance=RequestContext(request))


@login_required
@sys_staff_required
def sys_org_info_group(request, org_id):

    org_id = int(org_id)
    org_basic_info = sys_get_org_base_info(org_id)

    return render_to_response('sysadmin/sys_org_info_group.html',
           org_basic_info, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_org_info_library(request, org_id):

    org_id = int(org_id)
    org_basic_info = sys_get_org_base_info(org_id)

    # library
    org_repos = seafserv_threaded_rpc.get_org_repo_list(org_id, -1, -1)

    for repo in org_repos:
        try:
            repo.owner = seafserv_threaded_rpc.get_org_repo_owner(repo.id)
        except:
            repo.owner = None

    org_basic_info["org_repos"] = org_repos
    return render_to_response('sysadmin/sys_org_info_library.html',
           org_basic_info, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_org_info_setting(request, org_id):

    org_id = int(org_id)
    org_basic_info = sys_get_org_base_info(org_id)

    if getattr(settings, 'ORG_MEMBER_QUOTA_ENABLED', False):
        from seahub_extra.organizations.models import OrgMemberQuota
        org_basic_info['org_member_quota'] = OrgMemberQuota.objects.get_quota(org_id)
    else:
        org_basic_info['org_member_quota'] = None

    return render_to_response('sysadmin/sys_org_info_setting.html',
                              org_basic_info,
                              context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_publink_admin(request):
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '100'))
    except ValueError:
        current_page = 1
        per_page = 100

    offset = per_page * (current_page -1)
    limit = per_page + 1
    publinks = FileShare.objects.all()[offset:offset+limit]

    if len(publinks) == per_page + 1:
        page_next = True
    else:
        page_next = False

    for l in publinks:
        if l.is_file_share_link():
            l.name = os.path.basename(l.path)
        else:
            l.name = os.path.dirname(l.path)

    return render_to_response(
        'sysadmin/sys_publink_admin.html', {
            'publinks': publinks,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

@login_required
@sys_staff_required
def user_search(request):
    """Search a user.
    """
    email = request.GET.get('email', '')

    users = ccnet_threaded_rpc.search_emailusers('DB', email, -1, -1)
    ldap_users = ccnet_threaded_rpc.search_emailusers('LDAP', email, -1, -1)
    users.extend(ldap_users)

    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in users])
    if ENABLE_TRIAL_ACCOUNT:
        trial_users = TrialAccount.objects.filter(user_or_org__in=[x.email for x in users])
    else:
        trial_users = []
    for user in users:
        _populate_user_quota_usage(user)

        # check user's role
        if user.role == GUEST_USER:
            user.is_guest = True
        else:
            user.is_guest = False

        # populate user last login time
        user.last_login = None
        for last_login in last_logins:
            if last_login.username == user.email:
                user.last_login = last_login.last_login

        user.trial_info = None
        for trial_user in trial_users:
            if trial_user.user_or_org == user.email:
                user.trial_info = {'expire_date': trial_user.expire_date}

    return render_to_response('sysadmin/user_search.html', {
            'users': users,
            'email': email,
            'default_user': DEFAULT_USER,
            'guest_user': GUEST_USER,
            'enable_guest': ENABLE_GUEST,
            }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_repo_transfer(request):
    """Transfer a repo to others.
    """
    if request.method != 'POST':
        raise Http404

    repo_id = request.POST.get('repo_id', None)
    new_owner = request.POST.get('email', None)

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = reverse(sys_repo_admin)

    if not (repo_id and new_owner):
        messages.error(request, _(u'Failed to transfer, invalid arguments.'))
        return HttpResponseRedirect(next)

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        messages.error(request, _(u'Library does not exist'))
        return HttpResponseRedirect(next)

    try:
        User.objects.get(email=new_owner)
    except User.DoesNotExist:
        messages.error(request, _(u'Failed to transfer, user %s not found') % new_owner)
        return HttpResponseRedirect(next)

    try:
        if seafserv_threaded_rpc.get_org_id_by_repo_id(repo_id) > 0:
            messages.error(request, _(u'Can not transfer organization library'))
            return HttpResponseRedirect(next)

        if ccnet_threaded_rpc.get_orgs_by_user(new_owner):
            messages.error(request, _(u'Can not transfer library to organization user %s') % new_owner)
            return HttpResponseRedirect(next)
    except SearpcError:    # XXX: ignore rpc not found error
        pass

    seafile_api.set_repo_owner(repo_id, new_owner)
    messages.success(request, _(u'Successfully transfered.'))
    return HttpResponseRedirect(next)

@login_required
@sys_staff_required
def sys_traffic_admin(request):
    """List all users from database.
    """
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    month = request.GET.get('month', '')
    if not re.match(r'[\d]{6}', month):
        month = datetime.datetime.now().strftime('%Y%m')

    start = per_page * (current_page -1)
    limit = per_page + 1
    traffic_info_list = get_user_traffic_list(month, start, limit)

    page_next = len(traffic_info_list) == limit

    for info in traffic_info_list:
        info['total'] = info['file_view'] + info['file_download'] + info['dir_download']

    return render_to_response(
        'sysadmin/sys_trafficadmin.html', {
            'traffic_info_list': traffic_info_list,
            'month': month,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

@login_required_ajax
@sys_staff_required
def batch_user_make_admin(request):
    """Batch make users as admins.
    """
    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    set_admin_emails = request.POST.get('set_admin_emails')
    set_admin_emails = string2list(set_admin_emails)
    success = []
    failed = []

    for email in set_admin_emails:
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            failed.append(email)
            continue

        if user.source == 'DB':
            # check if is DB user first
            user.is_staff = True
            user.save()
        else:
            # if is LDAP user, add this 'email' as a DB user first
            # then set admin
            ccnet_threaded_rpc.add_emailuser(email, '!', 1, 1)

        success.append(email)

    for item in success:
        messages.success(request, _(u'Successfully set %s as admin.') % item)
    for item in failed:
        messages.error(request, _(u'Failed to set %s as admin: user does not exist.') % item)

    return HttpResponse(json.dumps({'success': True,}), content_type=content_type)

@login_required
@sys_staff_required
def batch_add_user(request):
    """Batch add users. Import users from CSV file.
    """
    if request.method != 'POST':
        raise Http404

    form = BatchAddUserForm(request.POST, request.FILES)
    if form.is_valid():
        content = request.FILES['file'].read()
        encoding = chardet.detect(content)['encoding']
        if encoding != 'utf-8':
            content = content.decode(encoding, 'replace').encode('utf-8')

        filestream = StringIO.StringIO(content)
        reader = csv.reader(filestream)

        for row in reader:
            if not row:
                continue

            username = row[0].strip()
            password = row[1].strip()

            if not is_valid_username(username):
                continue

            if password == '':
                continue

            try:
                User.objects.get(email=username)
                continue
            except User.DoesNotExist:
                User.objects.create_user(username, password, is_staff=False,
                                         is_active=True)
        messages.success(request, _('Import succeeded'))
    else:
        messages.error(request, _(u'Please select a csv file first.'))

    next = request.META.get('HTTP_REFERER', reverse(sys_user_admin))
    return HttpResponseRedirect(next)

@login_required
def sys_sudo_mode(request):
    if request.method not in ('GET', 'POST'):
        return HttpResponseNotAllowed

    # here we can't use @sys_staff_required
    if not request.user.is_staff:
        return Http404

    password_error = False
    if request.method == 'POST':
        password = request.POST.get('password')
        if password:
            user = authenticate(username=request.user.username, password=password)
            if user:
                update_sudo_mode_ts(request)
                return HttpResponseRedirect(
                    request.GET.get('next', reverse('sys_useradmin')))
        password_error = True

    enable_shib_login = getattr(settings, 'ENABLE_SHIB_LOGIN', False)
    return render_to_response(
        'sysadmin/sudo_mode.html', {
            'password_error': password_error,
            'enable_shib_login': enable_shib_login,
        },
        context_instance=RequestContext(request))
