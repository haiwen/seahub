# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import os
from types import FunctionType
import logging
import json
import re
import datetime
import csv, chardet, StringIO
import time
from constance import config

from django.db.models import Q
from django.conf import settings as dj_settings
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.http import HttpResponse, Http404, HttpResponseRedirect, HttpResponseNotAllowed

from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.utils import timezone
from django.utils.translation import ugettext as _

import seaserv
from seaserv import ccnet_threaded_rpc, seafserv_threaded_rpc, \
    seafile_api, get_group, get_group_members, ccnet_api, \
    get_related_users_by_repo, get_related_users_by_org_repo
from pysearpc import SearpcError

from seahub.base.accounts import User
from seahub.base.models import UserLastLogin
from seahub.base.decorators import sys_staff_required, require_POST
from seahub.base.sudo_mode import update_sudo_mode_ts
from seahub.base.templatetags.seahub_tags import tsstr_sec, email2nickname
from seahub.auth import authenticate
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.constants import GUEST_USER, DEFAULT_USER, DEFAULT_ADMIN, \
        SYSTEM_ADMIN, DAILY_ADMIN, AUDIT_ADMIN
from seahub.institutions.models import (Institution, InstitutionAdmin,
                                        InstitutionQuota)
from seahub.institutions.utils import get_institution_space_usage
from seahub.invitations.models import Invitation
from seahub.role_permissions.utils import get_available_roles, \
        get_available_admin_roles
from seahub.role_permissions.models import AdminRole
from seahub.utils import IS_EMAIL_CONFIGURED, string2list, is_valid_username, \
    is_pro_version, send_html_email, get_user_traffic_list, get_server_id, \
    clear_token, handle_virus_record, get_virus_record_by_id, \
    get_virus_record, FILE_AUDIT_ENABLED, get_max_upload_file_size
from seahub.utils.file_size import get_file_size_unit
from seahub.utils.ldap import get_ldap_info
from seahub.utils.licenseparse import parse_license, user_number_over_limit
from seahub.utils.rpc import mute_seafile_api
from seahub.utils.sysinfo import get_platform_name
from seahub.utils.mail import send_html_email_with_dj_template
from seahub.utils.ms_excel import write_xls
from seahub.utils.user_permissions import get_basic_user_roles, \
        get_user_role, get_basic_admin_roles
from seahub.views import get_system_default_repo_id
from seahub.forms import SetUserQuotaForm, AddUserForm, BatchAddUserForm, \
    TermsAndConditionsForm
from seahub.options.models import UserOptions
from seahub.profile.models import Profile, DetailedProfile
from seahub.signals import repo_deleted
from seahub.share.models import FileShare, UploadLinkShare
from seahub.admin_log.signals import admin_operation
from seahub.admin_log.models import USER_DELETE, USER_ADD
import seahub.settings as settings
from seahub.settings import INIT_PASSWD, SITE_NAME, SITE_ROOT, \
    SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER, SEND_EMAIL_ON_RESETTING_USER_PASSWD, \
    ENABLE_SYS_ADMIN_VIEW_REPO, ENABLE_GUEST_INVITATION
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
from seahub.utils.two_factor_auth import has_two_factor_auth, HAS_TWO_FACTOR_AUTH
from termsandconditions.models import TermsAndConditions

logger = logging.getLogger(__name__)

@login_required
@sys_staff_required
def sysadmin(request):
    max_upload_file_size = get_max_upload_file_size()

    folder_perm_enabled = True if is_pro_version() and settings.ENABLE_FOLDER_PERM else False

    return render_to_response('sysadmin/sysadmin_backbone.html', {
            'enable_sys_admin_view_repo': ENABLE_SYS_ADMIN_VIEW_REPO,
            'enable_upload_folder': settings.ENABLE_UPLOAD_FOLDER,
            'enable_resumable_fileupload': settings.ENABLE_RESUMABLE_FILEUPLOAD,
            'max_number_of_files_for_fileupload': settings.MAX_NUMBER_OF_FILES_FOR_FILEUPLOAD,
            'enable_thumbnail': settings.ENABLE_THUMBNAIL,
            'thumbnail_default_size': settings.THUMBNAIL_DEFAULT_SIZE,
            'thumbnail_size_for_grid': settings.THUMBNAIL_SIZE_FOR_GRID,
            'enable_encrypted_library': config.ENABLE_ENCRYPTED_LIBRARY,
            'enable_repo_history_setting': config.ENABLE_REPO_HISTORY_SETTING,
            'max_upload_file_size': max_upload_file_size,
            'folder_perm_enabled': folder_perm_enabled,
            'is_pro': True if is_pro_version() else False,
            'file_audit_enabled': FILE_AUDIT_ENABLED
            }, context_instance=RequestContext(request))

def can_view_sys_admin_repo(repo):
    default_repo_id = get_system_default_repo_id()
    is_default_repo = True if repo.id == default_repo_id else False

    if is_default_repo:
        return True
    elif repo.encrypted:
        return False
    elif is_pro_version() and ENABLE_SYS_ADMIN_VIEW_REPO:
        return True
    else:
        return False

def populate_user_info(user):
    """Populate contact email and name to user.
    """
    user_profile = Profile.objects.get_profile_by_user(user.email)
    if user_profile:
        user.contact_email = user_profile.contact_email
        user.name = user_profile.nickname
    else:
        user.contact_email = ''
        user.name = ''

def _populate_user_quota_usage(user):
    """Populate space/share quota to user.

    Arguments:
    - `user`:
    """
    orgs = ccnet_api.get_orgs_by_user(user.email)
    try:
        if orgs:
            user.org = orgs[0]
            org_id = user.org.org_id
            user.space_usage = seafile_api.get_org_user_quota_usage(org_id, user.email)
            user.space_quota = seafile_api.get_org_user_quota(org_id, user.email)
        else:
            user.space_usage = seafile_api.get_user_self_usage(user.email)
            user.space_quota = seafile_api.get_user_quota(user.email)
    except SearpcError as e:
        logger.error(e)
        user.space_usage = -1
        user.space_quota = -1

