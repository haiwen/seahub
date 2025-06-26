# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import logging
import json
from urllib.parse import urlparse
from constance import config

from django.contrib import messages
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.utils.crypto import get_random_string
from django.core.cache import cache
from django.shortcuts import render
from django.http import HttpResponse, Http404, HttpResponseRedirect

import seaserv
from seaserv import ccnet_api

from seahub import settings
from seahub.auth import login
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.base.accounts import User
from seahub.group.views import remove_group_common
from seahub.profile.models import Profile
from seahub.utils import get_service_url, render_error
from seahub.utils.auth import get_login_bg_image_path

from seahub.organizations.models import OrgSettings
from seahub.organizations.signals import org_created, org_reactivated
from seahub.organizations.decorators import org_staff_required
from seahub.organizations.forms import OrgRegistrationForm
from seahub.organizations.settings import ORG_AUTO_URL_PREFIX, \
        ORG_MEMBER_QUOTA_ENABLED, ORG_ENABLE_ADMIN_INVITE_USER_VIA_WEIXIN, \
        ORG_ENABLE_ADMIN_CUSTOM_LOGO, ORG_ENABLE_ADMIN_CUSTOM_NAME, \
        ORG_ENABLE_ADMIN_INVITE_USER
from seahub.organizations.utils import get_or_create_invitation_link, can_multi_saml_sso
from seahub.subscription.utils import subscription_check
from seahub.billing.settings import ENABLE_EXTERNAL_BILLING_SERVICE
from registration.models import RegistrationProfile

from seahub.invitations.models import Invitation

# Get an instance of a logger

logger = logging.getLogger(__name__)

ENABLE_MULTI_ADFS = getattr(settings, 'ENABLE_MULTI_ADFS', False)


# ccnet rpc wrapper
def create_org(org_name, url_prefix, creator):
    return seaserv.create_org(org_name, url_prefix, creator)


def count_orgs():
    return seaserv.ccnet_threaded_rpc.count_orgs()


def get_org_by_url_prefix(url_prefix):
    return seaserv.ccnet_threaded_rpc.get_org_by_url_prefix(url_prefix)


def set_org_user(org_id, username, is_staff=False):
    return seaserv.ccnet_threaded_rpc.add_org_user(org_id, username,
                                                   int(is_staff))


def unset_org_user(org_id, username):
    return seaserv.ccnet_threaded_rpc.remove_org_user(org_id, username)


def org_user_exists(org_id, username):
    return seaserv.ccnet_threaded_rpc.org_user_exists(org_id, username)


def get_org_groups(org_id, start, limit):
    return seaserv.ccnet_threaded_rpc.get_org_groups(org_id, start, limit)


def get_org_id_by_group(group_id):
    return seaserv.ccnet_threaded_rpc.get_org_id_by_group(group_id)


def remove_org_group(org_id, group_id, username):
    remove_group_common(group_id, username)
    seaserv.ccnet_threaded_rpc.remove_org_group(org_id, group_id)


def is_org_staff(org_id, username):
    return seaserv.ccnet_threaded_rpc.is_org_staff(org_id, username)


def set_org_staff(org_id, username):
    return seaserv.ccnet_threaded_rpc.set_org_staff(org_id, username)


def unset_org_staff(org_id, username):
    return seaserv.ccnet_threaded_rpc.unset_org_staff(org_id, username)


# seafile rpc wrapper
def get_org_user_self_usage(org_id, username):
    """

    Arguments:
    - `org_id`:
    - `username`:
    """
    return seaserv.seafserv_threaded_rpc.get_org_user_quota_usage(org_id, username)


def get_org_user_quota(org_id, username):
    return seaserv.seafserv_threaded_rpc.get_org_user_quota(org_id, username)


def get_org_quota(org_id):
    return seaserv.seafserv_threaded_rpc.get_org_quota(org_id)


def is_org_repo(org_id, repo_id):
    return True if seaserv.seafserv_threaded_rpc.get_org_id_by_repo_id(
        repo_id) == org_id else False


