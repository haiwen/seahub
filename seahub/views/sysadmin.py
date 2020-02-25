# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import os
from io import BytesIO
from types import FunctionType
import logging
import json
import re
import datetime
import time
from constance import config
from openpyxl import load_workbook

from django.db.models import Q
from django.conf import settings as dj_settings
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.http import HttpResponse, Http404, HttpResponseRedirect, HttpResponseNotAllowed
from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.utils.translation import ugettext as _
from django.utils.http import urlquote

import seaserv
from seaserv import ccnet_threaded_rpc, seafserv_threaded_rpc, \
    seafile_api, get_group, get_group_members, ccnet_api, \
    get_related_users_by_org_repo
from pysearpc import SearpcError

from seahub.base.accounts import User
from seahub.base.models import UserLastLogin
from seahub.base.decorators import sys_staff_required, require_POST
from seahub.base.sudo_mode import update_sudo_mode_ts
from seahub.base.templatetags.seahub_tags import tsstr_sec, email2nickname, \
    email2contact_email
from seahub.auth import authenticate
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.constants import GUEST_USER, DEFAULT_USER, DEFAULT_ADMIN, \
        SYSTEM_ADMIN, DAILY_ADMIN, AUDIT_ADMIN, HASH_URLS, DEFAULT_ORG
from seahub.institutions.models import (Institution, InstitutionAdmin,
                                        InstitutionQuota)
from seahub.institutions.utils import get_institution_space_usage
from seahub.invitations.models import Invitation
from seahub.role_permissions.utils import get_available_roles, \
        get_available_admin_roles
from seahub.role_permissions.models import AdminRole
from seahub.two_factor.models import default_device
from seahub.utils import IS_EMAIL_CONFIGURED, string2list, is_valid_username, \
    is_pro_version, send_html_email, \
    get_server_id, handle_virus_record, get_virus_record_by_id, \
    get_virus_record, FILE_AUDIT_ENABLED, get_max_upload_file_size, \
    get_site_name, seafevents_api
from seahub.utils.ip import get_remote_ip
from seahub.utils.file_size import get_file_size_unit
from seahub.utils.ldap import get_ldap_info
from seahub.utils.licenseparse import parse_license, user_number_over_limit
from seahub.utils.rpc import mute_seafile_api
from seahub.utils.sysinfo import get_platform_name
from seahub.utils.mail import send_html_email_with_dj_template
from seahub.utils.ms_excel import write_xls
from seahub.utils.user_permissions import get_basic_user_roles, \
        get_user_role, get_basic_admin_roles
from seahub.utils.auth import get_login_bg_image_path
from seahub.utils.repo import get_related_users_by_repo, get_repo_owner
from seahub.views import get_system_default_repo_id
from seahub.forms import SetUserQuotaForm, AddUserForm, BatchAddUserForm, \
    TermsAndConditionsForm
from seahub.options.models import UserOptions
from seahub.profile.models import Profile, DetailedProfile
from seahub.signals import repo_deleted, institution_deleted
from seahub.share.models import FileShare, UploadLinkShare
from seahub.admin_log.signals import admin_operation
from seahub.admin_log.models import USER_DELETE, USER_ADD
import seahub.settings as settings
from seahub.settings import INIT_PASSWD, SITE_ROOT, \
    SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER, SEND_EMAIL_ON_RESETTING_USER_PASSWD, \
    ENABLE_SYS_ADMIN_VIEW_REPO, ENABLE_GUEST_INVITATION, \
    ENABLE_LIMIT_IPADDRESS, ENABLE_SHARE_LINK_REPORT_ABUSE

try:
    from seahub.settings import ENABLE_TRIAL_ACCOUNT
except:
    ENABLE_TRIAL_ACCOUNT = False
if ENABLE_TRIAL_ACCOUNT:
    from seahub_extra.trialaccount.models import TrialAccount
try:
    from seahub.settings import MULTI_TENANCY
    from seahub_extra.organizations.models import OrgSettings
except ImportError:
    MULTI_TENANCY = False
try:
    from seahub.settings import ENABLE_SYSADMIN_EXTRA
except ImportError:
    ENABLE_SYSADMIN_EXTRA = False
from seahub.utils.two_factor_auth import has_two_factor_auth
from termsandconditions.models import TermsAndConditions
try:
    from seahub.settings import ENABLE_FILE_SCAN
except ImportError:
    ENABLE_FILE_SCAN = False
from seahub.work_weixin.settings import ENABLE_WORK_WEIXIN


logger = logging.getLogger(__name__)

