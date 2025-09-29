# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
from django.conf import settings
import json
from django.urls import reverse
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render
from django.contrib import messages
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.translation import gettext as _

import seaserv
from seaserv import seafile_api

from seahub.utils.auth import is_force_user_sso, can_user_update_password
from .forms import DetailedProfileForm
from .models import Profile, DetailedProfile
from seahub.auth.models import SocialAuthUser
from seahub.auth.decorators import login_required
from seahub.base.accounts import User, UNUSABLE_PASSWORD
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.contacts.models import Contact
from seahub.options.models import UserOptions, CryptoOptionNotSetError, DEFAULT_COLLABORATE_EMAIL_INTERVAL
from seahub.utils import is_org_context, is_pro_version, is_valid_username, \
        is_ldap_user, get_webdav_url
from seahub.utils.two_factor_auth import has_two_factor_auth
from seahub.views import get_owned_repo_list
from seahub.work_weixin.utils import work_weixin_oauth_check
from seahub.dingtalk.settings import ENABLE_DINGTALK
from seahub.weixin.settings import ENABLE_WEIXIN
from seahub.organizations.models import OrgSAMLConfig

from constance import config
from seahub.settings import ENABLE_DELETE_ACCOUNT, ENABLE_UPDATE_USER_INFO, \
        ENABLE_ADFS_LOGIN, ENABLE_MULTI_ADFS
try:
    from seahub.settings import SAML_PROVIDER_IDENTIFIER
except ImportError:
    SAML_PROVIDER_IDENTIFIER = 'saml'