# views
@login_required_ajax
def org_add(request):
    """Handle ajax request to add org, and create org owner.

    Arguments:
    - `request`:
    """
    if not request.user.is_staff or request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    url_prefix = gen_org_url_prefix(3)
    post_data = request.POST.copy()
    post_data['url_prefix'] = url_prefix
    form = OrgRegistrationForm(post_data)
    if form.is_valid():
        email = form.cleaned_data['email']
        password = form.cleaned_data['password1']
        org_name = form.cleaned_data['org_name']
        url_prefix = form.cleaned_data['url_prefix']

        try:
            new_user = User.objects.create_user(email, password,
                                                is_staff=False, is_active=True)
        except User.DoesNotExist as e:
            logger.error(e)
            err_msg = 'Fail to create organization owner %s.' % email
            return HttpResponse(json.dumps({'error': err_msg}),
                                status=403, content_type=content_type)
        create_org(org_name, url_prefix, new_user.username)

        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)
    else:
        try:
            err_msg = list(form.errors.values())[0][0]
        except IndexError:
            err_msg = list(form.errors.values())[0]
        return HttpResponse(json.dumps({'error': str(err_msg)}),
                            status=400, content_type=content_type)


def gen_org_url_prefix(max_trial=None):
    """Generate organization url prefix automatically.
    If ``max_trial`` is large than 0, then re-try that times if failed.

    Arguments:
    - `max_trial`:

    Returns:
        Url prefix if succed, otherwise, ``None``.
    """
    def _gen_prefix():
        url_prefix = 'org-' + get_random_string(
            6, allowed_chars='abcdefghijklmnopqrstuvwxyz0123456789')
        if get_org_by_url_prefix(url_prefix) is not None:
            logger.info("org url prefix, %s is duplicated" % url_prefix)
            return None
        else:
            return url_prefix

    try:
        max_trial = int(max_trial)
    except (TypeError, ValueError):
        max_trial = 0

    while max_trial >= 0:
        ret = _gen_prefix()
        if ret is not None:
            return ret
        else:
            max_trial -= 1

    logger.warning("Failed to generate org url prefix, retry: %d" % max_trial)
    return None


def org_register(request):
    """Allow a new user to register an organization account. A new
    organization will be created associate with that user.

    Arguments:
    - `request`:
    """
    login_bg_image_path = get_login_bg_image_path()

    if request.method == 'POST':
        form = OrgRegistrationForm(request.POST)

        if ORG_AUTO_URL_PREFIX:
            # generate url prefix automatically
            url_prefix = gen_org_url_prefix(3)
            if url_prefix is None:
                messages.error(request, "Failed to create organization account, please try again later.")
                return render(request, 'organizations/org_register.html', {
                    'form': form,
                    'login_bg_image_path': login_bg_image_path,
                    'org_auto_url_prefix': ORG_AUTO_URL_PREFIX,
                })

            post_data = request.POST.copy()
            post_data['url_prefix'] = url_prefix
            form = OrgRegistrationForm(post_data)

        if form.is_valid():
            name = form.cleaned_data['name']
            email = form.cleaned_data['email']
            password = form.cleaned_data['password1']
            org_name = form.cleaned_data['org_name']
            url_prefix = form.cleaned_data['url_prefix']

            username = email
            site = get_current_site(request)
            if bool(config.ACTIVATE_AFTER_REGISTRATION) is True:
                new_user = RegistrationProfile.objects.create_active_user(username, email,
                                                                          password, site,
                                                                          send_email=False)
            else:
                # create inactive user, user can be activated by admin,
                # or through activated email
                new_user = RegistrationProfile.objects.create_inactive_user(username, email,
                                                                            password, site,
                                                                            send_email=config.REGISTRATION_SEND_MAIL)

            create_org(org_name, url_prefix, new_user.username)
            new_org = get_org_by_url_prefix(url_prefix)
            org_created.send(sender=None, email=email, org=new_org)

            if name:
                Profile.objects.add_or_update(new_user.username, name)

            if new_user.is_active:
                new_user.backend = settings.AUTHENTICATION_BACKENDS[0]
                login(request, new_user)
                return HttpResponseRedirect(reverse('libraries'))
            else:
                return HttpResponseRedirect(reverse('registration_complete'))

    else:
        form = OrgRegistrationForm()

    service_url = get_service_url()
    up = urlparse(service_url)
    service_url_scheme = up.scheme
    service_url_remaining = up.netloc + up.path
    return render(request, 'organizations/org_register.html', {
        'form': form,
        'login_bg_image_path': login_bg_image_path,
        'service_url_scheme': service_url_scheme,
        'service_url_remaining': service_url_remaining,
        'org_auto_url_prefix': ORG_AUTO_URL_PREFIX,
        'strong_pwd_required': config.USER_STRONG_PASSWORD_REQUIRED
    })


