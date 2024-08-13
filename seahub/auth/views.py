# Copyright (c) 2012-2016 Seafile Ltd.
import hashlib
import logging
import jwt
from datetime import datetime
from django.conf import settings
# Avoid shadowing the login() view below.
from django.views.decorators.csrf import csrf_protect
from django.urls import reverse
from django.contrib import messages
from django.shortcuts import render
from django.contrib.sites.shortcuts import get_current_site
from django.http import HttpResponseRedirect, Http404

from urllib.parse import quote
from django.utils.http import base36_to_int, url_has_allowed_host_and_scheme
from django.utils.translation import gettext as _
from django.views.decorators.cache import never_cache
from saml2.ident import decode
from seaserv import seafile_api, ccnet_api
from seahub.settings import SSO_SECRET_KEY
from seahub.auth import REDIRECT_FIELD_NAME, get_backends
from seahub.auth import login as auth_login
from seahub.auth.models import SocialAuthUser
from seahub.auth.decorators import login_required
from seahub.auth.forms import AuthenticationForm, CaptchaAuthenticationForm, \
        PasswordResetForm, SetPasswordForm, PasswordChangeForm, \
        SetContactEmailPasswordForm
from seahub.auth.signals import user_logged_in_failed
from seahub.auth.tokens import default_token_generator
from seahub.auth.utils import (
    get_login_failed_attempts, incr_login_failed_attempts,
    clear_login_failed_attempts)
from seahub.base.accounts import User, UNUSABLE_PASSWORD
from seahub.options.models import UserOptions
from seahub.profile.models import Profile
from seahub.two_factor.views.login import is_device_remembered
from seahub.utils import render_error, get_site_name, is_valid_email, get_service_url
from seahub.utils.http import rate_limit
from seahub.utils.ip import get_remote_ip
from seahub.utils.file_size import get_quota_from_string
from seahub.utils.two_factor_auth import two_factor_auth_enabled, handle_two_factor_auth
from seahub.utils.user_permissions import get_user_role
from seahub.utils.auth import get_login_bg_image_path
from seahub.organizations.models import OrgSAMLConfig
from seahub.sysadmin_extra.models import UserLoginLog

from constance import config

from seahub.password_session import update_session_auth_hash

from seahub.onlyoffice.settings import ONLYOFFICE_DESKTOP_EDITOR_HTTP_USER_AGENT

from seahub.utils import send_html_email
from django.utils.translation import gettext_lazy as _
from seahub.base.templatetags.seahub_tags import email2contact_email

# Get an instance of a logger
logger = logging.getLogger(__name__)


def log_user_in(request, user, redirect_to):
    # Ensure the user-originating redirection url is safe.
    if not url_has_allowed_host_and_scheme(url=redirect_to, allowed_hosts=request.get_host()):
        redirect_to = settings.LOGIN_REDIRECT_URL

    if request.session.test_cookie_worked():
        request.session.delete_test_cookie()

    clear_login_failed_attempts(request, user.username)

    if two_factor_auth_enabled(user):
        if is_device_remembered(request.COOKIES.get('S2FA', ''), user):
            from seahub.two_factor.models import default_device
            user.otp_device = default_device(user)
        else:
            return handle_two_factor_auth(request, user, redirect_to)

    # Okay, security checks complete. Log the user in.
    auth_login(request, user)
    # if UserLoginLog.objects.filter(username=user.username).count() == 1:
    #     email_template_name = 'registration/password_change_email.html'
    #     send_to = email2contact_email(request.user.username)
    #     site_name = get_site_name()
    #     c = {
    #         'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    #     }
    #     send_html_email(_("Successfully Changed Password on %s") % site_name,
    #                     email_template_name, c, None,
    #                     [send_to])
    return HttpResponseRedirect(redirect_to)

def _handle_login_form_valid(request, user, redirect_to, remember_me):
    if UserOptions.objects.passwd_change_required(
            user.username):
        redirect_to = reverse('auth_password_change')
        request.session['force_passwd_change'] = True

    if user.permissions.role_quota():
        user_role = get_user_role(user)
        quota = get_quota_from_string(user.permissions.role_quota())
        seafile_api.set_role_quota(user_role, quota)

    # password is valid, log user in
    request.session['remember_me'] = remember_me
    return log_user_in(request, user, redirect_to)