@login_required
def edit_profile(request):
    """
    Show and edit user profile.
    """
    username = request.user.username
    form_class = DetailedProfileForm

    if request.method == 'POST':
        form = form_class(user=request.user, data=request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, _('Successfully edited profile.'))

            return HttpResponseRedirect(reverse('edit_profile'))
        else:
            messages.error(request, _('Failed to edit profile'))
    else:
        profile = Profile.objects.get_profile_by_user(username)
        d_profile = DetailedProfile.objects.get_detailed_profile_by_user(
            username)

        init_dict = {}
        if profile:
            init_dict['nickname'] = profile.nickname
            init_dict['login_id'] = profile.login_id
            init_dict['contact_email'] = profile.contact_email
            init_dict['list_in_address_book'] = profile.list_in_address_book
        if d_profile:
            init_dict['department'] = d_profile.department
            init_dict['telephone'] = d_profile.telephone

        form = form_class(user=request.user, data=init_dict)

    # common logic
    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False

    sub_lib_enabled = UserOptions.objects.is_sub_lib_enabled(username)

    default_repo_id = UserOptions.objects.get_default_repo(username)
    if default_repo_id:
        default_repo = seafile_api.get_repo(default_repo_id)
    else:
        default_repo = None

    owned_repos = get_owned_repo_list(request)
    owned_repos = [r for r in owned_repos if not r.is_virtual]

    file_updates_email_interval = UserOptions.objects.get_file_updates_email_interval(username)
    file_updates_email_interval = file_updates_email_interval if file_updates_email_interval is not None else 0
    collaborate_email_interval = UserOptions.objects.get_collaborate_email_interval(username)
    collaborate_email_interval = collaborate_email_interval if collaborate_email_interval is not None else DEFAULT_COLLABORATE_EMAIL_INTERVAL

    if work_weixin_oauth_check():
        enable_wechat_work = True
        from seahub.work_weixin.settings import WORK_WEIXIN_PROVIDER
        social_connected = SocialAuthUser.objects.filter(
            username=request.user.username, provider=WORK_WEIXIN_PROVIDER).count() > 0
    else:
        enable_wechat_work = False
        social_connected = False

    if ENABLE_DINGTALK:
        enable_dingtalk = True
        social_connected_dingtalk = SocialAuthUser.objects.filter(
            username=request.user.username, provider='dingtalk').count() > 0
    else:
        enable_dingtalk = False
        social_connected_dingtalk = False

    if ENABLE_WEIXIN:
        enable_weixin = True
        social_connected_weixin = SocialAuthUser.objects.filter(
            username=request.user.username, provider='weixin').count() > 0
    else:
        enable_weixin = False
        social_connected_weixin = False

    if ENABLE_ADFS_LOGIN:
        enable_adfs = True
        saml_connected = SocialAuthUser.objects.filter(
            username=request.user.username, provider=SAML_PROVIDER_IDENTIFIER).exists()
    else:
        enable_adfs = False
        saml_connected = False

    enable_multi_adfs = False
    org_saml_connected = False
    if is_org_context(request):
        org_id = request.user.org.org_id
        org_saml_config = OrgSAMLConfig.objects.get_config_by_org_id(org_id)
        if ENABLE_MULTI_ADFS and  \
                org_saml_config is not None and org_saml_config.domain_verified:
            enable_multi_adfs = True
            org_saml_connected = SocialAuthUser.objects.filter(
                username=request.user.username, provider=SAML_PROVIDER_IDENTIFIER).exists()

    can_update_password = can_user_update_password(request.user)

    WEBDAV_SECRET_SETTED = False
    if settings.ENABLE_WEBDAV_SECRET and \
            UserOptions.objects.get_webdav_secret(username):
        WEBDAV_SECRET_SETTED = True

    show_two_factor_auth = has_two_factor_auth() and not request.session.get('is_sso_user')
    force_user_sso_login = is_force_user_sso(request.user)

    resp_dict = {
            'form': form,
            'server_crypto': server_crypto,
            "sub_lib_enabled": sub_lib_enabled,
            'ENABLE_ADDRESSBOOK_OPT_IN': settings.ENABLE_ADDRESSBOOK_OPT_IN,
            'default_repo': default_repo,
            'owned_repos': owned_repos,
            'is_pro': is_pro_version(),
            'is_ldap_user': is_ldap_user(request.user),
            'two_factor_auth_enabled': show_two_factor_auth,
            'ENABLE_CHANGE_PASSWORD': can_update_password,
            'ENABLE_GET_AUTH_TOKEN_BY_SESSION': settings.ENABLE_GET_AUTH_TOKEN_BY_SESSION,
            'ENABLE_WEBDAV_SECRET': settings.ENABLE_WEBDAV_SECRET,
            'WEBDAV_SECRET_SETTED': WEBDAV_SECRET_SETTED,
            'WEBDAV_URL': get_webdav_url(),
            'WEBDAV_SECRET_MIN_LENGTH': settings.WEBDAV_SECRET_MIN_LENGTH,
            'WEBDAV_SECRET_STRENGTH_LEVEL': settings.WEBDAV_SECRET_STRENGTH_LEVEL,
            'ENABLE_DELETE_ACCOUNT': ENABLE_DELETE_ACCOUNT and not is_org_context(request),
            'ENABLE_UPDATE_USER_INFO': ENABLE_UPDATE_USER_INFO,
            'file_updates_email_interval': file_updates_email_interval,
            'collaborate_email_interval': collaborate_email_interval,
            'social_next_page': reverse('edit_profile'),
            'enable_wechat_work': enable_wechat_work,
            'social_connected': social_connected,
            'enable_dingtalk': enable_dingtalk,
            'social_connected_dingtalk': social_connected_dingtalk,
            'enable_weixin': enable_weixin,
            'social_connected_weixin': social_connected_weixin,
            'ENABLE_USER_SET_CONTACT_EMAIL': settings.ENABLE_USER_SET_CONTACT_EMAIL,
            'ENABLE_USER_SET_NAME': settings.ENABLE_USER_SET_NAME,
            'user_unusable_password': request.user.enc_password == UNUSABLE_PASSWORD,
            'enable_adfs': enable_adfs,
            'saml_connected': saml_connected,
            'enable_multi_adfs': enable_multi_adfs,
            'force_user_sso_login': force_user_sso_login,
            'org_saml_connected': org_saml_connected,
            'org_id': request.user.org and request.user.org.org_id or None,
            'strong_pwd_required': bool(config.USER_STRONG_PASSWORD_REQUIRED),
    }

    if show_two_factor_auth:
        from seahub.two_factor.models import StaticDevice, default_device

        try:
            backup_tokens = StaticDevice.objects.get(
                user=request.user.username).token_set.count()
        except StaticDevice.DoesNotExist:
            backup_tokens = 0

        resp_dict['default_device'] = default_device(request.user)
        resp_dict['backup_tokens'] = backup_tokens

    # template = 'profile/set_profile.html'
    template = 'profile/set_profile_react.html'
    return render(request, template, resp_dict)