@login_required
@org_staff_required
def react_fake_view(request, **kwargs):
    group_id = kwargs.get('group_id', '')
    org = request.user.org

    invitation_link = get_or_create_invitation_link(org.org_id) if ORG_ENABLE_ADMIN_INVITE_USER_VIA_WEIXIN else ''

    # Whether use new page
    return render(request, "organizations/org_admin_react.html", {
        'org': org,
        'org_member_quota_enabled': ORG_MEMBER_QUOTA_ENABLED,
        'org_enable_admin_custom_logo': ORG_ENABLE_ADMIN_CUSTOM_LOGO,
        'org_enable_admin_custom_name': ORG_ENABLE_ADMIN_CUSTOM_NAME,
        'org_enable_admin_invite_user': ORG_ENABLE_ADMIN_INVITE_USER,
        'group_id': group_id,
        'invitation_link': invitation_link,
        'enable_multi_adfs': ENABLE_MULTI_ADFS and can_multi_saml_sso(org.org_id),
        'enable_subscription': subscription_check(),
        'enable_external_billing_service': ENABLE_EXTERNAL_BILLING_SERVICE,
        'sys_enable_user_clean_trash': config.ENABLE_USER_CLEAN_TRASH,
        'sys_enable_encrypted_library': config.ENABLE_ENCRYPTED_LIBRARY
        })


@login_required
def org_associate(request, token):
    """Associate user with coresponding org.
    Mainly used for new WeChat user on doc.seafile.com.
    """
    username = request.user.username

    # validate token
    org_id = cache.get('org_associate_%s' % token, -1)
    if org_id <= 0:
        return render_error(request, _('Invalid token.'))

    # get org info
    org = ccnet_api.get_org_by_id(org_id)
    if not org:
        return render_error(request, 'Invalid org id')

    # Log user in if he/she already belongs to any orgs.
    orgs = ccnet_api.get_orgs_by_user(username)
    if orgs:
        return HttpResponseRedirect(settings.LOGIN_REDIRECT_URL)

    # check org member quota
    if ORG_MEMBER_QUOTA_ENABLED:
        from seahub.organizations.models import OrgMemberQuota
        org_members = len(ccnet_api.get_org_users_by_url_prefix(org.url_prefix,
                                                                -1, -1))
        org_members_quota = OrgMemberQuota.objects.get_quota(org_id)
        if org_members_quota is not None and org_members >= org_members_quota:
            return render_error(request, 'Above quota')

    set_org_user(org_id, username)

    return HttpResponseRedirect(settings.LOGIN_REDIRECT_URL)


def org_reactivate(request, token):

    invite = Invitation.objects.get_by_token(token=token)
    if not invite:
        return render_error(request, _('Invalid token.'))

    if invite.is_expired():
        return render_error(request, _('Expired token.'))

    org_id = invite.accepter
    org_id = int(org_id)
    org = ccnet_api.get_org_by_id(org_id)
    if not org:
        return render_error(request, f'Organization {org_id} not found')

    invite.accept()
    OrgSettings.objects.add_or_update(org, is_active=True)
    org_reactivated.send(sender=None, email=None, org=org)
    return HttpResponseRedirect(settings.SITE_ROOT)