@csrf_protect
@never_cache
def login(request, template_name='registration/login.html',
          redirect_if_logged_in='libraries',
          redirect_field_name=REDIRECT_FIELD_NAME,
          authentication_form=AuthenticationForm):
    """Displays the login form and handles the login action."""
    redirect_to = request.GET.get(redirect_field_name, '')
    if request.user.is_authenticated:
        if redirect_to and url_has_allowed_host_and_scheme(redirect_to, allowed_hosts=request.get_host()):
            return HttpResponseRedirect(redirect_to)
        else:
            return HttpResponseRedirect(reverse(redirect_if_logged_in))

    ip = get_remote_ip(request)
    if request.method == "POST":
        login = request.POST.get('login', '').strip()
        failed_attempt = get_login_failed_attempts(username=login, ip=ip)
        remember_me = True if request.POST.get('remember_me',
                                               '') == 'on' else False
        redirect_to = request.POST.get(redirect_field_name, '') or redirect_to
        # check the form
        used_captcha_already = False
        if bool(config.FREEZE_USER_ON_LOGIN_FAILED) is True:
            form = authentication_form(data=request.POST)
        else:
            if failed_attempt >= config.LOGIN_ATTEMPT_LIMIT:
                form = CaptchaAuthenticationForm(data=request.POST)
                used_captcha_already = True
            else:
                form = authentication_form(data=request.POST)
        if form.is_valid():
            return _handle_login_form_valid(request, form.get_user(),
                                            redirect_to, remember_me)

        # form is invalid
        form.db_record and user_logged_in_failed.send(sender=None, request=request)
        
        failed_attempt = incr_login_failed_attempts(username=login,
                                                    ip=ip)

        if failed_attempt >= config.LOGIN_ATTEMPT_LIMIT:
            if bool(config.FREEZE_USER_ON_LOGIN_FAILED) is True:
                # log user in if password is valid otherwise freeze account
                logger.warn('Login attempt limit reached, try freeze the user, email/username: %s, ip: %s, attemps: %d' %
                            (login, ip, failed_attempt))
                email = Profile.objects.get_username_by_login_id(login)
                if email is None:
                    email = Profile.objects.get_username_by_contact_email(login)
                    if email is None:
                        email = login
                try:
                    user = User.objects.get(email)
                    if user.is_active:
                        user.freeze_user(notify_admins=True, notify_org_admins=True)
                        logger.warn('Login attempt limit reached, freeze the user email/username: %s, ip: %s, attemps: %d' %
                                    (login, ip, failed_attempt))
                except User.DoesNotExist:
                    logger.warn('Login attempt limit reached with invalid email/username: %s, ip: %s, attemps: %d' %
                                (login, ip, failed_attempt))
                    pass
                form.errors['freeze_account'] = _('This account has been frozen due to too many failed login attempts.')
            else:
                # use a new form with Captcha
                logger.warn('Login attempt limit reached, show Captcha, email/username: %s, ip: %s, attemps: %d' %
                            (login, ip, failed_attempt))
                if not used_captcha_already:
                    form = CaptchaAuthenticationForm()

    else:
        ### GET
        failed_attempt = get_login_failed_attempts(ip=ip)
        if failed_attempt >= config.LOGIN_ATTEMPT_LIMIT:
            if bool(config.FREEZE_USER_ON_LOGIN_FAILED) is True:
                form = authentication_form()
            else:
                logger.warn('Login attempt limit reached, show Captcha, ip: %s, attempts: %d' %
                            (ip, failed_attempt))
                form = CaptchaAuthenticationForm()
        else:
            form = authentication_form()

    request.session.set_test_cookie()
    current_site = get_current_site(request)

    multi_tenancy = getattr(settings, 'MULTI_TENANCY', False)

    if config.ENABLE_SIGNUP:
        if multi_tenancy:
            org_account_only = getattr(settings, 'FORCE_ORG_REGISTER', False)
            if org_account_only:
                signup_url = reverse('org_register')
            else:
                signup_url = reverse('choose_register')
        else:
            signup_url = reverse('registration_register')
    else:
        signup_url = ''

    enable_sso = getattr(settings, 'ENABLE_SHIB_LOGIN', False) or \
                 getattr(settings, 'ENABLE_KRB5_LOGIN', False) or \
                 getattr(settings, 'ENABLE_ADFS_LOGIN', False) or \
                 getattr(settings, 'ENABLE_OAUTH', False) or \
                 getattr(settings, 'ENABLE_CUSTOM_OAUTH', False) or \
                 getattr(settings, 'ENABLE_CAS', False) or \
                 getattr(settings, 'ENABLE_REMOTE_USER_AUTHENTICATION', False)

    login_bg_image_path = get_login_bg_image_path()

    return render(request, template_name, {
        'form': form,
        redirect_field_name: redirect_to,
        'site': current_site,
        'site_name': get_site_name(),
        'remember_days': config.LOGIN_REMEMBER_DAYS,
        'signup_url': signup_url,
        'enable_sso': enable_sso,
        'enable_multi_adfs': getattr(settings, 'ENABLE_MULTI_ADFS', False),
        'login_bg_image_path': login_bg_image_path,
        'enable_change_password': settings.ENABLE_CHANGE_PASSWORD,
    })