@login_required
@sys_staff_required
def sys_user_admin(request):
    """List all users from database.
    """

    try:
        from seahub_extra.plan.models import UserPlan
        enable_user_plan = True
    except ImportError:
        enable_user_plan = False

    if enable_user_plan and request.GET.get('filter', '') == 'paid':
        # show paid users
        users = []
        ups = UserPlan.objects.all()
        for up in ups:
            try:
                u = User.objects.get(up.username)
            except User.DoesNotExist:
                continue

            _populate_user_quota_usage(u)
            users.append(u)

        last_logins = UserLastLogin.objects.filter(username__in=[x.username for x in users])
        for u in users:
            for e in last_logins:
                if e.username == u.username:
                    u.last_login = e.last_login

        return render_to_response('sysadmin/sys_useradmin_paid.html', {
            'users': users,
            'enable_user_plan': enable_user_plan,
        }, context_instance=RequestContext(request))

    ### List all users
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25
    users_plus_one = seaserv.get_emailusers('DB', per_page * (current_page - 1),
                                            per_page + 1)
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
        if user.email == request.user.email:
            user.is_self = True

        populate_user_info(user)
        _populate_user_quota_usage(user)

        # check user's role
        user.is_guest = True if get_user_role(user) == GUEST_USER else False
        user.is_default = True if get_user_role(user) == DEFAULT_USER else False

        # populate user last login time
        user.last_login = None
        for last_login in last_logins:
            if last_login.username == user.email:
                user.last_login = last_login.last_login

        user.trial_info = None
        for trial_user in trial_users:
            if trial_user.user_or_org == user.email:
                user.trial_info = {'expire_date': trial_user.expire_date}

    platform = get_platform_name()
    server_id = get_server_id()
    pro_server = 1 if is_pro_version() else 0
    extra_user_roles = [x for x in get_available_roles()
                        if x not in get_basic_user_roles()]

    return render_to_response(
        'sysadmin/sys_useradmin.html', {
            'users': users,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'have_ldap': get_ldap_info(),
            'platform': platform,
            'server_id': server_id[:8],
            'default_user': DEFAULT_USER,
            'guest_user': GUEST_USER,
            'is_pro': is_pro_version(),
            'pro_server': pro_server,
            'enable_user_plan': enable_user_plan,
            'extra_user_roles': extra_user_roles,
        }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_useradmin_export_excel(request):
    """ Export all users from database to excel
    """

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT

    try:
        users = ccnet_api.get_emailusers('DB', -1, -1) + \
                ccnet_api.get_emailusers('LDAPImport', -1, -1)
    except Exception as e:
        logger.error(e)
        messages.error(request, _(u'Failed to export Excel'))
        return HttpResponseRedirect(next)

    if is_pro_version():
        is_pro = True
    else:
        is_pro = False

    if is_pro:
        head = [_("Email"), _("Name"), _("Contact Email"), _("Status"), _("Role"),
                _("Space Usage") + "(MB)", _("Space Quota") + "(MB)",
                _("Create At"), _("Last Login"), _("Admin"), _("LDAP(imported)"),]
    else:
        head = [_("Email"), _("Name"), _("Contact Email"), _("Status"),
                _("Space Usage") + "(MB)", _("Space Quota") + "(MB)",
                _("Create At"), _("Last Login"), _("Admin"), _("LDAP(imported)"),]

    data_list = []

    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in users])
    for user in users:

        # populate name and contact email
        populate_user_info(user)

        # populate space usage and quota
        MB = get_file_size_unit('MB')

        _populate_user_quota_usage(user)
        if user.space_usage > 0:
            try:
                space_usage_MB = round(float(user.space_usage) / MB, 2)
            except Exception as e:
                logger.error(e)
                space_usage_MB = '--'
        else:
            space_usage_MB = ''

        if user.space_quota > 0:
            try:
                space_quota_MB = round(float(user.space_quota) / MB, 2)
            except Exception as e:
                logger.error(e)
                space_quota_MB = '--'
        else:
            space_quota_MB = ''

        # populate user last login time
        user.last_login = None
        for last_login in last_logins:
            if last_login.username == user.email:
                user.last_login = last_login.last_login

        if user.is_active:
            status = _('Active')
        else:
            status = _('Inactive')

        create_at = tsstr_sec(user.ctime) if user.ctime else ''
        last_login = user.last_login.strftime("%Y-%m-%d %H:%M:%S") if \
            user.last_login else ''

        is_admin = _('Yes') if user.is_staff else ''
        ldap_import = _('Yes') if user.source == 'LDAPImport' else ''

        if is_pro:
            if user.role == GUEST_USER:
                role = _('Guest')
            else:
                role = _('Default')

            row = [user.email, user.name, user.contact_email, status, role,
                    space_usage_MB, space_quota_MB, create_at,
                    last_login, is_admin, ldap_import]
        else:
            row = [user.email, user.name, user.contact_email, status,
                    space_usage_MB, space_quota_MB, create_at,
                    last_login, is_admin, ldap_import]

        data_list.append(row)

    wb = write_xls('users', head, data_list)
    if not wb:
        messages.error(request, _(u'Failed to export Excel'))
        return HttpResponseRedirect(next)

    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = 'attachment; filename=users.xlsx'
    wb.save(response)
    return response

