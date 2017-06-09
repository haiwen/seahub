# Copyright (c) 2012-2016 Seafile Ltd.
import hashlib
import re
import logging
from datetime import datetime
from django.conf import settings
# Avoid shadowing the login() view below.
from django.views.decorators.csrf import csrf_protect
from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.shortcuts import render_to_response
from django.contrib.sites.models import Site, RequestSite
from django.http import HttpResponseRedirect, Http404
from django.template import RequestContext
from django.utils.http import urlquote, base36_to_int, is_safe_url
from django.utils.translation import ugettext as _
from django.views.decorators.cache import never_cache
from seaserv import seafile_api

from seahub.auth import REDIRECT_FIELD_NAME, get_backends
from seahub.auth import login as auth_login
from seahub.auth.decorators import login_required
from seahub.auth.forms import AuthenticationForm, CaptchaAuthenticationForm
from seahub.auth.forms import PasswordResetForm, SetPasswordForm, PasswordChangeForm
from seahub.auth.tokens import default_token_generator
from seahub.base.accounts import User
from seahub.options.models import UserOptions
from seahub.profile.models import Profile
from seahub.utils import is_ldap_user
from seahub.utils.ip import get_remote_ip
from seahub.utils.file_size import get_quota_from_string
from seahub.utils.two_factor_auth import two_factor_auth_enabled, handle_two_factor_auth
from seahub.utils.user_permissions import get_user_role

from constance import config

from seahub.password_session import update_session_auth_hash

# Get an instance of a logger
logger = logging.getLogger(__name__)

LOGIN_ATTEMPT_PREFIX = 'UserLoginAttempt_'

def log_user_in(request, user, redirect_to):
    # Ensure the user-originating redirection url is safe.
    if not is_safe_url(url=redirect_to, host=request.get_host()):
        redirect_to = settings.LOGIN_REDIRECT_URL

    if request.session.test_cookie_worked():
        request.session.delete_test_cookie()

    _clear_login_failed_attempts(request, user)

    if two_factor_auth_enabled(user):
        return handle_two_factor_auth(request, user, redirect_to)

    # Okay, security checks complete. Log the user in.
    auth_login(request, user)

    return HttpResponseRedirect(redirect_to)

def _get_login_failed_attempts(username=None, ip=None):
    """Get login failed attempts base on username and ip.
    If both username and ip are provided, return the max value.

    Arguments:
    - `username`:
    - `ip`:
    """
    if username is None and ip is None:
        return 0

    username_attempts = ip_attempts = 0

    if username:
        username_attempts = cache.get(LOGIN_ATTEMPT_PREFIX + username, 0)

    if ip:
        ip_attempts = cache.get(LOGIN_ATTEMPT_PREFIX + ip, 0)

    return max(username_attempts, ip_attempts)

def _incr_login_failed_attempts(username=None, ip=None):
    """Increase login failed attempts by 1 for both username and ip.

    Arguments:
    - `username`:
    - `ip`:

    Returns new value of failed attempts.
    """
    timeout = settings.LOGIN_ATTEMPT_TIMEOUT
    username_attempts = 1
    ip_attempts = 1

    if username:
        try:
            username_attempts = cache.incr(LOGIN_ATTEMPT_PREFIX + username)
        except ValueError:
            cache.set(LOGIN_ATTEMPT_PREFIX + username, 1, timeout)

    if ip:
        try:
            ip_attempts = cache.incr(LOGIN_ATTEMPT_PREFIX + ip)
        except ValueError:
            cache.set(LOGIN_ATTEMPT_PREFIX + ip, 1, timeout)

    return max(username_attempts, ip_attempts)