def login_simple_check(request):

    if not SSO_SECRET_KEY:
        return render_error(request, 'Permission denied.')
    
    login_token = request.GET.get('token', '')
    if not login_token:
        return render_error(request, 'token invalid.')

    try:
        payload = jwt.decode(login_token, SSO_SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return render_error(request, 'token expired.')
    except jwt.PyJWTError:
        return render_error(request, 'token invalid.')

    if 'exp' not in payload:
        return render_error(request, 'token invalid.')
    
    user_id = payload.get('user_id')
    if not user_id:
        return render_error(request, 'token invalid.')
    
    try:
        user = User.objects.get(email=user_id)
    except User.DoesNotExist:
        return render_error(request, 'token invalid.')
    
    for backend in get_backends():
        user.backend = "%s.%s" % (backend.__module__, backend.__class__.__name__)
    auth_login(request, user)
    if REDIRECT_FIELD_NAME in request.GET:
        next_page = request.GET[REDIRECT_FIELD_NAME]
        if not url_has_allowed_host_and_scheme(url=next_page, allowed_hosts=request.get_host()):
            next_page = settings.LOGIN_REDIRECT_URL
    else:
        next_page = settings.SITE_ROOT
    return HttpResponseRedirect(next_page)

def logout(request, next_page=None,
           template_name='registration/logged_out.html',
           redirect_field_name=REDIRECT_FIELD_NAME):
    "Logs out the user and displays 'You are logged out' message."

    if getattr(settings, 'ENABLE_ADFS_LOGIN', False) or getattr(settings, 'ENABLE_MULTI_ADFS', False):
        try:
            saml_subject_id = decode(request.saml_session["_saml2_subject_id"])
            if saml_subject_id:
                from seahub.utils import is_org_context
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    response = HttpResponseRedirect(get_service_url().rstrip('/') + '/org/custom/%s/saml2/logout/' % str(org_id))
                else:
                    response = HttpResponseRedirect(get_service_url().rstrip('/') + '/saml2/logout/')
                response.delete_cookie('seahub_auth')
                return response
        except Exception as e:
            logger.warning(e)

    from seahub.auth import logout
    logout(request)

    # Local logout for shibboleth user.
    shib_logout_url = getattr(settings, 'SHIBBOLETH_LOGOUT_URL', '')
    if getattr(settings, 'ENABLE_SHIB_LOGIN', False) and shib_logout_url:
        shib_logout_return = getattr(settings, 'SHIBBOLETH_LOGOUT_RETURN', '')
        if shib_logout_return:
            shib_logout_url += shib_logout_return
        response = HttpResponseRedirect(shib_logout_url)
        response.delete_cookie('seahub_auth')
        return response

    # Local logout for cas user.
    if getattr(settings, 'ENABLE_CAS', False):
        response = HttpResponseRedirect(reverse('cas_ng_logout'))
        response.delete_cookie('seahub_auth')
        return response

    # Local logout for ouath user.
    via_oauth = request.COOKIES.get('via_oauth', '')
    oauth_logout_url = getattr(settings, 'OAUTH_LOGOUT_URL', '')
    if (getattr(settings, 'ENABLE_OAUTH', False) or getattr(settings, 'ENABLE_CUSTOM_OAUTH', False)) and via_oauth and oauth_logout_url:
        response = HttpResponseRedirect(oauth_logout_url)
        response.delete_cookie('via_oauth')
        response.delete_cookie('seahub_auth')
        return response

    from seahub.settings import LOGOUT_REDIRECT_URL
    if LOGOUT_REDIRECT_URL:
        response = HttpResponseRedirect(LOGOUT_REDIRECT_URL)
        response.delete_cookie('seahub_auth')
        return response

    if redirect_field_name in request.GET:
        next_page = request.GET[redirect_field_name]
        # Security check -- don't allow redirection to a different host.
        if not url_has_allowed_host_and_scheme(url=next_page, allowed_hosts=request.get_host()):
            next_page = request.path

    if next_page is None:
        redirect_to = request.GET.get(redirect_field_name, '')
        if redirect_to:
            response = HttpResponseRedirect(redirect_to)
        else:
            response = render(request, template_name, {
                'title': _('Logged out'),
                'request_from_onlyoffice_desktop_editor': ONLYOFFICE_DESKTOP_EDITOR_HTTP_USER_AGENT in request.headers.get('user-agent', ''),
            })
    else:
        # Redirect to this page until the session has been cleared.
        response = HttpResponseRedirect(next_page or request.path)

    response.delete_cookie('seahub_auth')
    return response

def logout_then_login(request, login_url=None):
    "Logs out the user if he is logged in. Then redirects to the log-in page."
    if not login_url:
        login_url = settings.LOGIN_URL
    return logout(request, login_url)

def redirect_to_login(next, login_url=None, redirect_field_name=REDIRECT_FIELD_NAME):
    "Redirects the user to the login page, passing the given 'next' page"
    if not login_url:
        login_url = settings.LOGIN_URL
    return HttpResponseRedirect('%s?%s=%s' % (login_url, quote(redirect_field_name), quote(next)))

# 4 views for password reset:
# - password_reset sends the mail
# - password_reset_done shows a success message for the above
# - password_reset_confirm checks the link the user clicked and
#   prompts for a new password
# - password_reset_complete shows a success message for the above


@csrf_protect
@rate_limit()
def password_reset(request, is_admin_site=False,
                   template_name='registration/password_reset_form.html',
                   email_template_name='registration/password_reset_email.html',
                   password_reset_form=PasswordResetForm,
                   token_generator=default_token_generator,
                   post_reset_redirect=None):

    has_bind_social_auth = False
    if SocialAuthUser.objects.filter(username=request.user.username).exists():
        has_bind_social_auth = True

    can_reset_password = True
    if has_bind_social_auth and (not settings.ENABLE_SSO_USER_CHANGE_PASSWORD):
        can_reset_password = False

    if not can_reset_password:
        return render_error(request, _('Unable to reset password.'))

    if post_reset_redirect is None:
        post_reset_redirect = reverse('auth_password_reset_done')

    login_bg_image_path = get_login_bg_image_path()
    if request.method == "POST":
        form = password_reset_form(request.POST)
        if form.is_valid():
            opts = {}
            opts['use_https'] = request.is_secure()
            opts['token_generator'] = token_generator
            if is_admin_site:
                opts['domain_override'] = request.headers['host']
            else:
                opts['email_template_name'] = email_template_name
                opts['domain_override'] = get_current_site(request).domain
            try:
                form.save(**opts)
            except Exception as e:
                logger.error(str(e))
                messages.error(request, _('Failed to send email, please contact administrator.'))
                return render(request, template_name, {
                        'form': form,
                        'login_bg_image_path': login_bg_image_path,
                        })
            else:
                return HttpResponseRedirect(post_reset_redirect)
    else:
        form = password_reset_form()
    return render(request, template_name, {
        'form': form,
        'login_bg_image_path': login_bg_image_path,
    })

def password_reset_done(request, template_name='registration/password_reset_done.html'):
    login_bg_image_path = get_login_bg_image_path()
    return render(request, template_name, {
        'login_bg_image_path': login_bg_image_path,
    })

# Doesn't need csrf_protect since no-one can guess the URL
def password_reset_confirm(request, uidb36=None, token=None, template_name='registration/password_reset_confirm.html',
                           token_generator=default_token_generator, set_password_form=SetPasswordForm,
                           post_reset_redirect=None):
    """
    View that checks the hash in a password reset link and presents a
    form for entering a new password.
    """
    assert uidb36 is not None and token is not None # checked by URLconf
    if post_reset_redirect is None:
        post_reset_redirect = reverse('auth_password_reset_complete')
    try:
        uid_int = base36_to_int(uidb36)
        user = User.objects.get(id=uid_int)
    except (ValueError, User.DoesNotExist):
        user = None

    context_instance = {}
    if token_generator.check_token(user, token):
        context_instance['validlink'] = True
        if request.method == 'POST':
            form = set_password_form(user, request.POST)
            if form.is_valid():
                form.save()
                return HttpResponseRedirect(post_reset_redirect)
        else:
            form = set_password_form(None)
    else:
        context_instance['validlink'] = False
        form = None
    context_instance['form'] = form

    context_instance['strong_pwd_required'] = config.USER_STRONG_PASSWORD_REQUIRED
    return render(request, template_name, context_instance)

def password_reset_complete(request, template_name='registration/password_reset_complete.html'):
    return render(request, template_name, {'login_url': settings.LOGIN_URL})

@csrf_protect
@login_required
def password_change(request, template_name='registration/password_change_form.html',
                    post_change_redirect=None, password_change_form=PasswordChangeForm):
    if post_change_redirect is None:
        post_change_redirect = reverse('auth_password_change_done')

    has_bind_social_auth = False
    if SocialAuthUser.objects.filter(username=request.user.username).exists():
        has_bind_social_auth = True

    can_change_password = True
    if has_bind_social_auth and (not settings.ENABLE_SSO_USER_CHANGE_PASSWORD):
        can_change_password = False

    if not can_change_password:
        return render_error(request, _('Unable to change password.'))

    if settings.ENABLE_USER_SET_CONTACT_EMAIL:
        user_profile = Profile.objects.get_profile_by_user(request.user.username)
        if user_profile is None or not user_profile.contact_email:
            # set contact email and password
            password_change_form = SetContactEmailPasswordForm
            template_name = 'registration/password_set_form.html'

    if request.user.enc_password == UNUSABLE_PASSWORD:
        # set password only
        password_change_form = SetPasswordForm
        template_name = 'registration/password_set_form.html'

    if request.method == "POST":
        form = password_change_form(user=request.user, data=request.POST)
        if form.is_valid():
            form.save()

            if request.session.get('force_passwd_change', False):
                del request.session['force_passwd_change']
                UserOptions.objects.unset_force_passwd_change(
                    request.user.username)

            update_session_auth_hash(request, request.user)
            return HttpResponseRedirect(post_change_redirect)
    else:
        form = password_change_form(user=request.user)

    return render(request, template_name, {
        'form': form,
        'strong_pwd_required': config.USER_STRONG_PASSWORD_REQUIRED,
        'force_passwd_change': request.session.get('force_passwd_change', False),
    })

def password_change_done(request, template_name='registration/password_change_done.html'):
    return render(request, template_name)


def multi_adfs_sso(request):
    if not getattr(settings, 'ENABLE_MULTI_ADFS', False):
        return HttpResponseRedirect(settings.LOGIN_URL)

    template_name = 'registration/multi_adfs_sso.html'
    render_data = {'login_bg_image_path': get_login_bg_image_path()}

    if request.method == "POST":
        request.session['is_sso_user'] = True
        login_email = request.POST.get('login', '')
        if not is_valid_email(login_email):
            render_data['error_msg'] = 'Email invalid.'
            return render(request, template_name, render_data)

        domain = login_email.split('@')[-1]
        if not domain:
            render_data['error_msg'] = 'Email invalid.'
            return render(request, template_name, render_data)

        try:
            org_saml_config = OrgSAMLConfig.objects.get_config_by_domain(domain)
            if not org_saml_config:
                render_data['error_msg'] = "Cannot find an ADFS/SAML config for the team related to domain %s." % domain
                return render(request, template_name, render_data)
            if not org_saml_config.domain_verified:
                render_data['error_msg'] = \
                  "The ownership of domain %s has not been verified. Please ask your team admin to verify it." % domain
                return render(request, template_name, render_data)
            org_id = org_saml_config.org_id
            org = ccnet_api.get_org_by_id(org_id)
            if not org:
                render_data['error_msg'] = "Cannot find an ADFS/SAML config for the team related to domain %s." % domain
                return render(request, template_name, render_data)
        except Exception as e:
            logger.error(e)
            render_data['error_msg'] = 'Error, please contact administrator.'
            return render(request, template_name, render_data)

        return HttpResponseRedirect(get_service_url().rstrip('/') + '/org/custom/%s/saml2/login/' % str(org_id))

    if request.method == "GET":
        return render(request, template_name, render_data)