@login_required
def user_profile(request, username):
    if is_valid_username(username):
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            user = None
    else:
        user = None

    if user is not None:
        nickname = email2nickname(user.username)
        contact_email = Profile.objects.get_contact_email_by_user(user.username)
        d_profile = DetailedProfile.objects.get_detailed_profile_by_user(
            user.username)
    else:
        nickname = ''
        contact_email = ''
        d_profile = None

    return render(request, 'profile/user_profile.html', {
            'user': user,
            'nickname': nickname,
            'contact_email': contact_email,
            'd_profile': d_profile,
            })


@login_required
def get_user_profile(request, user):
    data = {
            'email': user,
            'user_nickname': '',
            'user_intro': '',
            'err_msg': '',
            'new_user': ''
        }
    content_type = 'application/json; charset=utf-8'

    try:
        user_check = User.objects.get(email=user)
    except User.DoesNotExist:
        user_check = None

    if user_check:
        profile = Profile.objects.filter(user=user)
        if profile:
            profile = profile[0]
            data['user_nickname'] = profile.nickname
            data['user_intro'] = profile.intro
    else:
        data['user_intro'] = _('Has not accepted invitation yet')

    if user == request.user.username or \
            Contact.objects.filter(user_email=request.user.username,
                                   contact_email=user).count() > 0:
        data['new_user'] = False
    else:
        data['new_user'] = True

    return HttpResponse(json.dumps(data), content_type=content_type)


@login_required
def delete_user_account(request):
    if not ENABLE_DELETE_ACCOUNT or is_org_context(request):
        messages.error(request, _('Permission denied.'))
        next_page = request.headers.get('referer', settings.SITE_ROOT)
        if not url_has_allowed_host_and_scheme(url=next_page, allowed_hosts=request.get_host()):
            next_page = settings.SITE_ROOT
        return HttpResponseRedirect(next_page)

    if request.method != 'POST':
        raise Http404

    username = request.user.username

    if username == 'demo@seafile.com':
        messages.error(request, _('Demo account can not be deleted.'))
        next_page = request.headers.get('referer', settings.SITE_ROOT)
        if not url_has_allowed_host_and_scheme(url=next_page, allowed_hosts=request.get_host()):
            next_page = settings.SITE_ROOT
        return HttpResponseRedirect(next_page)

    user = User.objects.get(email=username)
    user.delete()

    if is_org_context(request):
        org_id = request.user.org.org_id
        seaserv.ccnet_threaded_rpc.remove_org_user(org_id, username)

    return HttpResponseRedirect(settings.LOGIN_URL)


@login_required
def default_repo(request):
    """Handle post request to create default repo for user.
    """
    if request.method != 'POST':
        raise Http404

    repo_id = request.POST.get('dst_repo', '')
    referer = request.headers.get('referer', None)
    next_page = settings.SITE_ROOT if referer is None else referer
    if not url_has_allowed_host_and_scheme(url=next_page, allowed_hosts=request.get_host()):
        next_page = settings.SITE_ROOT

    repo = seafile_api.get_repo(repo_id)
    if repo is None:
        messages.error(request, _('Failed to set default library.'))
        return HttpResponseRedirect(next_page)

    if repo.encrypted:
        messages.error(request, _('Can not set encrypted library as default library.'))
        return HttpResponseRedirect(next_page)

    username = request.user.username
    UserOptions.objects.set_default_repo(username, repo.id)
    messages.success(request, _('Successfully set "%s" as your default library.') % repo.name)
    return HttpResponseRedirect(next_page)