def _clear_login_failed_attempts(request, user):
    """Clear login failed attempts records.

    Arguments:
    - `request`:
    """
    username = user.username
    ip = get_remote_ip(request)

    cache.delete(LOGIN_ATTEMPT_PREFIX + urlquote(username))
    cache.delete(LOGIN_ATTEMPT_PREFIX + ip)
    p = Profile.objects.get_profile_by_user(username)
    if p and p.login_id:
        cache.delete(LOGIN_ATTEMPT_PREFIX + urlquote(p.login_id))

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
          redirect_if_logged_in=None,
          redirect_field_name=REDIRECT_FIELD_NAME,
          authentication_form=AuthenticationForm):
    """Displays the login form and handles the login action."""

    if request.user.is_authenticated() and redirect_if_logged_in:
        return HttpResponseRedirect(reverse(redirect_if_logged_in))

    redirect_to = request.REQUEST.get(redirect_field_name, '')
    ip = get_remote_ip(request)


    if request.method == "POST":
        login = urlquote(request.REQUEST.get('login', '').strip())
        failed_attempt = _get_login_failed_attempts(username=login, ip=ip)
        remember_me = True if request.REQUEST.get('remember_me',
                                                  '') == 'on' else False

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
        failed_attempt = _incr_login_failed_attempts(username=login,
                                                    ip=ip)

        if failed_attempt >= config.LOGIN_ATTEMPT_LIMIT:
            if bool(config.FREEZE_USER_ON_LOGIN_FAILED) is True:
                # log user in if password is valid otherwise freeze account
                logger.warn('Login attempt limit reached, try freeze the user, email/username: %s, ip: %s, attemps: %d' %
                            (login, ip, failed_attempt))
                login = request.REQUEST.get('login', '')
                email = Profile.objects.get_username_by_login_id(login)
                if email is None:
                    email = login
                try:
                    user = User.objects.get(email)
                    if user.is_active:
                        user.freeze_user(notify_admins=True)
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
        failed_attempt = _get_login_failed_attempts(ip=ip)
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

    if Site._meta.installed:
        current_site = Site.objects.get_current()
    else:
        current_site = RequestSite(request)

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

    enable_shib_login = getattr(settings, 'ENABLE_SHIB_LOGIN', False)
    enable_krb5_login = getattr(settings, 'ENABLE_KRB5_LOGIN', False)
    enable_adfs_login = getattr(settings, 'ENABLE_ADFS_LOGIN', False)

    return render_to_response(template_name, {
        'form': form,
        redirect_field_name: redirect_to,
        'site': current_site,
        'site_name': current_site.name,
        'remember_days': config.LOGIN_REMEMBER_DAYS,
        'signup_url': signup_url,
        'enable_shib_login': enable_shib_login,
        'enable_krb5_login': enable_krb5_login,
        'enable_adfs_login': enable_adfs_login,
    }, context_instance=RequestContext(request))

def login_simple_check(request):
    """A simple check for login called by thirdpart systems(OA, etc).

    Token generation: MD5(secret_key + foo@foo.com + 2014-1-1).hexdigest()
    Token length: 32 hexadecimal digits.
    """
    username = request.REQUEST.get('user', '')
    random_key = request.REQUEST.get('token', '')

    if not username or not random_key:
        raise Http404

    today = datetime.now().strftime('%Y-%m-%d')
    expect = hashlib.md5(settings.SECRET_KEY+username+today).hexdigest()
    if expect == random_key:
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            raise Http404

        for backend in get_backends():
            user.backend = "%s.%s" % (backend.__module__, backend.__class__.__name__)

        auth_login(request, user)

        return HttpResponseRedirect(settings.SITE_ROOT)
    else:
        raise Http404