@login_required
@sys_staff_required
def sysadmin_react_fake_view(request, **kwargs):

    try:
        expire_days = seafile_api.get_server_config_int('library_trash', 'expire_days')
    except Exception as e:
        logger.error(e)
        expire_days = -1

    multi_institution = getattr(dj_settings, 'MULTI_INSTITUTION', False)
    institutions = None
    if multi_institution:
        institutions = [inst.name for inst in Institution.objects.all()]

    return render(request, 'sysadmin/sysadmin_react_app.html', {
        'constance_enabled': dj_settings.CONSTANCE_ENABLED,
        'multi_tenancy': MULTI_TENANCY,
        'multi_institution': multi_institution,
        'institutions': institutions,
        'send_email_on_adding_system_member': SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER,
        'sysadmin_extra_enabled': ENABLE_SYSADMIN_EXTRA,
        'enable_guest_invitation': ENABLE_GUEST_INVITATION,
        'enable_terms_and_conditions': config.ENABLE_TERMS_AND_CONDITIONS,
        'enable_file_scan': ENABLE_FILE_SCAN,
        'enable_work_weixin': ENABLE_WORK_WEIXIN,
        'enable_sys_admin_view_repo': ENABLE_SYS_ADMIN_VIEW_REPO,
        'trash_repos_expire_days': expire_days if expire_days > 0 else 30,
        'available_roles': get_available_roles(),
        'available_admin_roles': get_available_admin_roles(),
        'have_ldap': get_ldap_info(),
        'two_factor_auth_enabled': has_two_factor_auth(),
        'enable_share_link_report_abuse': ENABLE_SHARE_LINK_REPORT_ABUSE,
    })

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
    user.contact_email = email2contact_email(user.email)
    user.name = email2nickname(user.email)

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
def sys_useradmin_export_excel(request):
    """ Export all users from database to excel
    """

    next_page = request.META.get('HTTP_REFERER', None)
    if not next_page:
        next_page = SITE_ROOT

    try:
        users = ccnet_api.get_emailusers('DB', -1, -1) + \
                ccnet_api.get_emailusers('LDAPImport', -1, -1)
    except Exception as e:
        logger.error(e)
        messages.error(request, _('Failed to export Excel'))
        return HttpResponseRedirect(next_page)

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

    # only operate 100 users for every `for` loop
    looped = 0
    limit = 100
    data_list = []

    while looped < len(users):

        current_users = users[looped:looped+limit]

        last_logins = UserLastLogin.objects.filter(username__in=[x.email \
                for x in current_users])
        user_profiles = Profile.objects.filter(user__in=[x.email \
                for x in current_users])

        for user in current_users:
            # populate name and contact email
            user.contact_email = ''
            user.name = ''
            for profile in user_profiles:
                if profile.user == user.email:
                    user.contact_email = profile.contact_email
                    user.name = profile.nickname

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
                if user.role:
                    if user.role == GUEST_USER:
                        role = _('Guest')
                    elif user.role == DEFAULT_USER:
                        role = _('Default')
                    else:
                        role = user.role
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

        # update `looped` value when `for` loop finished
        looped += limit

    wb = write_xls('users', head, data_list)
    if not wb:
        messages.error(request, _('Failed to export Excel'))
        return HttpResponseRedirect(next_page)

    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = 'attachment; filename=users.xlsx'
    wb.save(response)
    return response

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

    owned_repos = [r for r in owned_repos if not r.is_virtual]

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

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        raise Http404

    reference_id = user.reference_id
    user_default_device = default_device(user) if has_two_factor_auth() else False

    force_2fa = UserOptions.objects.is_force_2fa(user.username)

    return render(request,
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
            'two_factor_auth_enabled': has_two_factor_auth(),
            'default_device': user_default_device,
            'force_2fa': force_2fa,
            'reference_id': reference_id if reference_id else '',
        })

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
                    result['error'] = _('Failed to set quota: maximum quota is %d MB' % \
                                            org_quota_mb)
                    return HttpResponse(json.dumps(result), status=400, content_type=content_type)
                else:
                    seafile_api.set_org_user_quota(org_id, email, space_quota)
        except:
            result['error'] = _('Failed to set quota: internal server error')
            return HttpResponse(json.dumps(result), status=500, content_type=content_type)

        result['success'] = True
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        result['error'] = str(list(f.errors.values())[0])
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
        result['error'] = _('Failed to set quota: internal server error')
        return HttpResponse(json.dumps(result), status=500, content_type=content_type)

    result['success'] = True
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required
@sys_staff_required
@require_POST
def user_remove(request, email):
    """Remove user"""
    referer = request.META.get('HTTP_REFERER', None)
    next_page = reverse('sys_info') if referer is None else referer

    try:
        user = User.objects.get(email=email)
        org = ccnet_api.get_orgs_by_user(user.email)
        if org:
            if org[0].creator == user.email:
                messages.error(request, _('Failed to delete: the user is an organization creator'))
                return HttpResponseRedirect(next_page)

        user.delete()
        messages.success(request, _('Successfully deleted %s') % user.username)

        # send admin operation log signal
        admin_op_detail = {
            "email": email,
        }
        admin_operation.send(sender=None, admin_name=request.user.username,
                operation=USER_DELETE, detail=admin_op_detail)

    except User.DoesNotExist:
        messages.error(request, _('Failed to delete: the user does not exist'))

    return HttpResponseRedirect(next_page)

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
    next_page = reverse('sys_info') if referer is None else referer

    TrialAccount.objects.filter(user_or_org=user_or_org).delete()

    messages.success(request, _('Successfully remove trial for: %s') % user_or_org)
    return HttpResponseRedirect(next_page)

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
        messages.success(request, _('Successfully revoke the admin permission of %s') % user.username)
    except User.DoesNotExist:
        messages.error(request, _('Failed to revoke admin: the user does not exist'))

    referer = request.META.get('HTTP_REFERER', None)
    next_page = reverse('sys_info') if referer is None else referer

    return HttpResponseRedirect(next_page)

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
    send_html_email(_('Your account on %s is activated') % get_site_name(),
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
    send_html_email(_('Password has been reset on %s') % get_site_name(),
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
                except Exception as e:
                    logger.error(str(e))
                    msg = _('Successfully reset password to %(passwd)s, but failed to send email to %(user)s, please check your email configuration.') % \
                        {'passwd':new_password, 'user': user.email}
                    messages.success(request, msg)
            else:
                messages.success(request, _('Successfully reset password to %(passwd)s for user %(user)s.') % \
                                     {'passwd':new_password,'user': user.email})
        else:
            messages.success(request, _('Successfully reset password to %(passwd)s for user %(user)s. But email notification can not be sent, because Email service is not properly configured.') % \
                                 {'passwd':new_password,'user': user.email})
    except User.DoesNotExist:
        msg = _('Failed to reset password: user does not exist')
        messages.error(request, msg)

    referer = request.META.get('HTTP_REFERER', None)
    next_page = reverse('sys_info') if referer is None else referer

    return HttpResponseRedirect(next_page)

def send_user_add_mail(request, email, password):
    """Send email when add new user."""
    c = {
        'user': request.user.username,
        'org': request.user.org,
        'email': email,
        'password': password,
        }
    send_html_email(_('You are invited to join %s') % get_site_name(),
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
            err_msg = _('Fail to add user %s.') % email
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
                    messages.success(request, _('Successfully added user %s. An email notification has been sent.') % email)
                except Exception as e:
                    logger.error(str(e))
                    messages.success(request, _('Successfully added user %s. An error accurs when sending email notification, please check your email configuration.') % email)
            else:
                messages.success(request, _('Successfully added user %s.') % email)

            return HttpResponse(json.dumps({'success': True}), content_type=content_type)
        else:
            if IS_EMAIL_CONFIGURED:
                if SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER:
                    try:
                        send_user_add_mail(request, email, password)
                        messages.success(request, _('Successfully added user %s. An email notification has been sent.') % email)
                    except Exception as e:
                        logger.error(str(e))
                        messages.success(request, _('Successfully added user %s. An error accurs when sending email notification, please check your email configuration.') % email)
                else:
                    messages.success(request, _('Successfully added user %s.') % email)
            else:
                messages.success(request, _('Successfully added user %s. But email notification can not be sent, because Email service is not properly configured.') % email)

            return HttpResponse(json.dumps({'success': True}), content_type=content_type)
    else:
        return HttpResponse(json.dumps({'error': str(list(form.errors.values())[0])}), status=400, content_type=content_type)

@login_required
@sys_staff_required
def sys_group_admin_export_excel(request):
    """ Export all groups to excel
    """

    next_page = request.META.get('HTTP_REFERER', None)
    if not next_page:
        next_page = SITE_ROOT

    try:
        groups = ccnet_threaded_rpc.get_all_groups(-1, -1)
    except Exception as e:
        logger.error(e)
        messages.error(request, _('Failed to export Excel'))
        return HttpResponseRedirect(next_page)

    head = [_("Name"), _("Creator"), _("Create At")]
    data_list = []
    for grp in groups:
        create_at = tsstr_sec(grp.timestamp) if grp.timestamp else ''
        row = [grp.group_name, grp.creator_name, create_at]
        data_list.append(row)

    wb = write_xls('groups', head, data_list)
    if not wb:
        messages.error(request, _('Failed to export Excel'))
        return HttpResponseRedirect(next_page)

    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = 'attachment; filename=groups.xlsx'
    wb.save(response)
    return response

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
        messages.success(request, _('Success'))
        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=content_type)
    else:
        return HttpResponse(json.dumps({ 'error': _('Input number should be greater than 0')}),
                            status=400, content_type=content_type)

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
    user_emails = list({}.fromkeys(user_emails).keys())

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

    return render(request, 'sysadmin/user_search.html', {
            'users': users,
            'email': email,
            'default_user': DEFAULT_USER,
            'guest_user': GUEST_USER,
            'is_pro': is_pro_version(),
            'extra_user_roles': extra_user_roles,
            })

@login_required
@sys_staff_required
@require_POST
def sys_repo_delete(request, repo_id):
    """Delete a repo.
    """
    next_page = request.META.get('HTTP_REFERER', None)
    if not next_page:
        next_page = HASH_URLS['SYS_REPO_ADMIN']

    if get_system_default_repo_id() == repo_id:
        messages.error(request, _('System library can not be deleted.'))
        return HttpResponseRedirect(next_page)

    repo = seafile_api.get_repo(repo_id)
    if repo:                    # Handle the case that repo is `None`.
        repo_name = repo.name
    else:
        repo_name = ''

    repo_owner = get_repo_owner(request, repo_id)
    try:
        org_id = seafile_api.get_org_id_by_repo_id(repo_id)
        usernames = get_related_users_by_repo(repo_id,
                org_id if org_id and org_id > 0 else None)
    except Exception as e:
        logger.error(e)
        org_id = -1
        usernames = []

    seafile_api.remove_repo(repo_id)
    repo_deleted.send(sender=None, org_id=org_id, operator=request.user.username,
            usernames=usernames, repo_owner=repo_owner, repo_id=repo_id,
            repo_name=repo_name)

    messages.success(request, _('Successfully deleted.'))
    return HttpResponseRedirect(next_page)

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
        messages.success(request, _('Successfully set %s as admin.') % item)
    for item in failed:
        messages.error(request, _('Failed to set %s as admin: user does not exist.') % item)

    return HttpResponse(json.dumps({'success': True,}), content_type=content_type)

@login_required
@sys_staff_required
def batch_add_user_example(request):
    """ get example file.
    """
    next_page = request.META.get('HTTP_REFERER', None)
    if not next_page:
        next_page = SITE_ROOT
    data_list = []
    head = [_('Email'), _('Password'), _('Name')+ '(' + _('Optional') + ')',
            _('Role') + '(' + _('Optional') + ')', _('Space Quota') + '(MB, ' + _('Optional') + ')']
    for i in range(5):
        username = "test" + str(i) +"@example.com"
        password = "123456"
        name = "test" + str(i)
        role = "default"
        quota = "1000"
        data_list.append([username, password, name, role, quota])

    wb = write_xls('sample', head, data_list)
    if not wb:
        messages.error(request, _('Failed to export Excel'))
        return HttpResponseRedirect(next_page)

    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = 'attachment; filename=users.xlsx'
    wb.save(response)
    return response

@login_required
def sys_sudo_mode(request):
    if request.method not in ('GET', 'POST'):
        return HttpResponseNotAllowed

    # here we can't use @sys_staff_required
    if not request.user.is_staff:
        raise Http404

    next_page = request.GET.get('next', reverse('sys_info'))
    password_error = False
    if request.method == 'POST':
        password = request.POST.get('password')
        username = request.user.username
        ip = get_remote_ip(request)
        if password:
            user = authenticate(username=username, password=password)
            if user:
                update_sudo_mode_ts(request)

                from seahub.auth.utils import clear_login_failed_attempts
                clear_login_failed_attempts(request, username)

                return HttpResponseRedirect(next_page)
        password_error = True

        from seahub.auth.utils import get_login_failed_attempts, incr_login_failed_attempts
        failed_attempt = get_login_failed_attempts(username=username, ip=ip)
        if failed_attempt >= config.LOGIN_ATTEMPT_LIMIT:
            # logout user
            from seahub.auth import logout
            logout(request)
            return HttpResponseRedirect(reverse('auth_login'))
        else:
            incr_login_failed_attempts(username=username, ip=ip)

    enable_shib_login = getattr(settings, 'ENABLE_SHIB_LOGIN', False)
    enable_adfs_login = getattr(settings, 'ENABLE_ADFS_LOGIN', False)
    return render(request,
        'sysadmin/sudo_mode.html', {
            'password_error': password_error,
            'enable_sso': enable_shib_login or enable_adfs_login,
            'next': next_page,
        })

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

    return render(request,
        'sysadmin/sys_invitations_admin.html', {
            'invitations': invitations,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        })

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
                'error': str(list(form.errors.values())[0])
            }), status=400, content_type=content_type)

    tc_list = TermsAndConditions.objects.all().order_by('-date_created')

    return render(request, 'sysadmin/sys_terms_admin.html', {
        'object_list': tc_list,
    })

@login_required
@sys_staff_required
@require_POST
def sys_delete_terms(request, pk):
    TermsAndConditions.objects.filter(pk=pk).delete()
    messages.success(request, _('Successfully deleted 1 item'))

    return HttpResponseRedirect(reverse('sys_terms_admin'))