@login_required
@sys_staff_required
def sys_user_admin_ldap_imported(request):
    """List all users from LDAP imported.
    """

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25
    users_plus_one = seaserv.get_emailusers('LDAPImport',
                                            per_page * (current_page - 1),
                                            per_page + 1)
    if len(users_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    users = users_plus_one[:per_page]
    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in users])
    for user in users:
        if user.email == request.user.email:
            user.is_self = True

        populate_user_info(user)
        _populate_user_quota_usage(user)

        # check user's role
        user.is_guest = True if get_user_role(user) == GUEST_USER else False
        user.is_default = True if get_user_role(user) == DEFAULT_USER else False

        # populate user last login time
        user.last_login = None
        for last_login in last_logins:
            if last_login.username == user.email:
                user.last_login = last_login.last_login

    extra_user_roles = [x for x in get_available_roles()
                        if x not in get_basic_user_roles()]

    return render_to_response(
        'sysadmin/sys_user_admin_ldap_imported.html', {
            'users': users,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'is_pro': is_pro_version(),
            'extra_user_roles': extra_user_roles,
            'default_user': DEFAULT_USER,
            'guest_user': GUEST_USER,
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
    users_plus_one = seaserv.get_emailusers('LDAP',
                                            per_page * (current_page - 1),
                                            per_page + 1)
    if len(users_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    users = users_plus_one[:per_page]
    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in users])
    for user in users:
        if user.email == request.user.email:
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
            'is_pro': is_pro_version(),
        },
        context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_user_admin_admins(request):
    """List all admins from database and ldap imported
    """

    db_users = ccnet_api.get_emailusers('DB', -1, -1)
    ldpa_imported_users = ccnet_api.get_emailusers('LDAPImport', -1, -1)

    admin_users = []
    not_admin_users = []

    for user in db_users + ldpa_imported_users:
        if user.is_staff is True:
            admin_users.append(user)
        else:
            not_admin_users.append(user)

    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in admin_users])

    for user in admin_users:
        if user.email == request.user.email:
            user.is_self = True

        _populate_user_quota_usage(user)

        # check db user's role
        if user.source == "DB":
            if user.role == GUEST_USER:
                user.is_guest = True
            else:
                user.is_guest = False

        # populate user last login time
        user.last_login = None
        for last_login in last_logins:
            if last_login.username == user.email:
                user.last_login = last_login.last_login

        try:
            admin_role = AdminRole.objects.get_admin_role(user.email)
            user.admin_role = admin_role.role
        except AdminRole.DoesNotExist:
            user.admin_role = DEFAULT_ADMIN

    extra_admin_roles = [x for x in get_available_admin_roles()
                        if x not in get_basic_admin_roles()]

    return render_to_response(
        'sysadmin/sys_useradmin_admins.html', {
            'users': admin_users,
            'not_admin_users': not_admin_users,
            'have_ldap': get_ldap_info(),
            'extra_admin_roles': extra_admin_roles,
            'default_admin': DEFAULT_ADMIN,
            'system_admin': SYSTEM_ADMIN,
            'daily_admin': DAILY_ADMIN,
            'audit_admin': AUDIT_ADMIN,
            'is_pro': is_pro_version(),
        }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def user_info(request, email):
    org_name = None
    space_quota = space_usage = 0

    org = ccnet_api.get_orgs_by_user(email)
    if not org:
        owned_repos = mute_seafile_api.get_owned_repo_list(email,
                                                           ret_corrupted=True)
        in_repos = mute_seafile_api.get_share_in_repo_list(email, -1, -1)
        space_usage = mute_seafile_api.get_user_self_usage(email)
        space_quota = mute_seafile_api.get_user_quota(email)
    else:
        org_id = org[0].org_id
        org_name = org[0].org_name
        space_usage = seafile_api.get_org_user_quota_usage(org_id, email)
        space_quota = seafile_api.get_org_user_quota(org_id, email)
        owned_repos = seafile_api.get_org_owned_repo_list(org_id, email,
                                                          ret_corrupted=True)
        in_repos = seafile_api.get_org_share_in_repo_list(org_id, email, -1, -1)

    owned_repos = filter(lambda r: not r.is_virtual, owned_repos)

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

                if fs.path == '/':
                    fs.filename = '/'
                else:
                    fs.filename = os.path.basename(fs.path.rstrip('/'))

                path = fs.path
                if path[-1] != '/':         # Normalize dir path
                    path += '/'
                # get dir size
                dir_id = seafile_api.get_dir_id_by_commit_and_path(r.id, r.head_cmmt_id, path)
                fs.dir_size = seafile_api.get_dir_size(r.store_id, r.version, dir_id)

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

            if link.path == '/':
                link.dir_name = '/'
            else:
                link.dir_name = os.path.basename(link.path.rstrip('/'))

            link.is_upload = True
            p_uploadlinks.append(link)
        except SearpcError as e:
            logger.error(e)
            continue
    p_uploadlinks.sort(key=lambda x: x.view_cnt, reverse=True)
    user_shared_links += p_uploadlinks

    try:
        personal_groups = seaserv.get_personal_groups_by_user(email)
    except SearpcError as e:
        logger.error(e)
        personal_groups = []

    for g in personal_groups:
        try:
            is_group_staff = seaserv.check_group_staff(g.id, email)
        except SearpcError as e:
            logger.error(e)
            is_group_staff = False

        if email == g.creator_name:
            g.role = _('Owner')
        elif is_group_staff:
            g.role = _('Admin')
        else:
            g.role = _('Member')

    _default_device = False
    _has_two_factor_auth = has_two_factor_auth()
    if _has_two_factor_auth:
        from seahub_extra.two_factor.utils import default_device
        _user = User.objects.get(email=email)
        _default_device = default_device(_user)

    return render_to_response(
        'sysadmin/userinfo.html', {
            'owned_repos': owned_repos,
            'space_quota': space_quota,
            'space_usage': space_usage,
            'in_repos': in_repos,
            'email': email,
            'profile': profile,
            'd_profile': d_profile,
            'org_name': org_name,
            'user_shared_links': user_shared_links,
            'enable_sys_admin_view_repo': ENABLE_SYS_ADMIN_VIEW_REPO,
            'personal_groups': personal_groups,
            'two_factor_auth_enabled': _has_two_factor_auth,
            'default_device': _default_device,
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
        space_quota_mb = f.cleaned_data['space_quota']
        space_quota = space_quota_mb * get_file_size_unit('MB')

        org = ccnet_api.get_orgs_by_user(email)
        try:
            if not org:
                seafile_api.set_user_quota(email, space_quota)
            else:
                org_id = org[0].org_id
                org_quota_mb = seafserv_threaded_rpc.get_org_quota(org_id) / get_file_size_unit('MB')
                if space_quota_mb > org_quota_mb:
                    result['error'] = _(u'Failed to set quota: maximum quota is %d MB' % \
                                            org_quota_mb)
                    return HttpResponse(json.dumps(result), status=400, content_type=content_type)
                else:
                    seafile_api.set_org_user_quota(org_id, email, space_quota)
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
    quota = quota_mb * get_file_size_unit('MB')

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
@require_POST
def user_remove(request, email):
    """Remove user"""
    referer = request.META.get('HTTP_REFERER', None)
    next = reverse('sys_useradmin') if referer is None else referer

    try:
        user = User.objects.get(email=email)
        org = ccnet_api.get_orgs_by_user(user.email)
        if org:
            if org[0].creator == user.email:
                messages.error(request, _(u'Failed to delete: the user is an organization creator'))
                return HttpResponseRedirect(next)

        user.delete()
        messages.success(request, _(u'Successfully deleted %s') % user.username)

        # send admin operation log signal
        admin_op_detail = {
            "email": email,
        }
        admin_operation.send(sender=None, admin_name=request.user.username,
                operation=USER_DELETE, detail=admin_op_detail)

    except User.DoesNotExist:
        messages.error(request, _(u'Failed to delete: the user does not exist'))

    return HttpResponseRedirect(next)

@login_required
@sys_staff_required
@require_POST
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

# @login_required
# @sys_staff_required
# def user_make_admin(request, user_id):
#     """Set user as system admin."""
#     try:
#         user = User.objects.get(id=int(user_id))
#         user.is_staff = True
#         user.save()
#         messages.success(request, _(u'Successfully set %s as admin') % user.username)
#     except User.DoesNotExist:
#         messages.error(request, _(u'Failed to set admin: the user does not exist'))

#     referer = request.META.get('HTTP_REFERER', None)
#     next = reverse('sys_useradmin') if referer is None else referer

#     return HttpResponseRedirect(next)

@login_required
@sys_staff_required
@require_POST
def user_remove_admin(request, email):
    """Unset user admin."""
    try:
        user = User.objects.get(email=email)
        user.is_staff = False
        user.save()
        messages.success(request, _(u'Successfully revoke the admin permission of %s') % user.username)
    except User.DoesNotExist:
        messages.error(request, _(u'Failed to revoke admin: the user does not exist'))

    referer = request.META.get('HTTP_REFERER', None)
    next = reverse('sys_useradmin') if referer is None else referer

    return HttpResponseRedirect(next)

# @login_required
# @sys_staff_required
# def user_activate(request, user_id):
#     try:
#         user = User.objects.get(id=int(user_id))
#         user.is_active = True
#         user.save()
#         messages.success(request, _(u'Successfully activated "%s".') % user.email)
#     except User.DoesNotExist:
#         messages.success(request, _(u'Failed to activate: user does not exist.'))

#     next = request.META.get('HTTP_REFERER', None)
#     if not next:
#         next = reverse('sys_useradmin')

#     return HttpResponseRedirect(next)

# @login_required
# @sys_staff_required
# def user_deactivate(request, user_id):
#     try:
#         user = User.objects.get(id=int(user_id))
#         user.is_active = False
#         user.save()
#         messages.success(request, _(u'Successfully deactivated "%s".') % user.email)
#     except User.DoesNotExist:
#         messages.success(request, _(u'Failed to deactivate: user does not exist.'))

#     next = request.META.get('HTTP_REFERER', None)
#     if not next:
#         next = reverse('sys_useradmin')

#     return HttpResponseRedirect(next)

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
@require_POST
def user_toggle_status(request, email):
    content_type = 'application/json; charset=utf-8'

    if not is_valid_username(email):
        return HttpResponse(json.dumps({'success': False}), status=400,
                            content_type=content_type)

    try:
        user_status = int(request.POST.get('s', 0))
    except ValueError:
        user_status = 0

    try:
        user = User.objects.get(email)
        user.is_active = bool(user_status)
        result_code = user.save()
        if result_code == -1:
            return HttpResponse(json.dumps({'success': False}), status=403,
                                content_type=content_type)

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
@require_POST
def user_toggle_role(request, email):
    content_type = 'application/json; charset=utf-8'

    if not is_valid_username(email):
        return HttpResponse(json.dumps({'success': False}), status=400,
                            content_type=content_type)

    if not is_pro_version():
        return HttpResponse(json.dumps({'success': False}), status=403,
                            content_type=content_type)

    try:
        user_role = request.POST.get('r', DEFAULT_USER)
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
@require_POST
def user_reset(request, email):
    """Reset password for user."""
    try:
        user = User.objects.get(email=email)
        if isinstance(INIT_PASSWD, FunctionType):
            new_password = INIT_PASSWD()
        else:
            new_password = INIT_PASSWD
        user.set_password(new_password)
        user.save()

        clear_token(user.username)
        if config.FORCE_PASSWORD_CHANGE:
            UserOptions.objects.set_force_passwd_change(user.username)

        if IS_EMAIL_CONFIGURED:
            if SEND_EMAIL_ON_RESETTING_USER_PASSWD:
                try:
                    contact_email = Profile.objects.get_contact_email_by_user(user.email)
                    send_user_reset_email(request, contact_email, new_password)
                    msg = _('Successfully reset password to %(passwd)s, an email has been sent to %(user)s.') % \
                        {'passwd': new_password, 'user': contact_email}
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
        name = form.cleaned_data['name']
        department = form.cleaned_data['department']
        role = form.cleaned_data['role']
        password = form.cleaned_data['password1']

        try:
            user = User.objects.create_user(email, password, is_staff=False,
                                            is_active=True)
        except User.DoesNotExist as e:
            logger.error(e)
            err_msg = _(u'Fail to add user %s.') % email
            return HttpResponse(json.dumps({'error': err_msg}), status=403, content_type=content_type)

        # send admin operation log signal
        admin_op_detail = {
            "email": email,
        }
        admin_operation.send(sender=None, admin_name=request.user.username,
                operation=USER_ADD, detail=admin_op_detail)

        if user:
            User.objects.update_role(email, role)
            if config.FORCE_PASSWORD_CHANGE:
                UserOptions.objects.set_force_passwd_change(email)
            if name:
                Profile.objects.add_or_update(email, name, '')
            if department:
                DetailedProfile.objects.add_or_update(email, department, '')

        if request.user.org:
            org_id = request.user.org.org_id
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
def sys_group_admin_export_excel(request):
    """ Export all groups to excel
    """

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = SITE_ROOT

    try:
        groups = ccnet_threaded_rpc.get_all_groups(-1, -1)
    except Exception as e:
        logger.error(e)
        messages.error(request, _(u'Failed to export Excel'))
        return HttpResponseRedirect(next)

    head = [_("Name"), _("Creator"), _("Create At")]
    data_list = []
    for grp in groups:
        create_at = tsstr_sec(grp.timestamp) if grp.timestamp else ''
        row = [grp.group_name, grp.creator_name, create_at]
        data_list.append(row)

    wb = write_xls('groups', head, data_list)
    if not wb:
        messages.error(request, _(u'Failed to export Excel'))
        return HttpResponseRedirect(next)

    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = 'attachment; filename=groups.xlsx'
    wb.save(response)
    return response

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

    try:
        from seahub_extra.plan.models import OrgPlan
        enable_org_plan = True
    except ImportError:
        enable_org_plan = False

    if enable_org_plan and request.GET.get('filter', '') == 'paid':
        orgs = []
        ops = OrgPlan.objects.all()
        for e in ops:
            o = ccnet_threaded_rpc.get_org_by_id(e.org_id)
            if not o:
                continue

            o.quota_usage = seafserv_threaded_rpc.get_org_quota_usage(o.org_id)
            o.total_quota = seafserv_threaded_rpc.get_org_quota(o.org_id)
            o.expiration = e.expire_date
            o.is_expired = True if e.expire_date < timezone.now() else False
            orgs.append(o)

        return render_to_response('sysadmin/sys_org_admin.html', {
            'orgs': orgs,
            'enable_org_plan': enable_org_plan,
            'hide_paginator': True,
            'paid_page': True,
            }, context_instance=RequestContext(request))

    orgs_plus_one = ccnet_threaded_rpc.get_all_orgs(per_page * (current_page - 1),
                                                    per_page + 1)
    if len(orgs_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    orgs = orgs_plus_one[:per_page]

    if ENABLE_TRIAL_ACCOUNT:
        trial_orgs = TrialAccount.objects.filter(user_or_org__in=[x.org_id for x in orgs])
    else:
        trial_orgs = []

    for org in orgs:
        org.quota_usage = seafserv_threaded_rpc.get_org_quota_usage(org.org_id)
        org.total_quota = seafserv_threaded_rpc.get_org_quota(org.org_id)

        from seahub_extra.organizations.settings import ORG_TRIAL_DAYS
        if ORG_TRIAL_DAYS > 0:
            from datetime import timedelta
            org.expiration = datetime.datetime.fromtimestamp(org.ctime / 1e6) + timedelta(days=ORG_TRIAL_DAYS)

        org.trial_info = None
        for trial_org in trial_orgs:
            if trial_org.user_or_org == str(org.org_id):
                org.trial_info = {'expire_date': trial_org.expire_date}
                if trial_org.expire_date:
                    org.expiration = trial_org.expire_date

        if org.expiration:
            org.is_expired = True if org.expiration < timezone.now() else False
        else:
            org.is_expired = False

    return render_to_response('sysadmin/sys_org_admin.html', {
            'orgs': orgs,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'enable_org_plan': enable_org_plan,
            'all_page': True,
            }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_org_search(request):
    org_name = request.GET.get('name', '').lower()
    creator = request.GET.get('creator', '').lower()
    if not org_name and not creator:
        return HttpResponseRedirect(reverse('sys_org_admin'))

    orgs = []
    orgs_all = ccnet_threaded_rpc.get_all_orgs(-1, -1)

    if org_name and creator:
        for o in orgs_all:
            if org_name in o.org_name.lower() and creator in o.creator.lower():
                orgs.append(o)
    else:
        if org_name:
            for o in orgs_all:
                if org_name in o.org_name.lower():
                    orgs.append(o)

        if creator:
            for o in orgs_all:
                if creator in o.creator.lower():
                    orgs.append(o)

    return render_to_response(
        'sysadmin/sys_org_search.html', {
            'orgs': orgs,
            'name': org_name,
            'creator': creator,
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

@login_required
@require_POST
@sys_staff_required
def sys_org_remove(request, org_id):
    """Remove an org and all members/repos/groups.

    Arguments:
    - `request`:
    - `org_id`:
    """
    org_id = int(org_id)
    org = ccnet_threaded_rpc.get_org_by_id(org_id)
    users = ccnet_threaded_rpc.get_org_emailusers(org.url_prefix, -1, -1)
    for u in users:
        ccnet_threaded_rpc.remove_org_user(org_id, u.email)

    groups = ccnet_threaded_rpc.get_org_groups(org.org_id, -1, -1)
    for g in groups:
        ccnet_threaded_rpc.remove_org_group(org_id, g.gid)

    # remove org repos
    seafserv_threaded_rpc.remove_org_repo_by_org_id(org_id)

    # remove org
    ccnet_threaded_rpc.remove_org(org_id)

    messages.success(request, _(u'Successfully deleted.'))

    referer = request.META.get('HTTP_REFERER', None)
    next = reverse('sys_org_admin') if referer is None else referer
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
        if user.email == request.user.email:
            user.is_self = True
        try:
            user.self_usage = seafile_api.get_org_user_quota_usage(org_id, user.email)
            user.quota = seafile_api.get_org_user_quota(org_id, user.email)
        except SearpcError as e:
            logger.error(e)
            user.self_usage = -1
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
    sort_by = request.GET.get('sort_by', 'time_up')

    if sort_by == 'time_down':
        publinks = FileShare.objects.all().order_by('ctime')[offset:offset+limit]
    elif sort_by == 'count_up':
        publinks = FileShare.objects.all().order_by('-view_cnt')[offset:offset+limit]
    elif sort_by == 'count_down':
        publinks = FileShare.objects.all().order_by('view_cnt')[offset:offset+limit]
    else:
        publinks = FileShare.objects.all().order_by('-ctime')[offset:offset+limit]

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
            'per_page': per_page,
            'sort_by': sort_by,
        },
        context_instance=RequestContext(request))

@login_required_ajax
@sys_staff_required
@require_POST
def sys_publink_remove(request):
    """Remove share links.
    """
    content_type = 'application/json; charset=utf-8'
    result = {}

    token = request.POST.get('t')
    if not token:
        result = {'error': _(u"Argument missing")}
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    FileShare.objects.filter(token=token).delete()
    result = {'success': True}
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
@sys_staff_required
@require_POST
def sys_upload_link_remove(request):
    """Remove shared upload links.
    """
    content_type = 'application/json; charset=utf-8'
    result = {}

    token = request.POST.get('t')
    if not token:
        result = {'error': _(u"Argument missing")}
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    UploadLinkShare.objects.filter(token=token).delete()
    result = {'success': True}
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required
@sys_staff_required
def user_search(request):
    """Search a user.
    """
    email = request.GET.get('email', '')

    user_emails = []
    # search user from ccnet db
    users_from_ccnet = ccnet_api.search_emailusers('DB', email, -1, -1)
    for user in users_from_ccnet:
        user_emails.append(user.email)

    # search user from ccnet ldap
    users_from_ldap = ccnet_api.search_emailusers('LDAP', email, -1, -1)
    for user in users_from_ldap:
        user_emails.append(user.email)

    # search user from profile
    users_from_profile = Profile.objects.filter((Q(nickname__icontains=email)) |
            Q(contact_email__icontains=email))
    for user in users_from_profile:
        user_emails.append(user.user)

    # remove duplicate emails
    user_emails = {}.fromkeys(user_emails).keys()

    users = []
    for user_email in user_emails:
        try:
            user_obj = User.objects.get(email=user_email)
        except User.DoesNotExist:
            continue

        users.append(user_obj)

    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in users])
    if ENABLE_TRIAL_ACCOUNT:
        trial_users = TrialAccount.objects.filter(user_or_org__in=[x.email for x in users])
    else:
        trial_users = []

    for user in users:
        populate_user_info(user)
        _populate_user_quota_usage(user)

        # check user's role
        user.is_guest = True if get_user_role(user) == GUEST_USER else False
        user.is_default = True if get_user_role(user) == DEFAULT_USER else False
        # populate user last login time
        user.last_login = None
        for last_login in last_logins:
            if last_login.username == user.email:
                user.last_login = last_login.last_login

        user.trial_info = None
        for trial_user in trial_users:
            if trial_user.user_or_org == user.email:
                user.trial_info = {'expire_date': trial_user.expire_date}

    extra_user_roles = [x for x in get_available_roles()
                        if x not in get_basic_user_roles()]

    return render_to_response('sysadmin/user_search.html', {
            'users': users,
            'email': email,
            'default_user': DEFAULT_USER,
            'guest_user': GUEST_USER,
            'is_pro': is_pro_version(),
            'extra_user_roles': extra_user_roles,
            }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
@require_POST
def sys_repo_transfer(request):
    """Transfer a repo to others.
    """
    repo_id = request.POST.get('repo_id', None)
    new_owner = request.POST.get('email', None)

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = reverse('sys_repo_admin')

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

    if MULTI_TENANCY:
        try:
            if seafserv_threaded_rpc.get_org_id_by_repo_id(repo_id) > 0:
                messages.error(request, _(u'Can not transfer organization library'))
                return HttpResponseRedirect(next)

            if ccnet_api.get_orgs_by_user(new_owner):
                messages.error(request, _(u'Can not transfer library to organization user %s') % new_owner)
                return HttpResponseRedirect(next)
        except Exception as e:
            logger.error(e)
            messages.error(request, 'Internal Server Error')
            return HttpResponseRedirect(next)

    repo_owner = seafile_api.get_repo_owner(repo_id)

    # get repo shared to user/group list
    shared_users = seafile_api.list_repo_shared_to(
            repo_owner, repo_id)
    shared_groups = seafile_api.list_repo_shared_group_by_user(
            repo_owner, repo_id)

    # get all pub repos
    pub_repos = []
    if not request.cloud_mode:
        pub_repos = seafile_api.list_inner_pub_repos_by_owner(repo_owner)

    # transfer repo
    seafile_api.set_repo_owner(repo_id, new_owner)

    # reshare repo to user
    for shared_user in shared_users:
        shared_username = shared_user.user

        if new_owner == shared_username:
            continue

        seafile_api.share_repo(repo_id, new_owner,
                shared_username, shared_user.perm)

    # reshare repo to group
    for shared_group in shared_groups:
        shared_group_id = shared_group.group_id

        if not ccnet_api.is_group_user(shared_group_id, new_owner):
            continue

        seafile_api.set_group_repo(repo_id, shared_group_id,
                new_owner, shared_group.perm)

    # check if current repo is pub-repo
    # if YES, reshare current repo to public
    for pub_repo in pub_repos:
        if repo_id != pub_repo.id:
            continue

        seafile_api.add_inner_pub_repo(repo_id, pub_repo.permission)

        break

    messages.success(request, _(u'Successfully transfered.'))
    return HttpResponseRedirect(next)

@login_required
@sys_staff_required
@require_POST
def sys_repo_delete(request, repo_id):
    """Delete a repo.
    """
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = reverse('sys_repo_admin')

    if get_system_default_repo_id() == repo_id:
        messages.error(request, _('System library can not be deleted.'))
        return HttpResponseRedirect(next)

    repo = seafile_api.get_repo(repo_id)
    if repo:                    # Handle the case that repo is `None`.
        repo_name = repo.name
    else:
        repo_name = ''

    if MULTI_TENANCY:
        org_id = seafserv_threaded_rpc.get_org_id_by_repo_id(repo_id)
        usernames = get_related_users_by_org_repo(org_id, repo_id)
        repo_owner = seafile_api.get_org_repo_owner(repo_id)
    else:
        org_id = -1
        usernames = get_related_users_by_repo(repo_id)
        repo_owner = seafile_api.get_repo_owner(repo_id)

    seafile_api.remove_repo(repo_id)
    repo_deleted.send(sender=None, org_id=org_id, usernames=usernames,
                      repo_owner=repo_owner, repo_id=repo_id,
                      repo_name=repo_name)

    messages.success(request, _(u'Successfully deleted.'))
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

@login_required
@sys_staff_required
def sys_virus_scan_records(request):
    """List virus scan records.
    """
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '100'))
    except ValueError:
        current_page = 1
        per_page = 100

    records_all = get_virus_record(start=per_page * (current_page - 1),
                                   limit=per_page + 1)
    if len(records_all) == per_page + 1:
        page_next = True
    else:
        page_next = False

    records = []
    for r in records_all[:per_page]:
        try:
            repo = seafile_api.get_repo(r.repo_id)
        except SearpcError as e:
            logger.error(e)
            continue

        if not repo:
            continue

        r.repo = repo
        r.repo.owner = seafile_api.get_repo_owner(r.repo.repo_id)
        records.append(r)

    return render_to_response(
        'sysadmin/sys_virus_scan_records.html', {
            'records': records,
            'current_page': current_page,
            'prev_page': current_page - 1,
            'next_page': current_page + 1,
            'per_page': per_page,
            'page_next': page_next,
        }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
@require_POST
def sys_delete_virus_scan_records(request, vid):
    r = get_virus_record_by_id(vid)
    parent_dir = os.path.dirname(r.file_path)
    dirent_name = os.path.basename(r.file_path)

    try:
        seafile_api.del_file(r.repo_id, parent_dir, dirent_name,
                             request.user.username)
        handle_virus_record(vid)
        messages.success(request, _('Successfully deleted.'))
    except SearpcError as e:
        logger.error(e)
        messages.error(request, _('Failed to delete, please try again later.'))

    return HttpResponseRedirect(reverse('sys_virus_scan_records'))

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

        user.is_staff = True
        user.save()
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

    next = request.META.get('HTTP_REFERER', reverse(sys_user_admin))

    form = BatchAddUserForm(request.POST, request.FILES)
    if form.is_valid():
        content = request.FILES['file'].read()
        encoding = chardet.detect(content)['encoding']
        if encoding != 'utf-8':
            content = content.decode(encoding, 'replace').encode('utf-8')

        filestream = StringIO.StringIO(content)
        reader = csv.reader(filestream)
        new_users_count = len(list(reader))
        if user_number_over_limit(new_users=new_users_count):
            messages.error(request, _(u'The number of users exceeds the limit.'))
            return HttpResponseRedirect(next)

        # return to the top of the file
        filestream.seek(0)
        reader = csv.reader(filestream)
        for row in reader:

            if not row:
                continue

            try:
                username = row[0].strip()
                password = row[1].strip()
                if not is_valid_username(username) or not password:
                    continue
            except Exception as e:
                logger.error(e)
                continue

            try:
                User.objects.get(email=username)
            except User.DoesNotExist:
                User.objects.create_user(
                    username, password, is_staff=False, is_active=True)

                if config.FORCE_PASSWORD_CHANGE:
                    UserOptions.objects.set_force_passwd_change(username)

                # then update the user's optional info
                try:
                    nickname = row[2].strip()
                    if len(nickname) <= 64 and '/' not in nickname:
                        Profile.objects.add_or_update(username, nickname, '')
                except Exception as e:
                    logger.error(e)

                try:
                    department = row[3].strip()
                    if len(department) <= 512:
                        DetailedProfile.objects.add_or_update(username, department, '')
                except Exception as e:
                    logger.error(e)

                try:
                    role = row[4].strip()
                    if is_pro_version() and role in get_available_roles():
                        User.objects.update_role(username, role)
                except Exception as e:
                    logger.error(e)

                try:
                    space_quota_mb = row[5].strip()
                    space_quota_mb = int(space_quota_mb)
                    if space_quota_mb >= 0:
                        space_quota = int(space_quota_mb) * get_file_size_unit('MB')
                        seafile_api.set_user_quota(username, space_quota)
                except Exception as e:
                    logger.error(e)

                send_html_email_with_dj_template(
                    username, dj_template='sysadmin/user_batch_add_email.html',
                    subject=_(u'You are invited to join %s') % SITE_NAME,
                    context={
                        'user': email2nickname(request.user.username),
                        'email': username,
                        'password': password,
                    })

                # send admin operation log signal
                admin_op_detail = {
                    "email": username,
                }
                admin_operation.send(sender=None, admin_name=request.user.username,
                                     operation=USER_ADD, detail=admin_op_detail)

        messages.success(request, _('Import succeeded'))
    else:
        messages.error(request, _(u'Please select a csv file first.'))

    return HttpResponseRedirect(next)

@login_required
def sys_sudo_mode(request):
    if request.method not in ('GET', 'POST'):
        return HttpResponseNotAllowed

    # here we can't use @sys_staff_required
    if not request.user.is_staff:
        raise Http404

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

@login_required
@sys_staff_required
def sys_settings(request):
    """List and change seahub settings in admin panel.
    """
    if not dj_settings.ENABLE_SETTINGS_VIA_WEB:
        raise Http404

    DIGIT_WEB_SETTINGS = [
        'DISABLE_SYNC_WITH_ANY_FOLDER', 'ENABLE_SIGNUP',
        'ACTIVATE_AFTER_REGISTRATION', 'REGISTRATION_SEND_MAIL',
        'LOGIN_REMEMBER_DAYS', 'REPO_PASSWORD_MIN_LENGTH',
        'ENABLE_REPO_HISTORY_SETTING', 'USER_STRONG_PASSWORD_REQUIRED',
        'ENABLE_ENCRYPTED_LIBRARY', 'USER_PASSWORD_MIN_LENGTH',
        'USER_PASSWORD_STRENGTH_LEVEL', 'SHARE_LINK_PASSWORD_MIN_LENGTH',
        'ENABLE_USER_CREATE_ORG_REPO', 'FORCE_PASSWORD_CHANGE',
        'LOGIN_ATTEMPT_LIMIT', 'FREEZE_USER_ON_LOGIN_FAILED',
    ]

    if HAS_TWO_FACTOR_AUTH:
        DIGIT_WEB_SETTINGS.append('ENABLE_TWO_FACTOR_AUTH')

    STRING_WEB_SETTINGS = ('SERVICE_URL', 'FILE_SERVER_ROOT', 'TEXT_PREVIEW_EXT')

    if request.is_ajax() and request.method == "POST":
        content_type = 'application/json; charset=utf-8'
        result = {}

        key = request.POST.get('key', None)
        value = request.POST.get('value', None)

        if key not in dir(config) or value is None:
            result['error'] = _(u'Invalid setting')
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)

        if value.isdigit():
            if key in DIGIT_WEB_SETTINGS:
                value = int(value)
            else:
                result['error'] = _(u'Invalid value')
                return HttpResponse(json.dumps(result), status=400, content_type=content_type)

            if key == 'USER_PASSWORD_STRENGTH_LEVEL' and value not in (1,2,3,4):
                result['error'] = _(u'Invalid value')
                return HttpResponse(json.dumps(result), status=400, content_type=content_type)

        else:
            if key not in STRING_WEB_SETTINGS:
                result['error'] = _(u'Invalid value')
                return HttpResponse(json.dumps(result), status=400, content_type=content_type)

        try:
            setattr(config, key, value)
            result['success'] = True
            return HttpResponse(json.dumps(result), content_type=content_type)
        except AttributeError as e:
            logger.error(e)
            result['error'] = _(u'Internal server error')
            return HttpResponse(json.dumps(result), status=500, content_type=content_type)

    config_dict = {}
    for key in dir(config):
        value = getattr(config, key)
        config_dict[key] = value

    return render_to_response('sysadmin/settings.html', {
        'config_dict': config_dict,
        'has_two_factor_auth': HAS_TWO_FACTOR_AUTH,
    }, context_instance=RequestContext(request))

@login_required_ajax
@sys_staff_required
def sys_check_license(request):
    """Check seafile license expiration.
    """
    if not is_pro_version():
        raise Http404

    content_type = 'application/json; charset=utf-8'
    result = {}

    license_dict = parse_license()
    if license_dict:
        try:
            expiration = license_dict['Expiration']
        except KeyError as e:
            logger.error(e)
            result['error'] = str(e)
            return HttpResponse(json.dumps(result), status=500, content_type=content_type)

        struct_time = datetime.datetime.strptime(expiration, "%Y-%m-%d")
        expiration_timestamp = time.mktime(struct_time.timetuple())

        if time.time() > expiration_timestamp:
            # already expired
            result['already_expired'] = True
        elif time.time() + 30 * 24 * 60 * 60 > expiration_timestamp:
            # will be expired in 30 days
            result['to_be_expired'] = True

        result['expiration_date'] = expiration

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required
@sys_staff_required
def sys_inst_admin(request):
    """List institutions.
    """
    if request.method == "POST":
        inst_name = request.POST.get('name').strip()
        if not inst_name:
            messages.error(request, 'Name is required.')
            return HttpResponseRedirect(reverse('sys_inst_admin'))

        Institution.objects.create(name=inst_name)
        messages.success(request, _('Success'))

        return HttpResponseRedirect(reverse('sys_inst_admin'))

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '100'))
    except ValueError:
        current_page = 1
        per_page = 100

    offset = per_page * (current_page - 1)
    insts = Institution.objects.all()[offset:offset + per_page + 1]

    if len(insts) == per_page + 1:
        page_next = True
    else:
        page_next = False

    return render_to_response(
        'sysadmin/sys_inst_admin.html', {
            'insts': insts[:per_page],
            'current_page': current_page,
            'prev_page': current_page - 1,
            'next_page': current_page + 1,
            'per_page': per_page,
            'page_next': page_next,
        }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
@require_POST
def sys_inst_remove(request, inst_id):
    """Delete an institution.
    """
    try:
        inst = Institution.objects.get(pk=inst_id)
    except Institution.DoesNotExist:
        raise Http404

    inst.delete()
    messages.success(request, _('Success'))

    return HttpResponseRedirect(reverse('sys_inst_admin'))

@login_required
@sys_staff_required
def sys_inst_info_user(request, inst_id):
    """List institution members including admins.
    """
    try:
        inst = Institution.objects.get(pk=inst_id)
    except Institution.DoesNotExist:
        raise Http404

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '100'))
    except ValueError:
        current_page = 1
        per_page = 100

    offset = per_page * (current_page - 1)
    inst_admins = [x.user for x in InstitutionAdmin.objects.filter(institution=inst)]
    usernames = [x.user for x in Profile.objects.filter(institution=inst.name)[offset:offset + per_page + 1]]
    if len(usernames) == per_page + 1:
        page_next = True
    else:
        page_next = False
    users = [User.objects.get(x) for x in usernames[:per_page]]

    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in users])
    for u in users:
        _populate_user_quota_usage(u)

        if u.username in inst_admins:
            u.inst_admin = True
        else:
            u.inst_admin = False

        # populate user last login time
        u.last_login = None
        for last_login in last_logins:
            if last_login.username == u.email:
                u.last_login = last_login.last_login

    users_count = Profile.objects.filter(institution=inst.name).count()
    space_quota = InstitutionQuota.objects.get_or_none(institution=inst)
    space_usage = get_institution_space_usage(inst)

    return render_to_response('sysadmin/sys_inst_info_user.html', {
        'inst': inst,
        'users': users,
        'users_count': users_count,
        'current_page': current_page,
        'prev_page': current_page - 1,
        'next_page': current_page + 1,
        'per_page': per_page,
        'page_next': page_next,
        'space_usage': space_usage,
        'space_quota': space_quota,
    }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_inst_search_user(request, inst_id):
    """Search institution members.
    """
    try:
        inst = Institution.objects.get(pk=inst_id)
    except Institution.DoesNotExist:
        raise Http404

    q = request.GET.get('q', '').lower()
    if not q:
        return HttpResponseRedirect(reverse('sys_inst_info_users', args=[inst_id]))

    profiles = Profile.objects.filter(institution=inst.name)
    usernames = [x.user for x in profiles if q in x.user]
    users = [User.objects.get(x) for x in usernames]

    inst_admins = [x.user for x in InstitutionAdmin.objects.filter(institution=inst)]
    last_logins = UserLastLogin.objects.filter(username__in=[x for x in users])
    for u in users:
        _populate_user_quota_usage(u)

        if u.username in inst_admins:
            u.inst_admin = True
        else:
            u.inst_admin = False

        # populate user last login time
        u.last_login = None
        for last_login in last_logins:
            if last_login.username == u.email:
                u.last_login = last_login.last_login

    users_count = Profile.objects.filter(institution=inst.name).count()

    return render_to_response('sysadmin/sys_inst_search_user.html', {
        'q': q,
        'inst': inst,
        'users': users,
        'users_count': users_count,
    }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_inst_info_admins(request, inst_id):
    """List institution admins.
    """
    try:
        inst = Institution.objects.get(pk=inst_id)
    except Institution.DoesNotExist:
        raise Http404

    inst_admins = [x.user for x in InstitutionAdmin.objects.filter(institution=inst)]
    admins = [User.objects.get(x) for x in inst_admins]

    last_logins = UserLastLogin.objects.filter(username__in=[x.email for x in admins])
    for u in admins:
        _populate_user_quota_usage(u)

        # populate user last login time
        u.last_login = None
        for last_login in last_logins:
            if last_login.username == u.email:
                u.last_login = last_login.last_login

    users_count = Profile.objects.filter(institution=inst.name).count()

    return render_to_response('sysadmin/sys_inst_info_admins.html', {
        'inst': inst,
        'admins': admins,
        'users_count': users_count,
    }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
@require_POST
def sys_inst_toggle_admin(request, inst_id, email):
    """Set or revoke an institution admin.
    """
    try:
        inst = Institution.objects.get(pk=inst_id)
    except Institution.DoesNotExist:
        raise Http404

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = reverse('sys_inst_info_users', args=[inst.pk])

    try:
        u = User.objects.get(email=email)
    except User.DoesNotExist:
        assert False, 'TODO'

    if u.is_staff:
        messages.error(
            request, 'Can not assign institutional administration roles to global administrators')
        return HttpResponseRedirect(next)

    res = InstitutionAdmin.objects.filter(institution=inst, user=email)
    if len(res) == 0:
        InstitutionAdmin.objects.create(institution=inst, user=email)
    elif len(res) == 1:
        res[0].delete()
        # todo: expire user's session
    else:
        assert False

    messages.success(request, _('Success'))
    return HttpResponseRedirect(next)

@login_required
@sys_staff_required
@require_POST
def sys_inst_set_quota(request, inst_id):
    """Set institution quota"""
    try:
        inst = Institution.objects.get(pk=inst_id)
    except Institution.DoesNotExist:
        raise Http404

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = reverse('sys_inst_info_users', args=[inst.pk])

    quota_mb = int(request.POST.get('space_quota', ''))
    quota = quota_mb * get_file_size_unit('MB')

    obj, created = InstitutionQuota.objects.update_or_create(
        institution=inst,
        defaults={'quota': quota},
    )
    content_type = 'application/json; charset=utf-8'
    return HttpResponse(json.dumps({'success': True}), status=200,
                        content_type=content_type)

@login_required
@sys_staff_required
def sys_invitation_admin(request):
    """List all invitations .
    """

    if not ENABLE_GUEST_INVITATION:
        raise Http404

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '100'))
    except ValueError:
        current_page = 1
        per_page = 100

    offset = per_page * (current_page - 1)
    limit = per_page + 1
    invitations = Invitation.objects.all().order_by('-invite_time')[offset:offset + limit]

    if len(invitations) == per_page + 1:
        page_next = True
    else:
        page_next = False

    return render_to_response(
        'sysadmin/sys_invitations_admin.html', {
            'invitations': invitations,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

@login_required
@sys_staff_required
def sys_invitation_remove(request):
    """Delete an invitation.
    """
    ct = 'application/json; charset=utf-8'
    result = {}

    if not ENABLE_GUEST_INVITATION:
        return HttpResponse(json.dumps({}), status=400, content_type=ct)

    inv_id = request.POST.get('inv_id', '')
    if not inv_id:
        result = {'error': "Argument missing"}
        return HttpResponse(json.dumps(result), status=400, content_type=ct)

    inv = get_object_or_404(Invitation, pk=inv_id)
    inv.delete()

    return HttpResponse(json.dumps({'success': True}), content_type=ct)

@login_required
@sys_staff_required
def sys_terms_admin(request):
    """List Terms and Conditions"""
    if request.method == "POST":
        content_type = 'application/json; charset=utf-8'

        form = TermsAndConditionsForm(request.POST)
        if form.is_valid():
            name = form.cleaned_data['name']
            version_number = form.cleaned_data['version_number']
            text = form.cleaned_data['text']
            enabled = True if request.POST.get('status', '0') == '1' else False
            if enabled:
                date_active = timezone.now()
            else:
                date_active = None
            pk = request.POST.get('pk', None)
            if not pk:          # create
                t_c = TermsAndConditions.objects.create(
                    name=name, version_number=version_number, text=text,
                    date_active=date_active)
            else:               # update
                t_c = TermsAndConditions.objects.get(pk=pk)
                t_c.text = text
                t_c.version_number = version_number
                t_c.name = name
                t_c.date_active = date_active
                t_c.save()

            return HttpResponse(json.dumps({'success': True}),
                                content_type=content_type)
        else:
            return HttpResponse(json.dumps({
                'error': str(form.errors.values()[0])
            }), status=400, content_type=content_type)

    tc_list = TermsAndConditions.objects.all().order_by('-date_created')

    return render_to_response('sysadmin/sys_terms_admin.html', {
        'object_list': tc_list,
    }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
@require_POST
def sys_delete_terms(request, pk):
    TermsAndConditions.objects.filter(pk=pk).delete()
    messages.success(request, _('Successfully deleted 1 item'))

    return HttpResponseRedirect(reverse('sys_terms_admin'))