def logout(request, next_page=None,
           template_name='registration/logged_out.html',
           redirect_field_name=REDIRECT_FIELD_NAME):
    "Logs out the user and displays 'You are logged out' message."
    from seahub.auth import logout
    logout(request)

    if redirect_field_name in request.REQUEST:
        next_page = request.REQUEST[redirect_field_name]
        # Security check -- don't allow redirection to a different host.
        if not is_safe_url(url=next_page, host=request.get_host()):
            next_page = request.path

    if next_page is None:
        redirect_to = request.REQUEST.get(redirect_field_name, '')
        if redirect_to:
            return HttpResponseRedirect(redirect_to)
        else:
            return render_to_response(template_name, {
                'title': _('Logged out')
            }, context_instance=RequestContext(request))
    else:
        # Redirect to this page until the session has been cleared.
        return HttpResponseRedirect(next_page or request.path)

def logout_then_login(request, login_url=None):
    "Logs out the user if he is logged in. Then redirects to the log-in page."
    if not login_url:
        login_url = settings.LOGIN_URL
    return logout(request, login_url)

def redirect_to_login(next, login_url=None, redirect_field_name=REDIRECT_FIELD_NAME):
    "Redirects the user to the login page, passing the given 'next' page"
    if not login_url:
        login_url = settings.LOGIN_URL
    return HttpResponseRedirect('%s?%s=%s' % (login_url, urlquote(redirect_field_name), urlquote(next)))

# 4 views for password reset:
# - password_reset sends the mail
# - password_reset_done shows a success message for the above
# - password_reset_confirm checks the link the user clicked and
#   prompts for a new password
# - password_reset_complete shows a success message for the above

@csrf_protect
def password_reset(request, is_admin_site=False, template_name='registration/password_reset_form.html',
        email_template_name='registration/password_reset_email.html',
        password_reset_form=PasswordResetForm, token_generator=default_token_generator,
        post_reset_redirect=None):
    if post_reset_redirect is None:
        post_reset_redirect = reverse('auth_password_reset_done')
    if request.method == "POST":
        form = password_reset_form(request.POST)
        if form.is_valid():
            opts = {}
            opts['use_https'] = request.is_secure()
            opts['token_generator'] = token_generator
            if is_admin_site:
                opts['domain_override'] = request.META['HTTP_HOST']
            else:
                opts['email_template_name'] = email_template_name
                if not Site._meta.installed:
                    opts['domain_override'] = RequestSite(request).domain
            try:
                form.save(**opts)
            except Exception, e:
                logger.error(str(e))
                messages.error(request, _(u'Failed to send email, please contact administrator.'))
                return render_to_response(template_name, {
                        'form': form,
                        }, context_instance=RequestContext(request))
            else:
                return HttpResponseRedirect(post_reset_redirect)
    else:
        form = password_reset_form()
    return render_to_response(template_name, {
        'form': form,
    }, context_instance=RequestContext(request))

def password_reset_done(request, template_name='registration/password_reset_done.html'):
    return render_to_response(template_name, context_instance=RequestContext(request))

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

    context_instance = RequestContext(request)

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
    return render_to_response(template_name, context_instance=context_instance)

def password_reset_complete(request, template_name='registration/password_reset_complete.html'):
    return render_to_response(template_name, context_instance=RequestContext(request,
                                                                             {'login_url': settings.LOGIN_URL}))

@csrf_protect
@login_required
def password_change(request, template_name='registration/password_change_form.html',
                    post_change_redirect=None, password_change_form=PasswordChangeForm):
    if post_change_redirect is None:
        post_change_redirect = reverse('auth_password_change_done')

    if is_ldap_user(request.user):
        messages.error(request, _("Can not update password, please contact LDAP admin."))

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

    return render_to_response(template_name, {
        'form': form,
        'min_len': config.USER_PASSWORD_MIN_LENGTH,
        'strong_pwd_required': config.USER_STRONG_PASSWORD_REQUIRED,
        'level': config.USER_PASSWORD_STRENGTH_LEVEL,
        'force_passwd_change': request.session.get('force_passwd_change', False),
    }, context_instance=RequestContext(request))

def password_change_done(request, template_name='registration/password_change_done.html'):
    return render_to_response(template_name, context_instance=RequestContext(request))
